import type { QuorumSnapshot } from '../../domain/types.js';
import type { QuorumRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseQuorumRepository implements QuorumRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async saveSnapshot(snapshot: QuorumSnapshot): Promise<QuorumSnapshot> {
    const { data, error } = await this.client.from('governance_quorum_snapshots').insert(snapshot).select().single();
    if (error) throw error;
    return data as QuorumSnapshot;
  }
}
