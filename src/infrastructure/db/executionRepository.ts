import type { ExecutionRecord } from '../../domain/types.js';
import type { ExecutionRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseExecutionRepository implements ExecutionRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async create(record: ExecutionRecord): Promise<ExecutionRecord> {
    const { data, error } = await this.client.from('governance_executions').insert(record).select().single();
    if (error) throw error;
    return data as ExecutionRecord;
  }

  async findByProposalId(proposalId: string): Promise<ExecutionRecord | null> {
    const { data, error } = await this.client.from('governance_executions').select('*').eq('proposal_id', proposalId).maybeSingle();
    if (error) throw error;
    return (data as ExecutionRecord | null) ?? null;
  }

  async findByTxHash(txHash: string): Promise<ExecutionRecord | null> {
    const { data, error } = await this.client.from('governance_executions').select('*').eq('transaction_hash', txHash).maybeSingle();
    if (error) throw error;
    return (data as ExecutionRecord | null) ?? null;
  }
}
