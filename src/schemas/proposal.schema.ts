import { z } from 'zod';

export const ProposalTypeSchema = z.enum([
  'POLICY_CHANGE',
  'GOVERNANCE_CHANGE',
  'TREASURY_ACTION',
  'COMMUNITY_FUNDING',
  'PROGRAM_CHANGE',
  'AGENT_NETWORK_CHANGE',
  'REFORESTATION_ACTION',
  'EDUCATION_PROGRAM_CHANGE',
  'EMERGENCY_ACTION',
]);

export const ProposalStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACTIVE',
  'VOTING',
  'QUORUM_REACHED',
  'APPROVED',
  'REJECTED',
  'QUEUED',
  'EXECUTED',
  'CANCELLED',
  'EXPIRED',
]);

export const CreateProposalInputSchema = z.object({
  title: z.string().min(8).max(200),
  description: z.string().min(20).max(20000),
  proposerId: z.string().uuid(),
  proposalType: ProposalTypeSchema,
  quorumBps: z.number().int().min(1).max(10000).optional(),
  approvalThresholdBps: z.number().int().min(1).max(10000).optional(),
  executionDelaySeconds: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateProposalInput = z.infer<typeof CreateProposalInputSchema>;

export const SubmitProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  actorId: z.string().uuid(),
});

export const CastVoteInputSchema = z.object({
  proposalId: z.string().uuid(),
  memberId: z.string().uuid(),
  choice: z.enum(['FOR', 'AGAINST', 'ABSTAIN']),
  // Present only for wallet-based voting; a wallet address alone is
  // never treated as proof of authorization (Section 16).
  signature: z
    .object({
      message: z.string(),
      signature: z.string(),
      nonce: z.string(),
      chainId: z.number().int(),
      domain: z.object({ name: z.string(), version: z.string() }),
    })
    .optional(),
});
export type CastVoteInput = z.infer<typeof CastVoteInputSchema>;

export const RejectProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  actorId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export const CancelProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  actorId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export const ExecuteProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  actorId: z.string().uuid(),
  executionTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'must be a valid tx hash'),
});

export const ListProposalsQuerySchema = z.object({
  status: ProposalStatusSchema.optional(),
  proposalType: ProposalTypeSchema.optional(),
  proposerId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
