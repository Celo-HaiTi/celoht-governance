import { createHash } from 'node:crypto';
import type { IdempotencyStore } from '../../application/securityPorts.js';
import { Errors } from '../../errors/GovernanceError.js';
import { getSupabaseClient, type SupabaseClient } from './supabaseClient.js';

export class SupabaseIdempotencyStore implements IdempotencyStore {
  constructor(private readonly client: SupabaseClient = getSupabaseClient()) {}

  async execute<T>(input: {
    key: string;
    actorId: string;
    operation: string;
    requestHash: string;
    action: () => Promise<T>;
  }): Promise<T> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { error: claimError } = await this.client.from('governance_workflow_idempotency').insert({
      idempotency_key: input.key,
      actor_id: input.actorId,
      operation: input.operation,
      request_hash: input.requestHash,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    });

    if (claimError) {
      const { data, error } = await this.client.from('governance_workflow_idempotency')
        .select('actor_id, operation, request_hash, response, expires_at')
        .eq('idempotency_key', input.key)
        .maybeSingle();
      if (error || !data) throw Errors.validation('Idempotency record could not be resolved');
      if (data.actor_id !== input.actorId || data.operation !== input.operation || data.request_hash !== input.requestHash) {
        throw Errors.validation('Idempotency-Key was already used for a different request');
      }
      if (new Date(String(data.expires_at)) <= now) throw Errors.validation('Idempotency-Key has expired');
      if (data.response === null || data.response === undefined) throw Errors.validation('Identical request is already in progress');
      const stored = data.response;
      if (!stored || !('value' in stored)) throw Errors.validation('Stored idempotency response is invalid');
      return stored.value as T;
    }

    const result = await input.action();
    const response = JSON.parse(JSON.stringify(result, (_, value: unknown) => typeof value === 'bigint' ? value.toString() : value)) as Record<string, unknown>;
    const responseHash = createHash('sha256').update(JSON.stringify(response)).digest('hex');
    const { error: persistError } = await this.client.from('governance_workflow_idempotency')
      .update({ response: { hash: responseHash, value: response } })
      .eq('idempotency_key', input.key)
      .eq('request_hash', input.requestHash);
    if (persistError) throw persistError;
    return result;
  }
}
