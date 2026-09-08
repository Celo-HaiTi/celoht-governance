import type { Vote } from '../../domain/types.js';
import type { VoteRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

function toVote(row: Record<string, unknown>): Vote {
  return {
    id: String(row.id),
    proposalId: String(row.proposal_id),
    memberId: String(row.member_id),
    choice: row.choice as Vote['choice'],
    votingPower: Number(row.voting_power),
    castAt: String(row.cast_at),
    invalidated: Boolean(row.invalidated),
    invalidatedReason: row.invalidated_reason as string | null,
  };
}

export class SupabaseVoteRepository implements VoteRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async create(vote: Vote): Promise<Vote> {
    const { data, error } = await this.client.from('governance_workflow_votes').insert({
      id: vote.id, proposal_id: vote.proposalId, member_id: vote.memberId, choice: vote.choice,
      voting_power: 1, cast_at: vote.castAt, invalidated: vote.invalidated, invalidated_reason: vote.invalidatedReason,
    }).select().single();
    if (error) throw error;
    return toVote(data as Record<string, unknown>);
  }

  async findByProposalAndMember(proposalId: string, memberId: string): Promise<Vote | null> {
    const { data, error } = await this.client.from('governance_workflow_votes').select('*').eq('proposal_id', proposalId).eq('member_id', memberId).maybeSingle();
    if (error) throw error;
    return data ? toVote(data as Record<string, unknown>) : null;
  }

  async listByProposal(proposalId: string): Promise<Vote[]> {
    const { data, error } = await this.client.from('governance_workflow_votes').select('*').eq('proposal_id', proposalId);
    if (error) throw error;
    return (data ?? []).map((row) => toVote(row as Record<string, unknown>));
  }

  async invalidate(voteId: string, reason: string): Promise<void> {
    const { error } = await this.client.from('governance_workflow_votes').update({ invalidated: true, invalidated_reason: reason }).eq('id', voteId);
    if (error) throw error;
  }
}
