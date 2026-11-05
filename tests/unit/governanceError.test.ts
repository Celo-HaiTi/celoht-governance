import { describe, expect, it } from 'vitest';
import { Errors, GovernanceError } from '../../src/errors/GovernanceError.js';

describe('GovernanceError', () => {
  it('preserves the typed error fields and optional details', () => {
    const error = new GovernanceError('VALIDATION_ERROR', 'Invalid input', 422, { field: 'title' });

    expect(error).toMatchObject({
      name: 'GovernanceError',
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      httpStatus: 422,
      details: { field: 'title' },
    });
    expect(error).toBeInstanceOf(Error);
    expect(new GovernanceError('FORBIDDEN', 'Denied').details).toBeUndefined();
  });

  it('creates the expected typed errors for domain failures', () => {
    const errors = [
      Errors.unauthorized(),
      Errors.forbidden(),
      Errors.invalidTransition('DRAFT', 'EXECUTED'),
      Errors.proposalNotFound('proposal-1'),
      Errors.memberNotFound('member-1'),
      Errors.duplicateVote('member-1', 'proposal-1'),
      Errors.votingClosed('proposal-1'),
      Errors.votingNotOpen('proposal-1'),
      Errors.quorumNotReached('proposal-1'),
      Errors.thresholdNotMet('proposal-1'),
      Errors.proposalExpired('proposal-1'),
      Errors.alreadyExecuted('proposal-1'),
      Errors.executionNotQueued('proposal-1'),
      Errors.timelockNotElapsed('proposal-1', '2026-01-01T00:00:00.000Z'),
      Errors.selfApprovalForbidden(),
      Errors.invalidSignature(),
      Errors.signatureReplay(),
      Errors.signatureExpired(),
      Errors.chainIdMismatch(1, 2),
      Errors.missingConfiguration('SUPABASE_URL'),
      Errors.unverifiedContractAddress('governance'),
      Errors.executionVerificationFailed('receipt missing'),
      Errors.validation('Invalid proposal', { field: 'title' }),
      Errors.validation('Invalid proposal'),
    ];

    expect(errors).toHaveLength(24);
    expect(errors.every((error) => error instanceof GovernanceError)).toBe(true);
    expect(errors.map((error) => error.code)).toContain('MISSING_CONFIGURATION');
    expect(Errors.invalidTransition('DRAFT', 'EXECUTED').details).toEqual({ from: 'DRAFT', to: 'EXECUTED' });
    expect(Errors.chainIdMismatch(1, 2).details).toEqual({ expected: 1, actual: 2 });
  });
});