import type { GovernanceMember, Role } from '../domain/types.js';
import { Errors } from '../errors/GovernanceError.js';

/**
 * Explicit least-privilege permission matrix. A role grants ONLY the
 * capabilities listed here — there is no implicit "admin can do
 * everything" fallback. GOVERNANCE_ADMIN is deliberately NOT granted
 * TREASURY_AUTHORIZER or EMERGENCY_ROLE capabilities: those require
 * separate, explicitly-assigned roles (separation of duties, Section 9).
 */
export type Capability =
  | 'PROPOSAL_CREATE'
  | 'PROPOSAL_REVIEW'
  | 'PROPOSAL_CANCEL_OWN'
  | 'PROPOSAL_CANCEL_ANY'
  | 'VOTE_CAST'
  | 'VOTE_INVALIDATE'
  | 'PROPOSAL_APPROVE'
  | 'PROPOSAL_REJECT'
  | 'PROPOSAL_QUEUE'
  | 'PROPOSAL_EXECUTE'
  | 'TREASURY_AUTHORIZE'
  | 'MEMBER_MANAGE'
  | 'ROLE_ASSIGN'
  | 'EMERGENCY_TRIGGER'
  | 'AUDIT_READ';

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  GOVERNANCE_MEMBER: ['VOTE_CAST'],
  PROPOSER: ['PROPOSAL_CREATE', 'PROPOSAL_CANCEL_OWN', 'VOTE_CAST'],
  REVIEWER: ['PROPOSAL_REVIEW', 'VOTE_CAST'],
  GOVERNANCE_ADMIN: [
    'PROPOSAL_CANCEL_ANY',
    'PROPOSAL_APPROVE',
    'PROPOSAL_REJECT',
    'PROPOSAL_QUEUE',
    'MEMBER_MANAGE',
    'ROLE_ASSIGN',
    'VOTE_CAST',
  ],
  TREASURY_AUTHORIZER: ['TREASURY_AUTHORIZE', 'PROPOSAL_EXECUTE'],
  EMERGENCY_ROLE: ['EMERGENCY_TRIGGER'],
  AUDITOR: ['AUDIT_READ'],
};

export function capabilitiesFor(roles: Role[]): Set<Capability> {
  const caps = new Set<Capability>();
  for (const role of roles) {
    for (const cap of ROLE_CAPABILITIES[role]) caps.add(cap);
  }
  return caps;
}

export function hasCapability(member: Pick<GovernanceMember, 'roles' | 'status'>, capability: Capability): boolean {
  if (member.status !== 'ACTIVE') return false;
  return capabilitiesFor(member.roles).has(capability);
}

/**
 * Throws FORBIDDEN if the member lacks the capability. Fail-closed:
 * any error evaluating permissions must deny, never default-allow.
 */
export function requireCapability(
  member: Pick<GovernanceMember, 'roles' | 'status'>,
  capability: Capability,
): void {
  if (!hasCapability(member, capability)) {
    throw Errors.forbidden(`Missing required capability: ${capability}`);
  }
}

/**
 * Enforces "prevent self-approval where governance rules prohibit it"
 * (Section 9 / GOVERNANCE_CONSTITUTION.md §12). A proposer may never
 * be the actor that approves, rejects, queues, or executes their own
 * proposal, even if they separately hold a role with that capability.
 */
export function assertNotSelfActing(actorId: string, proposerId: string): void {
  if (actorId === proposerId) {
    throw Errors.selfApprovalForbidden();
  }
}
