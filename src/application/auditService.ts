import type { AuditLogEntry } from '../domain/types.js';
import type { AuditRepository, Clock, IdGenerator } from './ports.js';

/**
 * Every sensitive governance action must call this — see Section 14.
 * Audit records are append-only: this service exposes no update or
 * delete. Corrections happen by writing a new event, never by
 * mutating history (Section 29).
 */
export class AuditService {
  constructor(
    private readonly repo: AuditRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async record(input: {
    actorId: string | null;
    eventType: string;
    targetEntity: string;
    targetId: string;
    metadata?: Record<string, unknown>;
    correlationId: string;
    resultingState?: string | null;
  }): Promise<AuditLogEntry> {
    // Defensive: never allow secret-shaped keys into audit metadata.
    const forbiddenKeys = ['privateKey', 'seedPhrase', 'password', 'apiSecret', 'serviceRoleKey'];
    const metadata = { ...(input.metadata ?? {}) };
    for (const key of forbiddenKeys) delete metadata[key];

    const entry: AuditLogEntry = {
      id: this.ids.next(),
      actorId: input.actorId,
      eventType: input.eventType,
      targetEntity: input.targetEntity,
      targetId: input.targetId,
      timestamp: this.clock.now().toISOString(),
      metadata,
      correlationId: input.correlationId,
      resultingState: input.resultingState ?? null,
    };
    return this.repo.append(entry);
  }
}
