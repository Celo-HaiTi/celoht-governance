# OPERATIONS

## Runbooks (to be expanded once deployed)

- **Proposal stuck in VOTING past `votingEndsAt`**: a scheduled job
  should call the equivalent of `expireProposal` — not included as a
  running service in this repo, since no job scheduler/infrastructure
  was specified. Until that job exists, `castVote` will still reject
  post-deadline votes via the time check, so the risk is limited to a
  stale `status` field rather than an invalid vote being accepted.
- **Emergency triggered**: confirm the triggering member holds
  `EMERGENCY_ROLE`, confirm the audit event was recorded, begin the
  mandatory post-event review per `EMERGENCY_GOVERNANCE.md`.

## Monitoring

Structured audit events (`AUDIT.md`) double as an operational event
stream — a monitoring pipeline can tail `governance_audit_logs` for
event types like `PROPOSAL_EXECUTED` or `EMERGENCY_TRIGGERED` and
alert accordingly. No dashboards or alerting rules are included in
this repository.

## Incident response

Any suspected exploitation of a governance invariant (e.g. an
unauthorized execution) should be treated as a security incident per
`SECURITY.md`'s reporting process, not filed as a normal bug.
