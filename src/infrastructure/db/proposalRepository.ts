import type { Proposal } from '../../domain/types.js';
import type { ProposalRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

type WorkflowRow = Record<string, unknown>;

function toProposal(row: WorkflowRow): Proposal {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    proposerId: String(row.proposer_id),
    proposalType: row.proposal_type as Proposal['proposalType'],
    status: row.status as Proposal['status'],
    governanceVersion: String(row.governance_version),
    createdAt: String(row.created_at),
    submittedAt: row.submitted_at as string | null,
    votingStartsAt: row.voting_starts_at as string | null,
    votingEndsAt: row.voting_ends_at as string | null,
    quorumBps: Number(row.quorum_bps),
    approvalThresholdBps: Number(row.approval_threshold_bps),
    executionDelaySeconds: Number(row.execution_delay_seconds),
    executionStatus: row.execution_status as Proposal['executionStatus'],
    queuedAt: row.queued_at as string | null,
    executableAt: row.executable_at as string | null,
    executedAt: row.executed_at as string | null,
    cancellationReason: row.cancellation_reason as string | null,
    rejectionReason: row.rejection_reason as string | null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseProposalRepository implements ProposalRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async create(proposal: Proposal): Promise<Proposal> {
    const { data, error } = await this.client.from('governance_proposals').insert(proposal).select().single();
    if (error) throw error;
    return toProposal(data as WorkflowRow);
  }

  async getById(id: string): Promise<Proposal | null> {
    const { data, error } = await this.client.from('governance_proposals').select().eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toProposal(data as WorkflowRow) : null;
  }

  async update(proposal: Proposal): Promise<Proposal> {
    const { data, error } = await this.client.from('governance_proposals').update(proposal).eq('id', proposal.id).select().single();
    if (error) throw error;
    return toProposal(data as WorkflowRow);
  }

  async list(filter: {
    status?: string;
    proposalType?: string;
    proposerId?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ items: Proposal[]; nextCursor: string | null }> {
    let query = this.client.from('governance_proposals').select('*').limit(filter.limit);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.proposalType) query = query.eq('proposal_type', filter.proposalType);
    if (filter.proposerId) query = query.eq('proposer_id', filter.proposerId);
    if (filter.cursor) query = query.gt('id', filter.cursor);
    const { data, error } = await query;
    if (error) throw error;
    const items = (data ?? []).map((row) => toProposal(row as WorkflowRow));
    return { items, nextCursor: items.length === filter.limit ? items.at(-1)?.id ?? null : null };
  }
}
