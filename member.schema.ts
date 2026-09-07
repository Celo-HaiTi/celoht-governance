import { z } from 'zod';

export const RoleSchema = z.enum([
  'GOVERNANCE_MEMBER',
  'PROPOSER',
  'REVIEWER',
  'GOVERNANCE_ADMIN',
  'TREASURY_AUTHORIZER',
  'EMERGENCY_ROLE',
  'AUDITOR',
]);

// Privacy-by-design: only what governance strictly requires.
// No identity documents, no personal contact info here.
export const CreateMemberInputSchema = z.object({
  displayName: z.string().min(2).max(100),
  initialRoles: z.array(RoleSchema).default(['GOVERNANCE_MEMBER']),
});

export const AssignRoleInputSchema = z.object({
  actorId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: RoleSchema,
});

export const SuspendMemberInputSchema = z.object({
  actorId: z.string().uuid(),
  memberId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});
