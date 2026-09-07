# Changelog

All notable changes to this repository are documented here. Governance
*rule* changes must additionally bump `GOVERNANCE_VERSION` and be
reflected in `GOVERNANCE_CONSTITUTION.md`.

## [0.1.0] — Initial reference implementation

- Proposal state machine covering the full
  `DRAFT → ... → EXECUTED/CANCELLED/EXPIRED` lifecycle.
- RBAC with 7 roles and explicit least-privilege capability matrix.
- Voting service: one-member-one-vote, duplicate-vote prevention,
  quorum/threshold computation, signature-verification contract for
  wallet-based voting.
- Proposal service: full lifecycle transitions, self-approval
  prevention, timelock-gated execution recording.
- Append-only audit logging with DB-level trigger enforcement.
- PostgreSQL/Supabase schema with check constraints, unique partial
  indexes, and foreign keys.
- Full documentation set (constitution, security, threat model,
  treasury governance, emergency governance, API contract, data
  model, integration guide, deployment guide).
- Unit, integration, and security test suites (not executed in the
  generating environment — see `PRODUCTION_READINESS_REPORT.md`).
- GitHub Actions CI (lint, typecheck, test, CodeQL) and Dependabot
  configuration.

### Explicitly not included in 0.1.0

- HTTP/API server implementation.
- Concrete Supabase/Postgres repository adapters.
- Real deployed contract addresses (none were available to verify).
- Chain-verification logic for execution transaction hashes.
- Row-level security policies.
