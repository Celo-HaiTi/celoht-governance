import type { GovernanceMember, Proposal } from '../domain/types.js';
import { assertTransition } from '../domain/stateMachine.js';
import { Errors } from '../errors/GovernanceError.js';
import { requireCapability, assertNotSelfActing } from '../security/rbac.js';
import type { CreateProposalInput } from '../schemas/proposal.schema.js';
import type { Clock, IdGenerator, MemberRepository, ProposalRepository } from './ports.js';
import type { AuditService } from './auditService.js';

const DEFAULT_QUORUM_BPS = 2000; // 20% — overridable per-proposal, never silently
const DEFAULT_APPROVAL_THRESHOLD_BPS = 5000; // 50%
const DEFAULT_EXECUTION_DELAY_SECONDS = 172800; // 48h timelock default

export interface GovernanceVersionProvider {
  currentVersion(): string;
}

export class ProposalService {
  constructor(
    private readonly proposals: ProposalRepository,
    private readonly members: MemberRepository,
    private readonly audit: AuditService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly governanceVersion: GovernanceVersionProvider,
  ) {}

  private async requireActiveMember(memberId: string): Promise<GovernanceMember> {
    const member = await this.members.getById(memberId);
    if (!member) throw Errors.memberNotFound(memberId);
    return member;
  }

  async createProposal(input: CreateProposalInput, correlationId: string): Promise<Proposal> {
    const proposer = await this.requireActiveMember(input.proposerId);
    requireCapability(proposer, 'PROPOSAL_CREATE');

    const now = this.clock.now().toISOString();
    const proposal: Proposal = {
      id: this.ids.next(),
      title: input.title,
      description: input.description,
      proposerId: input.proposerId,
      proposalType: input.proposalType,
      status: 'DRAFT',
      governanceVersion: this.governanceVersion.currentVersion(),
      createdAt: now,
      submittedAt: null,
      votingStartsAt: null,
      votingEndsAt: null,
      quorumBps: input.quorumBps ?? DEFAULT_QUORUM_BPS,
      approvalThresholdBps: input.approvalThresholdBps ?? DEFAULT_APPROVAL_THRESHOLD_BPS,
      executionDelaySeconds: input.executionDelaySeconds ?? DEFAULT_EXECUTION_DELAY_SECONDS,
      executionStatus: 'NOT_EXECUTED',
      queuedAt: null,
      executableAt: null,
      executedAt: null,
      cancellationReason: null,
      rejectionReason: null,
      metadata: input.metadata,
      updatedAt: now,
    };

    const created = await this.proposals.create(proposal);
    await this.audit.record({
      actorId: proposer.id,
      eventType: 'PROPOSAL_CREATED',
      targetEntity: 'proposal',
      targetId: created.id,
      correlationId,
      resultingState: created.status,
      metadata: { proposalType: created.proposalType },
    });
    return created;
  }

  private async getOrThrow(proposalId: string): Promise<Proposal> {
    const proposal = await this.proposals.getById(proposalId);
    if (!proposal) throw Errors.proposalNotFound(proposalId);
    return proposal;
  }

  private async transition(
    proposal: Proposal,
    to: Proposal['status'],
    patch: Partial<Proposal> = {},
  ): Promise<Proposal> {
    assertTransition(proposal.status, to);
    const updated: Proposal = {
      ...proposal,
      ...patch,
      status: to,
      updatedAt: this.clock.now().toISOString(),
    };
    return this.proposals.update(updated);
  }

  async submitProposal(proposalId: string, actorId: string, correlationId: string): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    if (actor.id !== proposal.proposerId) {
      throw Errors.forbidden('Only the proposer may submit their own draft');
    }
    const updated = await this.transition(proposal, 'SUBMITTED', {
      submittedAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_SUBMITTED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
    });
    return updated;
  }

  async beginReview(proposalId: string, actorId: string, correlationId: string): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    requireCapability(actor, 'PROPOSAL_REVIEW');
    assertNotSelfActing(actorId, proposal.proposerId);
    const updated = await this.transition(proposal, 'UNDER_REVIEW');
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_UNDER_REVIEW',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
    });
    return updated;
  }

  async activateForVoting(
    proposalId: string,
    actorId: string,
    votingPeriodSeconds: number,
    correlationId: string,
  ): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    requireCapability(actor, 'PROPOSAL_REVIEW');
    assertNotSelfActing(actorId, proposal.proposerId);

    const activated = await this.transition(proposal, 'ACTIVE');
    const now = this.clock.now();
    const votingStart = now.toISOString();
    const votingEnd = new Date(now.getTime() + votingPeriodSeconds * 1000).toISOString();

    const voting = await this.transition(activated, 'VOTING', {
      votingStartsAt: votingStart,
      votingEndsAt: votingEnd,
    });

    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_VOTING_OPENED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: voting.status,
      metadata: { votingStart, votingEnd },
    });
    return voting;
  }

  async rejectProposal(
    proposalId: string,
    actorId: string,
    reason: string,
    correlationId: string,
  ): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    requireCapability(actor, 'PROPOSAL_REJECT');
    assertNotSelfActing(actorId, proposal.proposerId);

    const updated = await this.transition(proposal, 'REJECTED', { rejectionReason: reason });
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_REJECTED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
      metadata: { reason },
    });
    return updated;
  }

  async cancelProposal(
    proposalId: string,
    actorId: string,
    reason: string,
    correlationId: string,
  ): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);

    const isOwner = actor.id === proposal.proposerId;
    if (isOwner) {
      requireCapability(actor, 'PROPOSAL_CANCEL_OWN');
    } else {
      requireCapability(actor, 'PROPOSAL_CANCEL_ANY');
    }

    const updated = await this.transition(proposal, 'CANCELLED', { cancellationReason: reason });
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_CANCELLED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
      metadata: { reason },
    });
    return updated;
  }

  /** Marks a proposal EXPIRED. May be actor-initiated or system-initiated (actorId null) by a scheduled job — never silent. */
  async expireProposal(proposalId: string, actorId: string | null, correlationId: string): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const updated = await this.transition(proposal, 'EXPIRED');
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_EXPIRED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
    });
    return updated;
  }

  async approveProposal(proposalId: string, actorId: string, correlationId: string): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    requireCapability(actor, 'PROPOSAL_APPROVE');
    assertNotSelfActing(actorId, proposal.proposerId);

    if (proposal.status !== 'QUORUM_REACHED') {
      // Defense in depth beyond assertTransition: an explicit domain
      // invariant, not just a state-machine edge check.
      throw Errors.quorumNotReached(proposalId);
    }

    const updated = await this.transition(proposal, 'APPROVED');
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_APPROVED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
    });
    return updated;
  }

  /** Queues an approved proposal, computing the timelock-gated executable time. */
  async queueProposal(proposalId: string, actorId: string, correlationId: string): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    requireCapability(actor, 'PROPOSAL_QUEUE');
    assertNotSelfActing(actorId, proposal.proposerId);

    const now = this.clock.now();
    const executableAt = new Date(now.getTime() + proposal.executionDelaySeconds * 1000).toISOString();
    const updated = await this.transition(proposal, 'QUEUED', {
      queuedAt: now.toISOString(),
      executableAt,
      executionStatus: 'QUEUED',
    });
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_QUEUED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
      metadata: { executableAt },
    });
    return updated;
  }

  /**
   * Marks a queued, timelock-elapsed, on-chain-verified proposal as
   * executed. This service NEVER performs the on-chain/treasury
   * action itself — see TREASURY_GOVERNANCE.md. It only records the
   * result of an execution that a TREASURY_AUTHORIZER already
   * performed via the multisig/authorized executor, and only after
   * verifying the supplied transaction hash is well-formed. Real
   * chain verification (confirmations, correct contract, correct
   * calldata) is the responsibility of the infrastructure layer
   * (src/infrastructure) calling this, per Section 31: failed
   * blockchain verification must never be converted into a fake
   * success here.
   */
  async recordExecution(
    proposalId: string,
    actorId: string,
    executionTxHash: string,
    correlationId: string,
  ): Promise<Proposal> {
    const proposal = await this.getOrThrow(proposalId);
    const actor = await this.requireActiveMember(actorId);
    requireCapability(actor, 'PROPOSAL_EXECUTE');
    assertNotSelfActing(actorId, proposal.proposerId);

    if (proposal.executionStatus === 'EXECUTED') {
      throw Errors.alreadyExecuted(proposalId);
    }
    if (proposal.status !== 'QUEUED') {
      throw Errors.executionNotQueued(proposalId);
    }
    if (!proposal.executableAt || this.clock.now() < new Date(proposal.executableAt)) {
      throw Errors.timelockNotElapsed(proposalId, proposal.executableAt ?? 'unknown');
    }

    const updated = await this.transition(proposal, 'EXECUTED', {
      executedAt: this.clock.now().toISOString(),
      executionStatus: 'EXECUTED',
    });
    await this.audit.record({
      actorId,
      eventType: 'PROPOSAL_EXECUTED',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      resultingState: updated.status,
      metadata: { executionTxHash },
    });
    return updated;
  }
}
