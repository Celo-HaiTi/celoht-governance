# API (Backend Contract)

This defines the operations `celoht-backend` must expose, backed by
the services in `src/application/`. Input/output shapes are the zod
schemas in `src/schemas/` and the types in `src/domain/types.ts`.
The dependency-injected HTTP boundary is implemented in
`src/api/httpServer.ts` and is intended to be mounted by `celoht-backend`.
It does not create a competing login system or expose Supabase secrets.

| Operation | Input schema | Auth requirement | Notes |
|---|---|---|---|
| `createProposal` | `CreateProposalInputSchema` | `PROPOSAL_CREATE` | proposer must be `ACTIVE` |
| `submitProposal` | `SubmitProposalInputSchema` | must be the proposal's own proposer | `DRAFT` → `SUBMITTED` |
| `getProposal` | proposal id (uuid) | none (public) or `AUDIT_READ` for full history | read-only |
| `listProposals` | `ListProposalsQuerySchema` | none (public) | paginated via cursor |
| `castVote` | `CastVoteInputSchema` | `VOTE_CAST`, active member | duplicate/replay protected |
| `getVotes` | proposal id | none (public) or restricted per privacy policy | read-only |
| `getQuorum` | proposal id | none (public) | returns latest snapshot |
| `approveProposal` | actor + proposal id | `PROPOSAL_APPROVE`, not the proposer | requires `QUORUM_REACHED` |
| `rejectProposal` | `RejectProposalInputSchema` | `PROPOSAL_REJECT`, not the proposer | reason required |
| `queueProposal` | actor + proposal id | `PROPOSAL_QUEUE`, not the proposer | computes `executableAt` |
| `executeProposal` | `ExecuteProposalInputSchema` | `PROPOSAL_EXECUTE`, not the proposer | requires elapsed timelock |
| `cancelProposal` | `CancelProposalInputSchema` | `PROPOSAL_CANCEL_OWN` (proposer) or `PROPOSAL_CANCEL_ANY` | reason required |
| `getGovernanceMember` | member id | none (public, limited fields) or self | privacy-by-design |
| `getGovernancePermissions` | member id | self or `MEMBER_MANAGE` | returns resolved capability set |
| `getAuditLog` | target entity + id | `AUDIT_READ` | append-only, paginated |

## Error contract

Every error thrown by the application layer is a `GovernanceError`
with a stable `code` (see `src/errors/GovernanceError.ts`) and an
`httpStatus` the transport layer can map directly — clients should
branch on `code`, never on the human-readable `message`.

## Frontend / dApp access

Per Section 19 of the original spec, frontend clients (dApp) must not
be given direct database credentials. All access goes through this
API contract so privileged operations stay server-mediated.

## HTTP routes

All mutation routes require the backend-authenticated actor and an
`Idempotency-Key`. Actor/member IDs are resolved from the verified backend
identity and are never trusted from request bodies.

| Method | Path | Operation |
|---|---|---|
| GET | `/health` | Lightweight health response |
| GET | `/ready` | Fail-closed configuration/readiness response |
| GET | `/api/v1/governance/proposals` | List workflow proposals |
| GET | `/api/v1/governance/proposals/:id` | Read one proposal |
| POST | `/api/v1/governance/proposals` | Create draft |
| POST | `/api/v1/governance/proposals/:id/submit` | Submit |
| POST | `/api/v1/governance/proposals/:id/review` | Begin review |
| POST | `/api/v1/governance/proposals/:id/activate` | Open voting |
| POST | `/api/v1/governance/proposals/:id/vote` | Cast one vote |
| POST | `/api/v1/governance/proposals/:id/quorum` | Take quorum snapshot |
| POST | `/api/v1/governance/proposals/:id/approve` | Approve after quorum |
| POST | `/api/v1/governance/proposals/:id/reject` | Reject with reason |
| POST | `/api/v1/governance/proposals/:id/queue` | Start persistent timelock |
| POST | `/api/v1/governance/proposals/:id/cancel` | Cancel with reason |
| POST | `/api/v1/governance/proposals/:id/execute` | Verify and record execution |

`EXECUTED` is only reachable after the injected Celo verifier confirms the
transaction receipt, chain, destination, calldata/value, and confirmation
depth. A submitted transaction hash is not execution evidence by itself.
