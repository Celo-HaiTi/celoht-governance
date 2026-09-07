# VOTING

## Eligibility

A member may vote if and only if `status == 'ACTIVE'` and they hold a
role granting the `VOTE_CAST` capability (currently every defined
role except none — see `ROLES_AND_PERMISSIONS.md`). Eligibility is
computed at vote-cast time, not cached.

## Model: one-member-one-vote

`votingPower` is fixed at `1` per active member. This is an explicit
design decision, not a placeholder — see `NO_TOKEN_POLICY.md`.
Changing it requires a `GOVERNANCE_CHANGE` proposal.

## Quorum

`quorumRequired = ceil(eligibleMemberCount * quorumBps / 10000)`.
Quorum is reached when `votesFor + votesAgainst + votesAbstain >=
quorumRequired`. Computed by `VotingService.computeQuorum`, which
persists an immutable snapshot to `governance_quorum_snapshots`.

## Approval threshold

`thresholdMet` when `votesFor / (votesFor + votesAgainst) >=
approvalThresholdBps / 10000`. Abstentions count toward quorum but not
toward the threshold denominator.

## Duplicate-vote prevention

Enforced twice: application-level (`VoteRepository.findByProposalAndMember`)
and database-level (`UNIQUE(proposal_id, member_id) WHERE invalidated
= false`). A member may not simply invalidate-and-recast to change
their vote unless invalidation is performed by someone holding
`VOTE_INVALIDATE` (not the voter themselves, by default policy).

## Vote modification / cancellation

There is no direct "edit my vote" operation. A cast vote can only be
marked `invalidated` by an actor with `VOTE_INVALIDATE`, with a
required reason, which is audited. This is intentional: it keeps the
historical record of what was cast, by whom, and why it was later
invalidated, rather than allowing silent overwrites.

## Voting period / expiration

`votingEndsAt` is fixed when voting opens (`activateForVoting`).
Attempting to vote after `votingEndsAt` raises `VOTING_CLOSED` even if
the proposal's `status` has not yet been transitioned to `EXPIRED` by
a scheduled job — the time check is authoritative, not just the
stored status.

## Wallet-based (signed) voting

If a client submits a `signature` payload with a vote, it is verified
via `src/security/signature.ts` before the vote is accepted:
recovered signer must match the claimed member, `chainId` and
`domain` must match configuration, and the `nonce` must not have been
used before (replay protection). A wallet address alone, with no
valid signature, is never accepted as authorization.
