/**
 * Typed error hierarchy for the governance domain.
 * All governance failures must throw one of these — never a bare
 * Error/string — so callers (API layer, tests) can branch on `.code`
 * instead of parsing messages.
 */

export type GovernanceErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_STATE_TRANSITION'
  | 'PROPOSAL_NOT_FOUND'
  | 'MEMBER_NOT_FOUND'
  | 'DUPLICATE_VOTE'
  | 'VOTING_CLOSED'
  | 'VOTING_NOT_OPEN'
  | 'QUORUM_NOT_REACHED'
  | 'THRESHOLD_NOT_MET'
  | 'PROPOSAL_EXPIRED'
  | 'ALREADY_EXECUTED'
  | 'EXECUTION_NOT_QUEUED'
  | 'TIMELOCK_NOT_ELAPSED'
  | 'SELF_APPROVAL_FORBIDDEN'
  | 'INVALID_SIGNATURE'
  | 'SIGNATURE_REPLAY'
  | 'SIGNATURE_EXPIRED'
  | 'CHAIN_ID_MISMATCH'
  | 'MISSING_CONFIGURATION'
  | 'UNVERIFIED_CONTRACT_ADDRESS'
  | 'EXECUTION_VERIFICATION_FAILED'
  | 'VALIDATION_ERROR';

export class GovernanceError extends Error {
  public readonly code: GovernanceErrorCode;
  public readonly httpStatus: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: GovernanceErrorCode,
    message: string,
    httpStatus = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GovernanceError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, GovernanceError.prototype);
  }
}

export const Errors = {
  unauthorized: (msg = 'Authentication required'): GovernanceError =>
    new GovernanceError('UNAUTHORIZED', msg, 401),
  forbidden: (msg = 'Not permitted to perform this action'): GovernanceError =>
    new GovernanceError('FORBIDDEN', msg, 403),
  invalidTransition: (from: string, to: string): GovernanceError =>
    new GovernanceError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition proposal from ${from} to ${to}`,
      409,
      { from, to },
    ),
  proposalNotFound: (id: string): GovernanceError =>
    new GovernanceError('PROPOSAL_NOT_FOUND', `Proposal ${id} not found`, 404),
  memberNotFound: (id: string): GovernanceError =>
    new GovernanceError('MEMBER_NOT_FOUND', `Member ${id} not found`, 404),
  duplicateVote: (memberId: string, proposalId: string): GovernanceError =>
    new GovernanceError(
      'DUPLICATE_VOTE',
      `Member ${memberId} has already voted on proposal ${proposalId}`,
      409,
    ),
  votingClosed: (proposalId: string): GovernanceError =>
    new GovernanceError('VOTING_CLOSED', `Voting is closed for proposal ${proposalId}`, 409),
  votingNotOpen: (proposalId: string): GovernanceError =>
    new GovernanceError('VOTING_NOT_OPEN', `Voting is not open for proposal ${proposalId}`, 409),
  quorumNotReached: (proposalId: string): GovernanceError =>
    new GovernanceError('QUORUM_NOT_REACHED', `Quorum not reached for proposal ${proposalId}`, 409),
  thresholdNotMet: (proposalId: string): GovernanceError =>
    new GovernanceError('THRESHOLD_NOT_MET', `Approval threshold not met for proposal ${proposalId}`, 409),
  proposalExpired: (proposalId: string): GovernanceError =>
    new GovernanceError('PROPOSAL_EXPIRED', `Proposal ${proposalId} has expired`, 409),
  alreadyExecuted: (proposalId: string): GovernanceError =>
    new GovernanceError('ALREADY_EXECUTED', `Proposal ${proposalId} was already executed`, 409),
  executionNotQueued: (proposalId: string): GovernanceError =>
    new GovernanceError('EXECUTION_NOT_QUEUED', `Proposal ${proposalId} is not queued for execution`, 409),
  timelockNotElapsed: (proposalId: string, availableAt: string): GovernanceError =>
    new GovernanceError(
      'TIMELOCK_NOT_ELAPSED',
      `Timelock for proposal ${proposalId} has not elapsed (available at ${availableAt})`,
      409,
      { availableAt },
    ),
  selfApprovalForbidden: (): GovernanceError =>
    new GovernanceError('SELF_APPROVAL_FORBIDDEN', 'A proposer cannot approve or vote to execute their own proposal in this role', 403),
  invalidSignature: (): GovernanceError =>
    new GovernanceError('INVALID_SIGNATURE', 'Signature verification failed', 401),
  signatureReplay: (): GovernanceError =>
    new GovernanceError('SIGNATURE_REPLAY', 'This signature/nonce has already been used', 409),
  signatureExpired: (): GovernanceError =>
    new GovernanceError('SIGNATURE_EXPIRED', 'The signed governance action has expired', 401),
  chainIdMismatch: (expected: number, actual: number): GovernanceError =>
    new GovernanceError('CHAIN_ID_MISMATCH', `Expected chain ${expected}, got ${actual}`, 400, { expected, actual }),
  missingConfiguration: (variable: string): GovernanceError =>
    new GovernanceError(
      'MISSING_CONFIGURATION',
      `Required configuration '${variable}' is missing. Failing closed rather than falling back to a default.`,
      500,
    ),
  unverifiedContractAddress: (name: string): GovernanceError =>
    new GovernanceError(
      'UNVERIFIED_CONTRACT_ADDRESS',
      `Contract address for '${name}' is not present in verified deployment configuration. Refusing to proceed with an unverified/invented address.`,
      500,
    ),
  executionVerificationFailed: (reason: string): GovernanceError =>
    new GovernanceError('EXECUTION_VERIFICATION_FAILED', reason, 422),
  validation: (msg: string, details?: Record<string, unknown>): GovernanceError =>
    new GovernanceError('VALIDATION_ERROR', msg, 422, details),
};
