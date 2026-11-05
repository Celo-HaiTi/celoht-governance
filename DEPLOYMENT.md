# DEPLOYMENT

## Required infrastructure (none of which is provisioned by this repo)

- A PostgreSQL database (Supabase or otherwise) to run
  the reviewed governance workflow migration against.
- A Celo Sepolia RPC endpoint. This repository supports Celo Sepolia
  only; Mainnet is not an allowed deployment target.
- The verified Celo Sepolia governance contract, USDm token, and treasury
  Safe addresses, injected through the runtime environment — never invented.
- A secret manager for `SUPABASE_SERVICE_ROLE_KEY` and any signing
  credentials (never in `.env` files committed to the repo).

## Environment variables

See `.env.example` for the full list and `src/infrastructure/env.ts`
for validation rules. Production additionally requires
`GOVERNANCE_CONTRACT_ADDRESS`, `TREASURY_MULTISIG_ADDRESS`, and
`USDM_TOKEN_ADDRESS` to match the verified Celo Sepolia deployment.
`loadEnv()` refuses to start otherwise. The execution delay is persistent
service state; no separate timelock contract address is configured.

## Migrations

`migrations/0013_governance_workflow.sql` is a migration proposal, not proof
that the canonical Supabase schema contains these tables. Review it against
the actual `celoht-supabase` migration history and apply it through that
repository's migration process as the next available migration number. Never
edit an already-applied migration or apply this proposal directly to a
production database without authorization. This repository does not bundle a
migration runner.

## Status legend used throughout this doc set

- **IMPLEMENTED** — code exists in this repository.
- **CONFIGURED** — a configuration surface exists (e.g. `.env.example`
  variable) but requires real values to function.
- **VERIFIED** — implemented AND confirmed working against real
  infrastructure (none of this repository's code has been verified
  against a live database or chain — see
  `PRODUCTION_READINESS_REPORT.md`).
- **NOT YET AVAILABLE** — no code path exists yet.

## Rollback / disaster recovery

Not yet documented — depends on the hosting choice (Supabase branching
vs. self-hosted Postgres point-in-time recovery) which was not
available to inspect. Flagged in
`PRODUCTION_READINESS_REPORT.md` as `BLOCKED BY EXTERNAL DEPENDENCY`.
