import type { AuditLogEntry } from '../../domain/types.js';
import type { AuditRepository } from '../../application/ports.js';
import { getSupabaseClient } from './supabaseClient.js';

export class SupabaseAuditRepository implements AuditRepository {
  constructor(private readonly client = getSupabaseClient()) {}

  async append(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const { data, error } = await this.client.from('governance_workflow_audit_logs').insert({
      id: entry.id,
      actor_id: entry.actorId,
      event_type: entry.eventType,
      target_entity: entry.targetEntity,
      target_id: entry.targetId,
      timestamp: entry.timestamp,
      metadata: entry.metadata,
      correlation_id: entry.correlationId,
      resulting_state: entry.resultingState,
    }).select().single();
    if (error) throw error;
    return data as AuditLogEntry;
  }

  async listByTarget(targetEntity: string, targetId: string): Promise<AuditLogEntry[]> {
    const { data, error } = await this.client.from('governance_workflow_audit_logs').select('*').eq('target_entity', targetEntity).eq('target_id', targetId).order('timestamp', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AuditLogEntry[];
  }
}
