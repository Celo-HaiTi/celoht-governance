import type { Vote } from '../../domain/types.js';
import type { VoteRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseVoteRepository implements VoteRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async create(vote: Vote): Promise<Vote> {
    const { data, error } = await this.client.from('governance_votes').insert(vote).select().single();
    if (error) throw error;
    return data as Vote;
  }

  async findByProposalAndMember(proposalId: string, memberId: string): Promise<Vote | null> {
    const { data, error } = await this.client.from('governance_votes').select('*').eq('proposal_id', proposalId).eq('member_id', memberId).maybeSingle();
    if (error) throw error;
    return (data as Vote | null) ?? null;
  }

  async listByProposal(proposalId: string): Promise<Vote[]> {
    const { data, error } = await this.client.from('governance_votes').select('*').eq('proposal_id', proposalId);
    if (error) throw error;
    return (data ?? []) as Vote[];
  }

  async invalidate(voteId: string, reason: string): Promise<void> {
    const { error } = await this.client.from('governance_votes').update({ invalidated: true, invalidated_reason: reason }).eq('id', voteId);
    if (error) throw error;
  }
}
