# DEPLOYMENT

## Required infrastructure (none of which is provisioned by this repo)

- A PostgreSQL database (Supabase or otherwise) to run
  `migrations/001_init_governance_schema.sql` against.
- A Celo RPC endpoint (mainnet and/or testnet depending on
  environment).
- Deployed and verified governance/timelock contracts and a treasury
  multisig, with their addresses available as environment
  configuration — never invented.
- A secret manager for `SUPABASE_SERVICE_ROLE_KEY` and any signing
  credentials (never in `.env` files committed to the repo).

## Environment variables

See `.env.example` for the full list and `src/infrastructure/config/env.ts`
for validation rules. Production additionally requires
`GOVERNANCE_CONTRACT_ADDRESS`, `TIMELOCK_CONTRACT_ADDRESS`,
`TREASURY_MULTISIG_ADDRESS`, and `USDM_TOKEN_ADDRESS` to be present
and address-shaped — `loadEnv()` throws `MISSING_CONFIGURATION` and
refuses to start otherwise.

## Migrations

Run `migrations/001_init_governance_schema.sql` via your standard
migration tool (Supabase CLI, `psql`, or a migration framework of
`celoht-backend`'s choosing). This repo does not bundle a migration
runner to avoid conflicting with an existing one.

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
