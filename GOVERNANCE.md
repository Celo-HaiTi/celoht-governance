# GOVERNANCE

## Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → ACTIVE → VOTING → QUORUM_REACHED
  → APPROVED → QUEUED → EXECUTED
                 ↓            ↓        ↓
             REJECTED    CANCELLED  EXPIRED   (all terminal)
```

Authoritative transition table: `src/domain/stateMachine.ts`. Every
transition requires an authenticated, authorized actor
(`src/security/rbac.ts`), is timestamped, and produces an audit record
(`AUDIT.md`). `assertNotSelfActing` additionally blocks a proposer from
being the actor on review/approve/reject/queue/execute for their own
proposal, regardless of what roles they separately hold.

## Proposal Types

`POLICY_CHANGE`, `GOVERNANCE_CHANGE`, `TREASURY_ACTION`,
`COMMUNITY_FUNDING`, `PROGRAM_CHANGE`, `AGENT_NETWORK_CHANGE`,
`REFORESTATION_ACTION`, `EDUCATION_PROGRAM_CHANGE`,
`EMERGENCY_ACTION`. Adding a new type is a non-breaking, additive
change to the `proposal_type` enum in both `src/domain/types.ts` and
`migrations/*.sql` — existing proposals are unaffected.

## Idempotency

State-changing operations are idempotent where the domain allows it:
re-invoking `recordExecution` on an already-executed proposal is a
no-op that raises `ALREADY_EXECUTED` rather than executing twice or
silently succeeding a second time.

## Versioning

Every proposal stores the `governanceVersion` it was created under.
Changing default quorum/threshold/voting-period values requires a new
row in `governance_settings`, not an in-place update to defaults —
historical proposals remain interpretable under the rules that existed
when they were created.
