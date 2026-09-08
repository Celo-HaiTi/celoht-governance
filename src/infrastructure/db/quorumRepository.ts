import type { QuorumSnapshot } from '../../domain/types.js';
import type { QuorumRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseQuorumRepository implements QuorumRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async saveSnapshot(snapshot: QuorumSnapshot): Promise<QuorumSnapshot> {
    const { data, error } = await this.client.from('governance_workflow_quorum_snapshots').insert({
      proposal_id: snapshot.proposalId,
      eligible_member_count: snapshot.eligibleMemberCount,
      quorum_required: snapshot.quorumRequired,
      votes_for_count: snapshot.votesForCount,
      votes_against_count: snapshot.votesAgainstCount,
      votes_abstain_count: snapshot.votesAbstainCount,
      governance_version: snapshot.governanceVersion,
      taken_at: snapshot.takenAt,
    }).select().single();
    if (error) throw error;
    return {
      proposalId: String(data.proposal_id), eligibleMemberCount: Number(data.eligible_member_count),
      governanceVersion: String(data.governance_version),
      quorumRequired: Number(data.quorum_required), votesForCount: Number(data.votes_for_count),
      votesAgainstCount: Number(data.votes_against_count), votesAbstainCount: Number(data.votes_abstain_count),
      takenAt: String(data.taken_at),
    };
  }
}
