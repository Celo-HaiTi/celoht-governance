# TREASURY GOVERNANCE

## The mandatory path

```
Proposal (TREASURY_ACTION)
  → Review           (REVIEWER, not the proposer)
  → Vote              (eligible ACTIVE members)
  → Quorum reached    (computeQuorum, immutable snapshot)
  → Approval          (GOVERNANCE_ADMIN, not the proposer)
  → Queue + Timelock   (executionDelaySeconds, set at proposal creation)
  → Authorized execution (TREASURY_AUTHORIZER / multisig — NOT GOVERNANCE_ADMIN)
  → On-chain execution  (outside this repo's process — the multisig/executor acts)
  → Verification        (recordExecution requires a well-formed tx hash;
                          real confirmation/verification is an infrastructure-layer
                          responsibility not yet implemented here)
  → Audit record        (PROPOSAL_EXECUTED event, append-only)
```

There is no code path from `APPROVED` directly to `EXECUTED` — the
state machine requires passing through `QUEUED`, and `recordExecution`
additionally checks that `executableAt` has passed.

## What this repository will never do

- Hold, generate, or use a private key.
- Invent or hardcode a "production" treasury or multisig address. If
  `TREASURY_MULTISIG_ADDRESS` is not present in verified configuration,
  `loadEnv()` refuses to start in production (fail closed).
- Let `GOVERNANCE_ADMIN` execute a treasury action — that capability
  belongs only to `TREASURY_AUTHORIZER` (see `ROLES_AND_PERMISSIONS.md`).
- Mark an execution successful without a syntactically valid
  transaction hash, and — once a real chain-verification adapter is
  built — without on-chain confirmation. See
  `PRODUCTION_READINESS_REPORT.md` for the current gap: **this
  repository does not yet verify the tx hash against the actual
  chain**; that adapter is `BLOCKED BY EXTERNAL DEPENDENCY` (a live
  RPC endpoint and deployed contracts).

## Who executes

Execution is performed by whatever authorized executor holds the
treasury multisig's signing authority (external to this repo, e.g. a
Gnosis Safe / Celo multisig). This repository's `recordExecution`
only *records the governance decision's outcome* once that external
execution has happened — it is a ledger entry, not the trigger for
the transfer itself.
