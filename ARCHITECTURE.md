# ARCHITECTURE

## Layering

```
schemas/         zod input/output validation — the outer boundary
application/     services: orchestrate domain + repositories, own transactions
domain/          pure business rules: types, state machine — no I/O, no framework
security/        RBAC + signature verification — pure functions where possible
infrastructure/  env config now; DB/blockchain adapters implement application/ports.ts
errors/          typed GovernanceError hierarchy shared across all layers
```

`domain/` has zero dependencies on `infrastructure/` or external
libraries (besides its own types) — it is safe to unit test without a
database. `application/` depends only on the *interfaces* in
`application/ports.ts`, never on a concrete database client, so
`tests/integration/fakes.ts` can supply in-memory implementations.

## Why no HTTP server is included

This repository is the **governance contract and reference logic**,
meant to be imported by `celoht-backend` (or an equivalent service)
which owns the actual transport (REST/GraphQL), authentication
middleware, and real database connection. Shipping an opinionated
server here would risk conflicting with `celoht-backend`'s existing
framework choices — better to define the contract precisely (`API.md`)
and let the backend mount it.

## Extending safely

- New proposal type → add to the enum in `domain/types.ts`,
  `schemas/proposal.schema.ts`, and the DB check constraint. No
  service logic changes required unless the type needs unique
  execution handling.
- New role → add to `domain/types.ts::Role`, `rbac.ts`, and
  `governance_roles` seed data. Never grant a new role capabilities by
  editing an existing role's array as a shortcut — define explicit
  capabilities for the new role.
- New repository backend (e.g. swapping Supabase for something else)
  → implement `application/ports.ts` interfaces; no service code
  changes needed.
