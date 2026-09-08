import type {
  AuditLogEntry,
  ExecutionRecord,
  GovernanceMember,
  GovernanceSettings,
  Proposal,
  QuorumSnapshot,
  Vote,
} from '../domain/types.js';

/**
 * Repository ports (Section 24: keep business rules independent from
 * infrastructure). Concrete implementations live in
 * src/infrastructure/db and talk to Supabase/PostgreSQL per the
 * migrations in /migrations. Services depend only on these
 * interfaces, never on a concrete DB client, so unit tests can supply
 * in-memory fakes without touching a real database.
 */

export interface ProposalRepository {
  create(proposal: Proposal): Promise<Proposal>;
  getById(id: string): Promise<Proposal | null>;
  update(proposal: Proposal): Promise<Proposal>;
  list(filter: {
    status?: string;
    proposalType?: string;
    proposerId?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ items: Proposal[]; nextCursor: string | null }>;
}

export interface VoteRepository {
  create(vote: Vote): Promise<Vote>;
  findByProposalAndMember(proposalId: string, memberId: string): Promise<Vote | null>;
  listByProposal(proposalId: string): Promise<Vote[]>;
  invalidate(voteId: string, reason: string): Promise<void>;
}

export interface MemberRepository {
  getById(id: string): Promise<GovernanceMember | null>;
  countEligible(): Promise<number>;
  update(member: GovernanceMember): Promise<GovernanceMember>;
}

export interface AuditRepository {
  append(entry: AuditLogEntry): Promise<AuditLogEntry>;
  listByTarget(targetEntity: string, targetId: string): Promise<AuditLogEntry[]>;
}

export interface QuorumRepository {
  saveSnapshot(snapshot: QuorumSnapshot): Promise<QuorumSnapshot>;
}

export interface GovernanceSettingsRepository {
  getCurrent(): Promise<GovernanceSettings | null>;
  update(settings: GovernanceSettings): Promise<GovernanceSettings>;
}

export interface ExecutionRepository {
  create(record: ExecutionRecord): Promise<ExecutionRecord>;
  findByProposalId(proposalId: string): Promise<ExecutionRecord | null>;
  findByTxHash(txHash: string): Promise<ExecutionRecord | null>;
}

export interface ExecutionVerifier {
  verify(proposal: Proposal, transactionHash: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string; // UUID
}
