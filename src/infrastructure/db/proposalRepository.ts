import type { Proposal } from '../../domain/types.js';
import type { ProposalRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseProposalRepository implements ProposalRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async create(proposal: Proposal): Promise<Proposal> {
    const { data, error } = await this.client.from('governance_proposals').insert(proposal).select().single();
    if (error) throw error;
    return data as Proposal;
  }

  async getById(id: string): Promise<Proposal | null> {
    const { data, error } = await this.client.from('governance_proposals').select().eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Proposal | null) ?? null;
  }

  async update(proposal: Proposal): Promise<Proposal> {
    const { data, error } = await this.client.from('governance_proposals').update(proposal).eq('id', proposal.id).select().single();
    if (error) throw error;
    return data as Proposal;
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
    return { items: (data ?? []) as Proposal[], nextCursor: null };
  }
}
