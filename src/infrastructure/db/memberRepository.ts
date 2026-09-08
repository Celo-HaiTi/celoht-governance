import type { GovernanceMember } from '../../domain/types.js';
import type { MemberRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseMemberRepository implements MemberRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async getById(id: string): Promise<GovernanceMember | null> {
    const { data, error } = await this.client.from('governance_workflow_members').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? {
      id: String(data.id), displayName: String(data.display_name), status: data.status as GovernanceMember['status'],
      roles: data.roles as GovernanceMember['roles'], eligibleToVoteSince: String(data.eligible_to_vote_since),
      createdAt: String(data.created_at), updatedAt: String(data.updated_at),
    } : null;
  }

  async countEligible(): Promise<number> {
    const { count, error } = await this.client.from('governance_workflow_members').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
    if (error) throw error;
    return count ?? 0;
  }

  async update(member: GovernanceMember): Promise<GovernanceMember> {
    const { data, error } = await this.client.from('governance_workflow_members').update({
      display_name: member.displayName, status: member.status, roles: member.roles,
      eligible_to_vote_since: member.eligibleToVoteSince, updated_at: member.updatedAt,
    }).eq('id', member.id).select().single();
    if (error) throw error;
    return {
      id: String(data.id), displayName: String(data.display_name), status: data.status as GovernanceMember['status'],
      roles: data.roles as GovernanceMember['roles'], eligibleToVoteSince: String(data.eligible_to_vote_since),
      createdAt: String(data.created_at), updatedAt: String(data.updated_at),
    };
  }
}
