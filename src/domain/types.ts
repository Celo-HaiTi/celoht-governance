/**
 * Core governance domain types.
 * These are the authoritative shapes referenced by celoht-backend,
 * celoht-admin, and the CeloHT dApp. Changing a shape here is a
 * breaking governance-contract change and must be versioned
 * (see GOVERNANCE_VERSION in .env.example and GOVERNANCE.md).
 */

export type ProposalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACTIVE'
  | 'VOTING'
  | 'QUORUM_REACHED'
  | 'APPROVED'
  | 'REJECTED'
  | 'QUEUED'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ProposalType =
  | 'POLICY_CHANGE'
  | 'GOVERNANCE_CHANGE'
  | 'TREASURY_ACTION'
  | 'COMMUNITY_FUNDING'
  | 'PROGRAM_CHANGE'
  | 'AGENT_NETWORK_CHANGE'
  | 'REFORESTATION_ACTION'
  | 'EDUCATION_PROGRAM_CHANGE'
  | 'EMERGENCY_ACTION';

export type Role =
  | 'GOVERNANCE_MEMBER'
  | 'PROPOSER'
  | 'REVIEWER'
  | 'GOVERNANCE_ADMIN'
  | 'TREASURY_AUTHORIZER'
  | 'EMERGENCY_ROLE'
  | 'AUDITOR';

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | 'PENDING';

export type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN';

export interface GovernanceMember {
  id: string; // UUID
  displayName: string;
  status: MemberStatus;
  roles: Role[];
  eligibleToVoteSince: string; // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string; // UUID
  title: string;
  description: string;
  proposerId: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  governanceVersion: string; // rules version this proposal was created under
  createdAt: string;
  submittedAt: string | null;
  votingStartsAt: string | null;
  votingEndsAt: string | null;
  quorumBps: number; // basis points, e.g. 2000 = 20%
  approvalThresholdBps: number; // basis points, e.g. 5000 = 50%
  executionDelaySeconds: number;
  executionStatus: 'NOT_EXECUTED' | 'QUEUED' | 'EXECUTED' | 'FAILED';
  queuedAt: string | null;
  executableAt: string | null;
  executedAt: string | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  memberId: string;
  choice: VoteChoice;
  votingPower: number; // explicit, defaults to 1 under one-member-one-vote
  castAt: string;
  invalidated: boolean;
  invalidatedReason: string | null;
}

export interface QuorumSnapshot {
  proposalId: string;
  governanceVersion: string;
  eligibleMemberCount: number;
  quorumRequired: number; // computed count, not just bps
  votesForCount: number;
  votesAgainstCount: number;
  votesAbstainCount: number;
  takenAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null; // null only for system-initiated events (e.g. auto-expiry)
  eventType: string;
  targetEntity: string;
  targetId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  correlationId: string;
  resultingState: string | null;
}

export interface GovernanceSettings {
  version: string;
  quorumBps: number;
  approvalThresholdBps: number;
  votingPeriodSeconds: number;
  executionDelaySeconds: number;
  emergencyRoleMaxDurationSeconds: number;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  proposalId: string;
  transactionHash: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  verifiedAt: string | null;
  chainId: number;
  targetAddress: string | null;
  executedBy: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}
