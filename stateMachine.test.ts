import { describe, expect, it } from 'vitest';
import { assertTransition, isTerminal, isValidTransition } from '../../src/domain/stateMachine.js';
import { GovernanceError } from '../../src/errors/GovernanceError.js';

describe('proposal state machine', () => {
  it('allows the canonical happy-path sequence', () => {
    const path = [
      'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTIVE', 'VOTING',
      'QUORUM_REACHED', 'APPROVED', 'QUEUED', 'EXECUTED',
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('rejects skipping states (e.g. DRAFT -> VOTING)', () => {
    expect(isValidTransition('DRAFT', 'VOTING')).toBe(false);
    expect(() => assertTransition('DRAFT', 'VOTING')).toThrow(GovernanceError);
  });

  it('a REJECTED proposal cannot execute (invariant)', () => {
    expect(isValidTransition('REJECTED', 'EXECUTED')).toBe(false);
    expect(isTerminal('REJECTED')).toBe(true);
  });

  it('an EXPIRED proposal cannot execute (invariant)', () => {
    expect(isValidTransition('EXPIRED', 'EXECUTED')).toBe(false);
    expect(isTerminal('EXPIRED')).toBe(true);
  });

  it('an EXECUTED proposal cannot be executed again (terminal)', () => {
    expect(isTerminal('EXECUTED')).toBe(true);
    expect(isValidTransition('EXECUTED', 'EXECUTED')).toBe(false);
  });

  it('CANCELLED and EXPIRED are terminal', () => {
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('EXPIRED')).toBe(true);
  });

  it('rejects an unknown/garbage target state', () => {
    // @ts-expect-error intentional invalid input for the invariant test
    expect(isValidTransition('VOTING', 'NOT_A_REAL_STATE')).toBe(false);
  });
});
