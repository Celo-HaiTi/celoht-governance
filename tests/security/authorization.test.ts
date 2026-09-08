import { beforeEach, describe, expect, it } from 'vitest';
import { ProposalService } from '../../src/application/proposalService.js';
import { AuditService } from '../../src/application/auditService.js';
import {
  FakeClock, FakeIdGenerator, InMemoryAuditRepository,
  InMemoryMemberRepository, InMemoryProposalRepository, makeMember,
} from '../fakes.js';
import type { ExecutionVerifier } from '../../src/application/ports.js';

describe('Security invariants: authorization, self-approval, unauthorized execution', () => {
  let proposals: InMemoryProposalRepository;
  let members: InMemoryMemberRepository;
  let service: ProposalService;
  let clock: FakeClock;

  beforeEach((): void => {
    proposals = new InMemoryProposalRepository();
    members = new InMemoryMemberRepository();
    clock = new FakeClock(new Date('2026-01-01T00:00:00Z'));
    const audit = new AuditService(new InMemoryAuditRepository(), clock, new FakeIdGenerator());
    service = new ProposalService(
      proposals, members, audit, clock, new FakeIdGenerator(),
      { currentVersion: (): string => '1.0.0' },
      { verify: async (): Promise<void> => undefined } satisfies ExecutionVerifier,
    );
    members.seed(makeMember({ id: 'proposer-1', roles: ['PROPOSER'] }));
    members.seed(makeMember({ id: 'admin-1', roles: ['GOVERNANCE_ADMIN'] }));
    members.seed(makeMember({ id: 'reviewer-1', roles: ['REVIEWER'] }));
    members.seed(makeMember({ id: 'random-1', roles: ['GOVERNANCE_MEMBER'] }));
  });

  it('an unauthenticated/unknown member cannot create a proposal', async () => {
    await expect(
      service.createProposal(
        { title: 'Unauthorized attempt', description: 'x'.repeat(30), proposerId: 'ghost', proposalType: 'POLICY_CHANGE', metadata: {} },
        'corr-1',
      ),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });

  it('a plain GOVERNANCE_MEMBER cannot create proposals (lacks PROPOSER capability)', async () => {
    await expect(
      service.createProposal(
        { title: 'Should fail', description: 'x'.repeat(30), proposerId: 'random-1', proposalType: 'POLICY_CHANGE', metadata: {} },
        'corr-1',
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('a proposer cannot approve their own proposal (self-approval forbidden)', async () => {
    const proposal = await service.createProposal(
      { title: 'Self approval test', description: 'x'.repeat(30), proposerId: 'proposer-1', proposalType: 'POLICY_CHANGE', metadata: {} },
      'c1',
    );
    // Even if we (incorrectly) granted the proposer admin capabilities,
    // assertNotSelfActing must still block it.
    members.seed(makeMember({ id: 'proposer-1', roles: ['PROPOSER', 'GOVERNANCE_ADMIN'] }));
    await service.submitProposal(proposal.id, 'proposer-1', 'c2');
    await service.beginReview(proposal.id, 'reviewer-1', 'c3');
    await service.activateForVoting(proposal.id, 'reviewer-1', 3600, 'c4');

    // Force into QUORUM_REACHED for the approval check.
    const current = await proposals.getById(proposal.id);
    await proposals.update({ ...current!, status: 'QUORUM_REACHED' });

    await expect(service.approveProposal(proposal.id, 'proposer-1', 'c5')).rejects.toMatchObject({
      code: 'SELF_APPROVAL_FORBIDDEN',
    });
  });

  it('an unapproved proposal cannot be queued or executed (invalid transition)', async () => {
    const proposal = await service.createProposal(
      { title: 'No shortcuts', description: 'x'.repeat(30), proposerId: 'proposer-1', proposalType: 'TREASURY_ACTION', metadata: {} },
      'c1',
    );
    await expect(service.queueProposal(proposal.id, 'admin-1', 'c2')).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
    });
  });

  it('execution cannot happen twice (idempotency / no double-execution)', async () => {
    const proposal = await service.createProposal(
      { title: 'Double exec test', description: 'x'.repeat(30), proposerId: 'proposer-1', proposalType: 'TREASURY_ACTION', executionDelaySeconds: 0, metadata: {} },
      'c1',
    );
    await service.submitProposal(proposal.id, 'proposer-1', 'c2');
    await service.beginReview(proposal.id, 'reviewer-1', 'c3');
    await service.activateForVoting(proposal.id, 'reviewer-1', 3600, 'c4');
    const current = (await proposals.getById(proposal.id))!;
    await proposals.update({ ...current, status: 'QUORUM_REACHED' });
    await service.approveProposal(proposal.id, 'admin-1', 'c5');
    await service.queueProposal(proposal.id, 'admin-1', 'c6');

    members.seed(makeMember({ id: 'treasury-1', roles: ['TREASURY_AUTHORIZER'] }));
    const txHash = '0x' + '1'.repeat(64);
    await service.recordExecution(proposal.id, 'treasury-1', txHash, 'c7');

    await expect(service.recordExecution(proposal.id, 'treasury-1', txHash, 'c8')).rejects.toMatchObject({
      code: 'ALREADY_EXECUTED',
    });
  });

  it('timelock must elapse before execution is permitted', async () => {
    const proposal = await service.createProposal(
      { title: 'Timelock test', description: 'x'.repeat(30), proposerId: 'proposer-1', proposalType: 'TREASURY_ACTION', executionDelaySeconds: 3600, metadata: {} },
      'c1',
    );
    await service.submitProposal(proposal.id, 'proposer-1', 'c2');
    await service.beginReview(proposal.id, 'reviewer-1', 'c3');
    await service.activateForVoting(proposal.id, 'reviewer-1', 3600, 'c4');
    const current = (await proposals.getById(proposal.id))!;
    await proposals.update({ ...current, status: 'QUORUM_REACHED' });
    await service.approveProposal(proposal.id, 'admin-1', 'c5');
    await service.queueProposal(proposal.id, 'admin-1', 'c6');

    members.seed(makeMember({ id: 'treasury-1', roles: ['TREASURY_AUTHORIZER'] }));
    await expect(
      service.recordExecution(proposal.id, 'treasury-1', '0x' + '2'.repeat(64), 'c7'),
    ).rejects.toMatchObject({ code: 'TIMELOCK_NOT_ELAPSED' });

    clock.advanceSeconds(3601);
    await expect(
      service.recordExecution(proposal.id, 'treasury-1', '0x' + '2'.repeat(64), 'c8'),
    ).resolves.toMatchObject({ status: 'EXECUTED' });
  });

  it('a GOVERNANCE_ADMIN alone cannot execute treasury actions (separation of duties)', async () => {
    const proposal = await service.createProposal(
      { title: 'Admin cannot execute', description: 'x'.repeat(30), proposerId: 'proposer-1', proposalType: 'TREASURY_ACTION', executionDelaySeconds: 0, metadata: {} },
      'c1',
    );
    await service.submitProposal(proposal.id, 'proposer-1', 'c2');
    await service.beginReview(proposal.id, 'reviewer-1', 'c3');
    await service.activateForVoting(proposal.id, 'reviewer-1', 3600, 'c4');
    const current = (await proposals.getById(proposal.id))!;
    await proposals.update({ ...current, status: 'QUORUM_REACHED' });
    await service.approveProposal(proposal.id, 'admin-1', 'c5');
    await service.queueProposal(proposal.id, 'admin-1', 'c6');

    // admin-1 has GOVERNANCE_ADMIN but NOT TREASURY_AUTHORIZER.
    await expect(
      service.recordExecution(proposal.id, 'admin-1', '0x' + '3'.repeat(64), 'c7'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
