# ROLES AND PERMISSIONS

Single source of truth: `src/security/rbac.ts::ROLE_CAPABILITIES`.
This table must never drift from that file — if you're updating one,
update both in the same change.

| Role | Capabilities |
|---|---|
| `GOVERNANCE_MEMBER` | `VOTE_CAST` |
| `PROPOSER` | `PROPOSAL_CREATE`, `PROPOSAL_CANCEL_OWN`, `VOTE_CAST` |
| `REVIEWER` | `PROPOSAL_REVIEW`, `VOTE_CAST` |
| `GOVERNANCE_ADMIN` | `PROPOSAL_CANCEL_ANY`, `PROPOSAL_APPROVE`, `PROPOSAL_REJECT`, `PROPOSAL_QUEUE`, `MEMBER_MANAGE`, `ROLE_ASSIGN`, `VOTE_CAST` |
| `TREASURY_AUTHORIZER` | `TREASURY_AUTHORIZE`, `PROPOSAL_EXECUTE` |
| `EMERGENCY_ROLE` | `EMERGENCY_TRIGGER` |
| `AUDITOR` | `AUDIT_READ` |

## Design notes

- **No implicit escalation.** A member with multiple roles gets the
  union of those roles' capabilities — nothing more. There is no
  "super-admin" role with every capability.
- **Separation of duties, concretely:** `GOVERNANCE_ADMIN` cannot
  authorize or execute treasury actions. `TREASURY_AUTHORIZER` cannot
  manage members or assign roles. `EMERGENCY_ROLE` grants only
  `EMERGENCY_TRIGGER` — it does not fold in admin or treasury
  capabilities.
- **Suspended members have zero capabilities**, regardless of roles
  held, enforced in `hasCapability` before the role lookup even runs.
- **Self-approval is blocked structurally**, not just by role design:
  `assertNotSelfActing(actorId, proposal.proposerId)` runs in every
  service method that reviews, approves, rejects, queues, or executes
  a proposal — even for actors who do hold the relevant capability.

## Changing this matrix

Any change to `ROLE_CAPABILITIES` is a security-relevant change and
should go through review with the same scrutiny as a
`GOVERNANCE_CHANGE` proposal, even though the code itself lives in
this repo rather than on-chain.
