import type { ExecutionRecord } from '../../domain/types.js';
import type { ExecutionRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseExecutionRepository implements ExecutionRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async create(record: ExecutionRecord): Promise<ExecutionRecord> {
    const { data, error } = await this.client.from('governance_workflow_executions').insert({
      id: record.id,
      proposal_id: record.proposalId,
      transaction_hash: record.transactionHash,
      status: record.status,
      verified_at: record.verifiedAt,
      chain_id: record.chainId,
      target_address: record.targetAddress,
      executed_by: record.executedBy,
      created_at: record.createdAt,
      metadata: record.metadata,
    }).select().single();
    if (error) throw error;
    return data as ExecutionRecord;
  }

  async findByProposalId(proposalId: string): Promise<ExecutionRecord | null> {
    const { data, error } = await this.client.from('governance_workflow_executions').select('*').eq('proposal_id', proposalId).maybeSingle();
    if (error) throw error;
    return (data as ExecutionRecord | null) ?? null;
  }

  async findByTxHash(txHash: string): Promise<ExecutionRecord | null> {
    const { data, error } = await this.client.from('governance_workflow_executions').select('*').eq('transaction_hash', txHash).maybeSingle();
    if (error) throw error;
    return (data as ExecutionRecord | null) ?? null;
  }
}
