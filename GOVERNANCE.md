# Celo-HaiTi Governance

**Canonical policy:** This document is the canonical source for Celo-HaiTi
governance. `GOVERNANCE_CONSTITUTION.md` is a versioned implementation and
security reference and must remain consistent with this policy.

## Governing principle

Celo-HaiTi is governed through transparent, documented, community-driven
proposals and collective decision-making. No single individual, including the
Founder, may unilaterally establish, approve, reject, override, or represent a
proposal as an official Celo-HaiTi decision outside this documented process.

The Governance Council is Celo-HaiTi's highest ongoing collective
decision-making body. This describes the governance body's place in the model;
it does not create Council members, seats, or powers that have not been
formally established through this policy. The Council is not subordinate to the
Founder, a Director, maintainers, working groups, or any operational or
partnership function. Those roles may act only within their documented scope.

**Johnny Dubic — Permanently Recognized Founder of Celo-HaiTi.** Johnny Dubic is
permanently recognized as the Founder of Celo-HaiTi in the project's historical and
institutional record. Permanent
founder recognition is historical and institutional; it does not confer
perpetual governance authority, ownership rights, veto power, or unilateral
control. Founder status does not automatically confer executive authority, a
Governance Council seat or vote, emergency powers, repository ownership, or any
other special governance privilege. Founder status is separate from ongoing
governance authority.

An individual may submit a proposal and participate in deliberation, but a
proposal is not an official decision. The required conceptual sequence is:

```
IDEA → PROPOSAL → PUBLIC REVIEW / DELIBERATION → COLLECTIVE DECISION PROCESS
→ APPROVAL / REJECTION → DOCUMENTED OUTCOME → IMPLEMENTATION
```

The Founder, Council members, maintainers, working-group members, contributors,
and community members are subject to the same documented process. A Governance
Council may only exercise authority expressly granted by this policy. Unless
formally constituted and documented through this process, the Council is
pending formation; no members or seats are implied.

## Participation and decision record

1. **Who may submit:** An active member with the `PROPOSER` capability may
  create a proposal. The Founder may propose under the same rule.
2. **Submission:** The proposer creates a validated proposal in `DRAFT` and
  submits it through the governance workflow.
3. **Publication:** Proposals, status transitions, votes, quorum snapshots,
  and execution records are published through the approved Celo-HaiTi governance
  record/API and retained in the audit log.
4. **Review and deliberation:** An eligible reviewer other than the proposer
  moves the proposal through review and opens voting where appropriate.
  Community discussion must be reflected in the documented record.
5. **Approval:** The implemented defaults are 20% quorum and a 50% approval
  threshold of decisive votes; proposal-specific values are recorded at
  creation. Changes require a documented governance change. Any rule not
  established by this policy or a formally adopted amendment is **To Be
  Established**, not inferred.
6. **Recording:** The result, rationale, participants, conflicts, quorum,
  threshold calculation, and final status are recorded. A proposal remains a
  proposal until the required transition and collective outcome are complete.
7. **Conflicts:** Participants must disclose relevant conflicts and must not
  self-approve, self-reject, self-queue, or self-execute their own proposal.
8. **Implementation:** Only an approved and queued proposal may be implemented,
  subject to the documented timelock, authorization, execution verification,
  and audit requirements. Rejection is also a documented outcome.

There is no Celo-HaiTi governance token. Governance is not token-weighted, and
USDm and CELO are not governance voting assets.

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
