import type { GovernanceMember } from '../../domain/types.js';
import type { MemberRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseMemberRepository implements MemberRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async getById(id: string): Promise<GovernanceMember | null> {
    const { data, error } = await this.client.from('governance_members').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as GovernanceMember | null) ?? null;
  }

  async countEligible(): Promise<number> {
    const { count, error } = await this.client.from('governance_members').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
    if (error) throw error;
    return count ?? 0;
  }

  async update(member: GovernanceMember): Promise<GovernanceMember> {
    const { data, error } = await this.client.from('governance_members').update(member).eq('id', member.id).select().single();
    if (error) throw error;
    return data as GovernanceMember;
  }
}
