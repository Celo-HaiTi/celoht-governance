# DATA MODEL

Full DDL: `migrations/001_init_governance_schema.sql`. Summary:

| Table | Purpose | Notable constraints |
|---|---|---|
| `governance_roles` | Reference list of roles | seeded, primary key `role` |
| `governance_permissions` | Role → capability mapping (mirrors `rbac.ts`) | composite PK |
| `governance_members` | Membership + status | `status` check constraint |
| `governance_member_roles` | Many-to-many member↔role | composite PK, FK cascade |
| `governance_proposals` | The proposal record | `status`/`proposal_type` check constraints, voting-window check |
| `governance_proposal_actions` | Executable payload for a proposal | separate audit trail from the proposal itself |
| `governance_votes` | Individual votes | **unique partial index** `(proposal_id, member_id) WHERE invalidated = false` |
| `governance_quorum_snapshots` | Immutable point-in-time quorum computation | insert-only by convention |
| `governance_timelocks` | Queued-proposal timelock tracking | PK is `proposal_id` |
| `governance_executions` | Execution records | `execution_tx_hash` format check + uniqueness |
| `governance_audit_logs` | Append-only audit trail | **trigger rejects UPDATE/DELETE** |
| `governance_settings` | Versioned governance parameters | PK is `version` |

## Design choices

- UUIDs (`gen_random_uuid()` via `pgcrypto`) throughout for
  cross-service uniqueness without coordination.
- Duplicate-vote prevention and append-only audit logging are enforced
  at the database level, not only in application code — defense in
  depth against a bug or a compromised application server.
- `governance_proposal_actions.target_contract_address` is nullable
  and unconstrained at the DB level by design: the *application*
  layer (via `env.ts` / verified config) is responsible for ensuring
  only verified addresses are ever written here. The DB schema alone
  cannot verify a real deployment.

## Not yet implemented

Row-level security (RLS) policies for Supabase are recommended if this
schema is deployed on Supabase directly, but are not included here
since they depend on the real auth/session model `celoht-backend`
uses — see `PRODUCTION_READINESS_REPORT.md`.
