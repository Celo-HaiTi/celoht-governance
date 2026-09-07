# INTEGRATION

## With celoht-backend

Import the services in `src/application/` directly (or via a published
package once this repo has a release), implement the repository
interfaces in `src/application/ports.ts` against the real database,
and expose the operations in `API.md` over whatever transport the
backend uses. This repository is the source of truth for governance
*rules*; `celoht-backend` owns request handling, auth session
resolution, and infrastructure wiring.

## With celoht-admin

`celoht-admin` should be a thin operational UI over the `API.md`
contract: proposal management, voting oversight, membership/role
management, execution queue, treasury governance views, audit log
viewer, and emergency controls. Per the original governance
requirement: **celoht-admin must never be the source of governance
truth** — it must not maintain its own copy of proposal state, role
assignments, or audit records; it reads and writes through the API
contract only.

## With the CeloHT dApp

The dApp consumes the public subset of `API.md` (proposal discovery,
details, eligibility status, voting, results, history, execution
status) and must never be given direct database credentials — all
writes go through server-mediated, authorization-checked endpoints.

## Repositories referenced but not inspected

This build was produced without GitHub access to the `Celo-HaiTi`
organization, so no assumptions are made here about the *actual*
current state of `celoht-admin`, `celoht-backend`, a dApp repo, or any
education/agent/reforestation/treasury repositories beyond their
names as given in the original brief. Anyone integrating this should
replace placeholder assumptions (e.g. table names, enum values) with
whatever those repositories already use, rather than assuming this
repo's naming wins by default.
