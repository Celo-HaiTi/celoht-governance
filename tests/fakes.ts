import type { AuditLogEntry, GovernanceMember, Proposal, QuorumSnapshot, Vote } from '../src/domain/types.js';
import type {
  AuditRepository, Clock, IdGenerator, MemberRepository,
  ProposalRepository, QuorumRepository, VoteRepository,
} from '../src/application/ports.js';

/**
 * In-memory fakes for integration-style tests, per Section 22
 * ("Integration tests — database operations, authorization, API
 * contracts, audit logging"). These implement the same repository
 * ports the real Supabase/Postgres adapters implement, so service
 * logic is exercised the same way regardless of backing store.
 */

export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date { return this.current; }
  advanceSeconds(s: number): void { this.current = new Date(this.current.getTime() + s * 1000); }
}

let counter = 0;
export class FakeIdGenerator implements IdGenerator {
  next(): string { counter += 1; return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`; }
}

export class InMemoryProposalRepository implements ProposalRepository {
  private store = new Map<string, Proposal>();
  async create(p: Proposal) { this.store.set(p.id, p); return p; }
  async getById(id: string) { return this.store.get(id) ?? null; }
  async update(p: Proposal) { this.store.set(p.id, p); return p; }
  async list() { return { items: [...this.store.values()], nextCursor: null }; }
}

export class InMemoryVoteRepository implements VoteRepository {
  private store = new Map<string, Vote>();
  async create(v: Vote) { this.store.set(v.id, v); return v; }
  async findByProposalAndMember(proposalId: string, memberId: string) {
    return [...this.store.values()].find((v) => v.proposalId === proposalId && v.memberId === memberId) ?? null;
  }
  async listByProposal(proposalId: string) {
    return [...this.store.values()].filter((v) => v.proposalId === proposalId);
  }
  async invalidate(voteId: string, reason: string) {
    const v = this.store.get(voteId);
    if (v) this.store.set(voteId, { ...v, invalidated: true, invalidatedReason: reason });
  }
}

export class InMemoryMemberRepository implements MemberRepository {
  constructor(private members = new Map<string, GovernanceMember>()) {}
  seed(m: GovernanceMember) { this.members.set(m.id, m); }
  async getById(id: string) { return this.members.get(id) ?? null; }
  async countEligible() { return [...this.members.values()].filter((m) => m.status === 'ACTIVE').length; }
  async update(m: GovernanceMember) { this.members.set(m.id, m); return m; }
}

export class InMemoryAuditRepository implements AuditRepository {
  public entries: AuditLogEntry[] = [];
  async append(e: AuditLogEntry) { this.entries.push(e); return e; }
  async listByTarget(targetEntity: string, targetId: string) {
    return this.entries.filter((e) => e.targetEntity === targetEntity && e.targetId === targetId);
  }
}

export class InMemoryQuorumRepository implements QuorumRepository {
  public snapshots: QuorumSnapshot[] = [];
  async saveSnapshot(s: QuorumSnapshot) { this.snapshots.push(s); return s; }
}

export function makeMember(overrides: Partial<GovernanceMember> & { id: string }): GovernanceMember {
  const now = new Date().toISOString();
  return {
    displayName: 'Test Member',
    status: 'ACTIVE',
    roles: ['GOVERNANCE_MEMBER'],
    eligibleToVoteSince: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
