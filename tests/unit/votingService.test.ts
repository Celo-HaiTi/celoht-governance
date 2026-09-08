import { beforeEach, describe, expect, it } from 'vitest';
import { VotingService } from '../../src/application/votingService.js';
import { AuditService } from '../../src/application/auditService.js';
import {
  FakeClock, FakeIdGenerator, InMemoryAuditRepository, InMemoryMemberRepository,
  InMemoryProposalRepository, InMemoryQuorumRepository, InMemoryVoteRepository, makeMember,
} from '../fakes.js';
import type { Proposal } from '../../src/domain/types.js';
import { GovernanceError } from '../../src/errors/GovernanceError.js';
import type { SignatureVerifier } from '../../src/security/signature.js';

function baseProposal(overrides: Partial<Proposal> = {}): Proposal {
  const now = new Date().toISOString();
  return {
    id: 'prop-1', title: 't', description: 'd', proposerId: 'proposer-1',
    proposalType: 'POLICY_CHANGE', status: 'VOTING', governanceVersion: '1.0.0',
    createdAt: now, submittedAt: now, votingStartsAt: now,
    votingEndsAt: new Date(Date.now() + 3600_000).toISOString(),
    quorumBps: 2000, approvalThresholdBps: 5000, executionDelaySeconds: 0,
    executionStatus: 'NOT_EXECUTED', queuedAt: null, executableAt: null, executedAt: null,
    cancellationReason: null, rejectionReason: null, metadata: {}, updatedAt: now,
    ...overrides,
  };
}

const noopSignatureVerifier: SignatureVerifier = { verify: async () => {} };

describe('VotingService — duplicate votes and quorum invariants', () => {
  let proposals: InMemoryProposalRepository;
  let votes: InMemoryVoteRepository;
  let members: InMemoryMemberRepository;
  let quorum: InMemoryQuorumRepository;
  let audit: InMemoryAuditRepository;
  let service: VotingService;

  beforeEach(async () => {
    proposals = new InMemoryProposalRepository();
    votes = new InMemoryVoteRepository();
    members = new InMemoryMemberRepository();
    quorum = new InMemoryQuorumRepository();
    audit = new InMemoryAuditRepository();
    const auditService = new AuditService(audit, new FakeClock(new Date()), new FakeIdGenerator());
    service = new VotingService(
      proposals, votes, members, quorum, auditService,
      new FakeClock(new Date()), new FakeIdGenerator(), noopSignatureVerifier,
    );
    await proposals.create(baseProposal());
    members.seed(makeMember({ id: 'voter-1' }));
    members.seed(makeMember({ id: 'voter-2' }));
    members.seed(makeMember({ id: 'proposer-1', roles: ['PROPOSER'] }));
  });

  it('an unauthorized (suspended) member cannot vote', async () => {
    members.seed(makeMember({ id: 'suspended-1', status: 'SUSPENDED' }));
    await expect(
      service.castVote({ proposalId: 'prop-1', memberId: 'suspended-1', choice: 'FOR' }, 'corr-1'),
    ).rejects.toBeInstanceOf(GovernanceError);
  });

  it('a member cannot cast a duplicate vote on the same proposal', async () => {
    await service.castVote({ proposalId: 'prop-1', memberId: 'voter-1', choice: 'FOR' }, 'corr-1');
    await expect(
      service.castVote({ proposalId: 'prop-1', memberId: 'voter-1', choice: 'AGAINST' }, 'corr-2'),
    ).rejects.toMatchObject({ code: 'DUPLICATE_VOTE' });
  });

  it('votes cannot be cast once voting has closed', async () => {
    await proposals.update({ ...(await proposals.getById('prop-1'))!, votingEndsAt: new Date(Date.now() - 1000).toISOString() });
    await expect(
      service.castVote({ proposalId: 'prop-1', memberId: 'voter-1', choice: 'FOR' }, 'corr-1'),
    ).rejects.toMatchObject({ code: 'VOTING_CLOSED' });
  });

  it('quorum snapshot correctly computes reached/not-reached', async () => {
    await service.castVote({ proposalId: 'prop-1', memberId: 'voter-1', choice: 'FOR' }, 'c1');
    // 1 of 3 eligible members (33%) voted; quorum is 20% -> reached.
    const result = await service.computeQuorum('prop-1', 'c2');
    expect(result.quorumReached).toBe(true);
    expect(result.thresholdMet).toBe(true); // 100% FOR among decisive votes
    expect(quorum.snapshots).toHaveLength(1);
  });

  it('every vote cast produces an audit event', async () => {
    await service.castVote({ proposalId: 'prop-1', memberId: 'voter-2', choice: 'AGAINST' }, 'c3');
    const events = audit.entries.filter((e) => e.eventType === 'VOTE_CAST');
    expect(events).toHaveLength(1);
  });
});
