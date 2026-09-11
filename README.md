# CeloHT Governance

The canonical, community-governed rules and reference implementation for
CeloHT's governance layer: proposal lifecycle, voting, membership,
role-based access control, treasury-approval flow, and audit logging.

CeloHT is an open-source Haitian Web3 initiative on Celo focused on
financial inclusion, blockchain education, digital payments,
entrepreneurship, community development, agent networks, and
reforestation. This repository defines **how decisions get made** —
not any single application's admin panel.

> **Status: implementation synchronized with the public CeloHT architecture; deployment remains blocked until runtime infrastructure is configured.**
> See [`PRODUCTION_READINESS_REPORT.md`](./PRODUCTION_READINESS_REPORT.md)
> for exactly what is implemented, what is verified, and what remains
> blocked on runtime infrastructure. The public CeloHT repositories were
> inspected and the synchronization baseline is documented under `docs/`.

## Why this exists

Founder status does not equal unrestricted governance authority.
Administrative access does not equal treasury ownership. This
repository makes those boundaries explicit, machine-enforced, and
auditable rather than relying on trust or convention.

## Core principles

Community governance · transparency · accountability · least privilege
· separation of duties · auditability · deterministic rules · secure
authorization · fail-closed behavior · no unilateral treasury control ·
no hidden administrative powers · reproducible decision-making ·
on-chain verifiability where appropriate · abuse resistance · clear
emergency procedures.

See [`GOVERNANCE_CONSTITUTION.md`](./GOVERNANCE_CONSTITUTION.md) for
the full, versioned articulation of these.

## Repository layout

```
src/
  domain/          proposal + vote types, the proposal state machine
  application/      services: proposals, voting, audit (business rules only)
  security/         RBAC/least-privilege matrix, signature verification
  schemas/           zod input/output schemas for every backend operation
  infrastructure/    env validation, Supabase adapters, verified Celo execution
  api/               dependency-injected HTTP boundary and safe JSON errors
  errors/            typed GovernanceError hierarchy
migrations/          PostgreSQL/Supabase schema (append-only audit log, DB-level
                     duplicate-vote prevention, check constraints)
tests/
  unit/               state machine + RBAC invariants
  integration/         service-level tests against explicit test doubles
  security/            authorization, self-approval, replay/double-execution
.github/workflows/    CI and CodeQL analysis
*.md                 governance, architecture, operations, and policy docs
docs/                integration, audit, and production-reference docs
```

## Governance lifecycle (enforced, not just documented)

```
DRAFT → SUBMITTED → UNDER_REVIEW → ACTIVE → VOTING → QUORUM_REACHED
  → APPROVED|REJECTED → QUEUED → EXECUTED|CANCELLED|EXPIRED
```

Every transition is checked against `src/domain/stateMachine.ts` —
there is no code path that mutates `proposal.status` without going
through `assertTransition`. See [`GOVERNANCE.md`](./GOVERNANCE.md).

## No token, no speculation

CeloHT uses one-member-one-vote. `USDm` and `CELO` are referenced only
as a stablecoin and gas asset, never as governance tokens. See
[`NO_TOKEN_POLICY.md`](./NO_TOKEN_POLICY.md).

## Documentation index

| File | Covers |
|---|---|
| [GOVERNANCE.md](./GOVERNANCE.md) | Lifecycle, proposal types, state machine |
| [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md) | Formal, versioned constitution |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, module boundaries |
| [SECURITY.md](./SECURITY.md) | Security model, protections implemented |
| [THREAT_MODEL.md](./THREAT_MODEL.md) | Threats considered and mitigations |
| [TREASURY_GOVERNANCE.md](./TREASURY_GOVERNANCE.md) | Proposal → execution flow, multisig boundary |
| [VOTING.md](./VOTING.md) | Eligibility, quorum, thresholds, replay protection |
| [PROPOSALS.md](./PROPOSALS.md) | Proposal schema and types |
| [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md) | RBAC matrix |
| [EMERGENCY_GOVERNANCE.md](./EMERGENCY_GOVERNANCE.md) | Emergency powers and limits |
| [AUDIT.md](./AUDIT.md) | Audit log schema and guarantees |
| [API.md](./API.md) | Backend contract (createProposal, castVote, etc.) |
| [DATA_MODEL.md](./DATA_MODEL.md) | Database schema |
| [INTEGRATION.md](./INTEGRATION.md) | How celoht-admin/backend/dApp should integrate |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment requirements and readiness gates |
| [OPERATIONS.md](./OPERATIONS.md) | Runbooks, monitoring, incident response |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Community standards |
| [NO_TOKEN_POLICY.md](./NO_TOKEN_POLICY.md) | Explicit no-token, no-tokenomics policy |
| [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) | Honest IMPLEMENTED/BLOCKED status |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

## Integrating this into the CeloHT codebase

The public `Celo-HaiTi` repositories have been inspected. The following
rules remain mandatory before deployment:

1. Review and apply `migrations/0013_governance_workflow.sql` as migration
  `0013` through the canonical `celoht-supabase` process; do not edit applied
  migrations.
2. Keep `celoht-backend` as the authentication/API boundary and
  `celoht-indexer` as the owner of on-chain projections.
3. Run `npm run validate:contracts -- /path/to/celoSepolia.json` against the
  canonical deployment artifact.
4. Inject real Supabase, auth, RPC, and Safe runtime configuration; missing
  values must remain fail-closed.

## Getting started (once wired to real infrastructure)

```bash
npm install
cp .env.example .env   # then fill with real, non-production-secret values for local dev
npm run typecheck
npm run lint
npm test
```

## License

Apache-2.0 — see [LICENSE](./LICENSE).
