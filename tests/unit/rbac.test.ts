import { describe, expect, it } from 'vitest';
import { hasCapability, requireCapability, assertNotSelfActing } from '../../src/security/rbac.js';
import { GovernanceError } from '../../src/errors/GovernanceError.js';
import type { GovernanceMember } from '../../src/domain/types.js';

function member(roles: GovernanceMember['roles'], status: GovernanceMember['status'] = 'ACTIVE'): Pick<GovernanceMember, 'roles' | 'status'> {
  return { roles, status };
}

describe('RBAC / least privilege', () => {
  it('GOVERNANCE_MEMBER can vote but cannot approve proposals', () => {
    const m = member(['GOVERNANCE_MEMBER']);
    expect(hasCapability(m, 'VOTE_CAST')).toBe(true);
    expect(hasCapability(m, 'PROPOSAL_APPROVE')).toBe(false);
  });

  it('GOVERNANCE_ADMIN cannot authorize treasury actions (separation of duties)', () => {
    const admin = member(['GOVERNANCE_ADMIN']);
    expect(hasCapability(admin, 'TREASURY_AUTHORIZE')).toBe(false);
  });

  it('TREASURY_AUTHORIZER cannot assign roles or manage members', () => {
    const treasury = member(['TREASURY_AUTHORIZER']);
    expect(hasCapability(treasury, 'ROLE_ASSIGN')).toBe(false);
    expect(hasCapability(treasury, 'MEMBER_MANAGE')).toBe(false);
  });

  it('a suspended member has no capabilities regardless of assigned roles', () => {
    const suspended = member(['GOVERNANCE_ADMIN', 'TREASURY_AUTHORIZER'], 'SUSPENDED');
    expect(hasCapability(suspended, 'PROPOSAL_APPROVE')).toBe(false);
    expect(hasCapability(suspended, 'TREASURY_AUTHORIZE')).toBe(false);
  });

  it('requireCapability throws FORBIDDEN (not a generic error) when denied', () => {
    const m = member(['GOVERNANCE_MEMBER']);
    expect(() => requireCapability(m, 'PROPOSAL_APPROVE')).toThrow(GovernanceError);
    try {
      requireCapability(m, 'PROPOSAL_APPROVE');
    } catch (e) {
      expect((e as GovernanceError).code).toBe('FORBIDDEN');
    }
  });

  it('self-approval is forbidden: a proposer cannot act on their own proposal', () => {
    expect(() => assertNotSelfActing('member-1', 'member-1')).toThrow(GovernanceError);
    expect(() => assertNotSelfActing('member-1', 'member-2')).not.toThrow();
  });
});
