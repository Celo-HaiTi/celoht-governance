# SECURITY

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Open a
private security advisory on the `Celo-HaiTi/celoht-governance`
GitHub repository (Security tab → "Report a vulnerability"), or
contact the maintainers through whatever private channel the CeloHT
organization designates in its top-level org profile. Include
reproduction steps and affected version (`GOVERNANCE_VERSION`).

## What is implemented in this repository

- **RBAC / least privilege** — `src/security/rbac.ts`, tested in
  `tests/unit/rbac.test.ts`.
- **Self-approval prevention** — `assertNotSelfActing`, tested in
  `tests/security/authorization.test.ts`.
- **State-machine enforcement** — no code path mutates
  `proposal.status` without `assertTransition`.
- **Duplicate-vote prevention** — enforced at both the application
  layer and the database layer (unique partial index).
- **Fail-closed configuration** — `src/infrastructure/config/env.ts`
  refuses to start rather than substitute development defaults in
  production, and refuses to start production without verified
  contract addresses.
- **No invented contract addresses** — `Errors.unverifiedContractAddress`
  exists specifically so infrastructure code has a sanctioned way to
  refuse rather than fabricate an address.
- **Signature verification contract** for wallet-based voting
  (`src/security/signature.ts`) covering signer recovery, chain ID,
  domain, and nonce replay — implemented as an interface plus a
  reference `Eip712SignatureVerifier` that delegates actual
  cryptographic recovery to an injected, established library rather
  than implementing its own crypto.
- **Append-only audit log** — enforced by a PostgreSQL trigger
  (`migrations/001_init_governance_schema.sql`), not just application
  discipline.
- **Secret-shaped key stripping** in audit metadata
  (`AuditService.record`) as defense in depth.

## What this repository does NOT implement (see THREAT_MODEL.md / PRODUCTION_READINESS_REPORT.md)

- Actual network transport / HTTP layer (no server is included — this
  is the domain + application + data layer, meant to be mounted by
  `celoht-backend`).
- A real Supabase/Postgres adapter (the `*Repository` interfaces are
  defined; concrete implementations are not, since no real database
  credentials or existing schema were available).
- Rate limiting, WAF-level protections, or DDoS mitigation — these
  belong at the API gateway / infrastructure layer, not in this
  domain library.
- Multisig / on-chain contract code — this repo governs the *decision*
  to execute, not the execution mechanics themselves.

## Secure defaults

- Every capability check defaults to deny; there is no "if role
  unknown, allow" branch anywhere in `rbac.ts`.
- Environment validation defaults to refusing to start rather than
  running with partial configuration.
- `.gitignore` blocks common secret file patterns; see
  `.env.example` for what must never be committed.
