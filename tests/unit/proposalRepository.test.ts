import { describe, expect, it, vi } from 'vitest';
import { SupabaseProposalRepository } from '../../src/infrastructure/db/proposalRepository.js';
import type { SupabaseClient } from '../../src/infrastructure/db/supabaseClient.js';
import type { Proposal } from '../../src/domain/types.js';

const proposal: Proposal = {
  id: 'proposal-1',
  title: 'Test proposal',
  description: 'A proposal used by repository tests',
  proposerId: 'member-1',
  proposalType: 'POLICY_CHANGE',
  status: 'DRAFT',
  governanceVersion: '1',
  createdAt: '2026-01-01T00:00:00.000Z',
  submittedAt: null,
  votingStartsAt: null,
  votingEndsAt: null,
  quorumBps: 2000,
  approvalThresholdBps: 5000,
  executionDelaySeconds: 0,
  executionStatus: 'NOT_EXECUTED',
  queuedAt: null,
  executableAt: null,
  executedAt: null,
  cancellationReason: null,
  rejectionReason: null,
  metadata: {},
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const proposalRow = {
  id: proposal.id,
  title: proposal.title,
  description: proposal.description,
  proposer_id: proposal.proposerId,
  proposal_type: proposal.proposalType,
  status: proposal.status,
  governance_version: proposal.governanceVersion,
  created_at: proposal.createdAt,
  submitted_at: proposal.submittedAt,
  voting_starts_at: proposal.votingStartsAt,
  voting_ends_at: proposal.votingEndsAt,
  quorum_bps: proposal.quorumBps,
  approval_threshold_bps: proposal.approvalThresholdBps,
  execution_delay_seconds: proposal.executionDelaySeconds,
  execution_status: proposal.executionStatus,
  queued_at: proposal.queuedAt,
  executable_at: proposal.executableAt,
  executed_at: proposal.executedAt,
  cancellation_reason: proposal.cancellationReason,
  rejection_reason: proposal.rejectionReason,
  metadata: proposal.metadata,
  updated_at: proposal.updatedAt,
};

type QueryResult = { data: unknown; error: Error | null };
type TestQuery = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

function makeQuery(result: QueryResult): TestQuery {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    gt: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown): Promise<unknown> =>
      Promise.resolve(result).then(resolve, reject),
  };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return query;
}

function makeClient(query: ReturnType<typeof makeQuery>): SupabaseClient {
  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

describe('SupabaseProposalRepository', () => {
  it('orders cursor-based proposal pages by id ascending', async () => {
    const query = {
      select: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      gt: vi.fn(),
      then: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.gt.mockReturnValue(query);
    query.then.mockImplementation((resolve: (result: { data: never[]; error: null }) => void) => {
      resolve({ data: [], error: null });
    });

    const client = {
      from: vi.fn(() => query),
    } as unknown as SupabaseClient;

    await new SupabaseProposalRepository(client).list({ limit: 10, cursor: 'proposal-1' });

    expect(query.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(query.gt).toHaveBeenCalledWith('id', 'proposal-1');
  });

  it('creates and maps a proposal', async () => {
    const query = makeQuery({ data: proposalRow, error: null });
    const repository = new SupabaseProposalRepository(makeClient(query));

    await expect(repository.create(proposal)).resolves.toEqual(proposal);
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ proposer_id: proposal.proposerId }));
  });

  it('returns null when a proposal does not exist', async () => {
    const query = makeQuery({ data: null, error: null });
    const repository = new SupabaseProposalRepository(makeClient(query));

    await expect(repository.getById('missing')).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith('id', 'missing');
  });

  it('updates and maps a proposal', async () => {
    const query = makeQuery({ data: proposalRow, error: null });
    const repository = new SupabaseProposalRepository(makeClient(query));

    await expect(repository.update(proposal)).resolves.toEqual(proposal);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ id: proposal.id }));
  });

  it('applies list filters and returns the last id as the next cursor for a full page', async () => {
    const query = makeQuery({ data: [proposalRow], error: null });
    const repository = new SupabaseProposalRepository(makeClient(query));

    await expect(repository.list({
      status: 'DRAFT',
      proposalType: 'POLICY_CHANGE',
      proposerId: 'member-1',
      limit: 1,
    })).resolves.toEqual({ items: [proposal], nextCursor: proposal.id });
    expect(query.eq).toHaveBeenCalledWith('status', 'DRAFT');
    expect(query.eq).toHaveBeenCalledWith('proposal_type', 'POLICY_CHANGE');
    expect(query.eq).toHaveBeenCalledWith('proposer_id', 'member-1');
  });

  it('propagates database errors', async () => {
    const error = new Error('database unavailable');
    const query = makeQuery({ data: null, error });
    const repository = new SupabaseProposalRepository(makeClient(query));

    await expect(repository.getById('proposal-1')).rejects.toBe(error);
  });
});