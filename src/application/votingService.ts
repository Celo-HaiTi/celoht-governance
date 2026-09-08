import type { GovernanceMember, Proposal, Vote } from '../domain/types.js';
import type { CastVoteInput } from '../schemas/proposal.schema.js';
import { Errors } from '../errors/GovernanceError.js';
import { hasCapability } from '../security/rbac.js';
import type {
  Clock,
  IdGenerator,
  MemberRepository,
  ProposalRepository,
  QuorumRepository,
  VoteRepository,
} from './ports.js';
import type { AuditService } from './auditService.js';
import type { SignatureVerifier } from '../security/signature.js';

/**
 * One-member-one-vote is the explicit model (Section 7 /
 * NO_TOKEN_POLICY.md): votingPower is always 1 for an eligible active
 * member. This is not "temporarily 1" pending token launch — it is
 * the governance design. Changing it requires a GOVERNANCE_CHANGE
 * proposal and a version bump, not a code change slipped into an
 * unrelated PR.
 */
const VOTING_POWER_PER_MEMBER = 1;

export class VotingService {
  constructor(
    private readonly proposals: ProposalRepository,
    private readonly votes: VoteRepository,
    private readonly members: MemberRepository,
    private readonly quorumRepo: QuorumRepository,
    private readonly audit: AuditService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly signatures: SignatureVerifier,
  ) {}

  private async requireActiveMember(memberId: string): Promise<GovernanceMember> {
    const member = await this.members.getById(memberId);
    if (!member) throw Errors.memberNotFound(memberId);
    return member;
  }

  private assertVotingOpen(proposal: Proposal): void {
    if (proposal.status !== 'VOTING') throw Errors.votingNotOpen(proposal.id);
    const now = this.clock.now();
    if (proposal.votingEndsAt && now > new Date(proposal.votingEndsAt)) {
      throw Errors.votingClosed(proposal.id);
    }
  }

  async castVote(input: CastVoteInput, correlationId: string): Promise<Vote> {
    const proposal = await this.proposals.getById(input.proposalId);
    if (!proposal) throw Errors.proposalNotFound(input.proposalId);
    this.assertVotingOpen(proposal);

    const member = await this.requireActiveMember(input.memberId);
    if (!hasCapability(member, 'VOTE_CAST')) {
      throw Errors.forbidden('Member is not eligible to vote');
    }

    // Duplicate-vote prevention: one vote per member per proposal.
    const existing = await this.votes.findByProposalAndMember(input.proposalId, input.memberId);
    if (existing && !existing.invalidated) {
      throw Errors.duplicateVote(input.memberId, input.proposalId);
    }

    // If wallet-based signed voting is used, verify the signature —
    // a wallet address alone is never proof of authorization
    // (Section 16). This also enforces replay/nonce/chainId/domain
    // checks inside the verifier.
    if (input.signature) {
      await this.signatures.verify({
        expectedSigner: input.memberId,
        message: input.signature.message,
        signature: input.signature.signature,
        nonce: input.signature.nonce,
        chainId: input.signature.chainId,
        domain: input.signature.domain,
      });
    }

    const vote: Vote = {
      id: this.ids.next(),
      proposalId: input.proposalId,
      memberId: input.memberId,
      choice: input.choice,
      votingPower: VOTING_POWER_PER_MEMBER,
      castAt: this.clock.now().toISOString(),
      invalidated: false,
      invalidatedReason: null,
    };
    const created = await this.votes.create(vote);

    await this.audit.record({
      actorId: input.memberId,
      eventType: 'VOTE_CAST',
      targetEntity: 'proposal',
      targetId: input.proposalId,
      correlationId,
      metadata: { choice: input.choice, voteId: created.id },
    });

    return created;
  }

  async invalidateVote(voteId: string, actorId: string, reason: string, correlationId: string): Promise<void> {
    const actor = await this.requireActiveMember(actorId);
    if (!hasCapability(actor, 'VOTE_INVALIDATE')) {
      throw Errors.forbidden('Not permitted to invalidate votes');
    }
    await this.votes.invalidate(voteId, reason);
    await this.audit.record({
      actorId,
      eventType: 'VOTE_INVALIDATED',
      targetEntity: 'vote',
      targetId: voteId,
      correlationId,
      metadata: { reason },
    });
  }

  /**
   * Computes quorum + threshold outcome for a proposal at the current
   * moment and persists an immutable snapshot (Section 13:
   * governance_quorum_snapshots). Deterministic and re-runnable: the
   * same vote set always produces the same snapshot values.
   */
  async computeQuorum(proposalId: string, correlationId: string): Promise<{
    quorumReached: boolean;
    thresholdMet: boolean;
    eligibleMemberCount: number;
    quorumRequired: number;
  }> {
    const proposal = await this.proposals.getById(proposalId);
    if (!proposal) throw Errors.proposalNotFound(proposalId);

    const allVotes = await this.votes.listByProposal(proposalId);
    const validVotes = allVotes.filter((v) => !v.invalidated);

    const votesForCount = validVotes.filter((v) => v.choice === 'FOR').length;
    const votesAgainstCount = validVotes.filter((v) => v.choice === 'AGAINST').length;
    const votesAbstainCount = validVotes.filter((v) => v.choice === 'ABSTAIN').length;

    const eligibleMemberCount = await this.members.countEligible();
    const quorumRequired = Math.ceil((eligibleMemberCount * proposal.quorumBps) / 10000);
    const totalCast = votesForCount + votesAgainstCount + votesAbstainCount;
    const quorumReached = totalCast >= quorumRequired;

    const decisiveVotes = votesForCount + votesAgainstCount; // abstain excluded from threshold calc
    const thresholdMet =
      decisiveVotes > 0 && (votesForCount * 10000) / decisiveVotes >= proposal.approvalThresholdBps;

    await this.quorumRepo.saveSnapshot({
      proposalId,
      governanceVersion: proposal.governanceVersion,
      eligibleMemberCount,
      quorumRequired,
      votesForCount,
      votesAgainstCount,
      votesAbstainCount,
      takenAt: this.clock.now().toISOString(),
    });

    await this.audit.record({
      actorId: null,
      eventType: 'QUORUM_SNAPSHOT_TAKEN',
      targetEntity: 'proposal',
      targetId: proposalId,
      correlationId,
      metadata: { quorumReached, thresholdMet, quorumRequired, totalCast },
    });

    return { quorumReached, thresholdMet, eligibleMemberCount, quorumRequired };
  }
}
