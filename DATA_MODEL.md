# DATA MODEL

Workflow DDL proposal: `migrations/0013_governance_workflow.sql`. It is not
proof that these tables have been applied to the canonical Supabase project.
Summary of the schema in that migration:

| Table | Purpose | Notable constraints |
|---|---|---|
| `governance_workflows` | Proposal workflow state | status/type checks, voting and queue window checks |
| `governance_workflow_members` | Governance identity and roles | unique auth user and wallet; status check |
| `governance_workflow_votes` | Individual votes | one active vote per proposal/member; voting power fixed at one |
| `governance_workflow_quorum_snapshots` | Point-in-time quorum computation | nonnegative counts; proposal foreign key |
| `governance_workflow_idempotency` | Mutation idempotency records | key length and expiry checks |
| `governance_workflow_audit_logs` | Append-only audit trail | trigger rejects UPDATE/DELETE |
| `governance_workflow_executions` | Verified execution records | unique proposal and transaction hash; hash/status/chain checks |

## Design choices

- UUIDs are used for workflow/member references; database defaults generate
  IDs for votes, quorum snapshots, audit logs, and execution records.
- Duplicate-vote prevention and append-only audit logging are enforced
  at the database level, not only in application code — defense in
  depth against a bug or a compromised application server.
- Execution target details are carried in workflow metadata and checked by the
  application execution verifier. The database schema alone cannot verify a
  real deployment or transaction.

## Not yet implemented

Row-level security (RLS) policies for Supabase are recommended if this
schema is deployed on Supabase directly, but are not included here
since they depend on the real auth/session model `celoht-backend`
uses — see `PRODUCTION_READINESS_REPORT.md`.
