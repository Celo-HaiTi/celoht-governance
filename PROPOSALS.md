# PROPOSALS

## Schema

See `src/domain/types.ts::Proposal` and
`src/schemas/proposal.schema.ts` for the runtime-validated input
shapes. Key fields: `id`, `title`, `description`, `proposerId`,
`proposalType`, `status`, `governanceVersion`, `createdAt`,
`submittedAt`, `votingStartsAt`/`votingEndsAt`, `quorumBps`,
`approvalThresholdBps`, `executionDelaySeconds`, `executionStatus`,
`queuedAt`/`executableAt`/`executedAt`, `cancellationReason`,
`rejectionReason`, `metadata`, `updatedAt`.

## Proposal actions

What a proposal actually *does* if executed (a treasury transfer's
parameters, a policy text diff, a program's new parameters) is stored
separately in `governance_proposal_actions`, keyed to the proposal.
This keeps the governance decision record independent from the
executable payload, so changing how an action is encoded doesn't
require changing the proposal schema.

## Extensibility

`proposalType` is an open enum by design (Section 6 of the original
build spec) — new types are additive. Do not hardcode assumptions
elsewhere in the codebase that only `TREASURY_ACTION` proposals can
reference `governance_proposal_actions`; any type may, if it has an
executable payload.

## Validation

All proposal-mutating inputs are validated with `zod` schemas before
reaching application services (`CreateProposalInputSchema`,
`RejectProposalInputSchema`, etc.), rejecting malformed input at the
boundary rather than deep inside business logic.
