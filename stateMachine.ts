import type { ProposalStatus } from './types.js';
import { Errors } from '../errors/GovernanceError.js';

/**
 * The single authoritative definition of legal proposal state
 * transitions. Every service that mutates a proposal's status MUST
 * call `assertTransition` first — there is no other sanctioned path
 * to changing `status`.
 *
 * DRAFT -> SUBMITTED -> UNDER_REVIEW -> ACTIVE -> VOTING ->
 * QUORUM_REACHED -> APPROVED|REJECTED -> QUEUED -> EXECUTED|CANCELLED|EXPIRED
 *
 * CANCELLED and EXPIRED are reachable from multiple states, per the
 * transition table below — nowhere else.
 */
const TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ACTIVE', 'REJECTED', 'CANCELLED'],
  ACTIVE: ['VOTING', 'CANCELLED', 'EXPIRED'],
  VOTING: ['QUORUM_REACHED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  QUORUM_REACHED: ['APPROVED', 'REJECTED'],
  APPROVED: ['QUEUED', 'EXPIRED'],
  REJECTED: [],
  QUEUED: ['EXECUTED', 'CANCELLED', 'EXPIRED'],
  EXECUTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function isValidTransition(from: ProposalStatus, to: ProposalStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Throws GovernanceError('INVALID_STATE_TRANSITION') if the transition
 * is not permitted. Callers must not catch-and-ignore this — an
 * invalid transition indicates either a bug or a manipulation attempt,
 * both of which must be visible (and audited) rather than swallowed.
 */
export function assertTransition(from: ProposalStatus, to: ProposalStatus): void {
  if (!isValidTransition(from, to)) {
    throw Errors.invalidTransition(from, to);
  }
}

export function isTerminal(status: ProposalStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
