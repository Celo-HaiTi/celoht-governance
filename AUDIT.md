# AUDIT

## Guarantee

`governance_audit_logs` is append-only, enforced by a PostgreSQL
trigger that rejects `UPDATE` and `DELETE` outright (see the
migration). The application layer never exposes an update/delete
operation for audit entries — `AuditRepository` only has `append` and
`listByTarget`.

## Schema

`id`, `actor_id` (nullable — null only for system/scheduled events
like auto-expiry), `event_type`, `target_entity`, `target_id`,
`timestamp`, `metadata` (jsonb), `correlation_id`, `resulting_state`.

## Events that must be audited (non-exhaustive; add, never remove)

Member: created, activated, suspended, removed, role assigned, role
revoked.
Proposal: created, submitted, under review, voting opened, approved,
rejected, queued, executed, cancelled, expired.
Voting: vote cast, vote invalidated, quorum snapshot taken.
Treasury: execution recorded.
Emergency: triggered.

## What must never appear in metadata

Private keys, seed phrases, passwords, API secrets, Supabase
service-role keys, authentication tokens, or raw sensitive identity
information. `AuditService.record` strips a known set of
secret-shaped keys as defense in depth, but callers must not rely on
that as the primary control — never pass secrets into `metadata` in
the first place.

## Correlation IDs

Every audit call requires a `correlationId`, intended to match the
request/trace ID from the API layer, so a single user-facing action
(e.g. "approve this proposal") can be reconstructed across every audit
row it produced.
