# THREAT MODEL

Format: Threat → Mitigation → Where enforced → Test coverage.

| Threat | Mitigation | Enforced in | Tested in |
|---|---|---|---|
| Unauthorized proposal creation | Capability check (`PROPOSAL_CREATE`) before any write | `proposalService.createProposal` | `tests/security/authorization.test.ts` |
| Unauthorized voting | Active-member + `VOTE_CAST` capability check | `votingService.castVote` | `tests/integration/votingService.test.ts` |
| Duplicate voting | App-level lookup + DB unique partial index | `votingService.castVote`, migration | `tests/integration/votingService.test.ts` |
| Replay of a vote signature | Nonce store checked before accepting signature | `Eip712SignatureVerifier.verify` | contract defined; concrete `NonceStore` impl not included (see readiness report) |
| Privilege escalation via role stacking | Capabilities are a union of explicit grants only, no role implies another | `rbac.ts::ROLE_CAPABILITIES` | `tests/unit/rbac.test.ts` |
| Self-approval / conflict of interest at the transition level | `assertNotSelfActing` on every review/approve/reject/queue/execute path | `proposalService.ts` | `tests/security/authorization.test.ts` |
| Forged/invalid state transitions | Single authoritative transition table, checked before every mutation | `stateMachine.ts` | `tests/unit/stateMachine.test.ts` |
| Quorum/threshold manipulation | Deterministic computation from persisted votes only, immutable snapshot | `votingService.computeQuorum` | `tests/integration/votingService.test.ts` |
| Double execution of a treasury action | `executionStatus` check + unique `execution_tx_hash` at DB level | `proposalService.recordExecution`, migration | `tests/security/authorization.test.ts` |
| Premature execution (timelock bypass) | `executableAt` check against current time before allowing execution | `proposalService.recordExecution` | `tests/security/authorization.test.ts` |
| Treasury execution by a non-treasury admin | `PROPOSAL_EXECUTE`/`TREASURY_AUTHORIZE` are not in `GOVERNANCE_ADMIN`'s capability set | `rbac.ts` | `tests/security/authorization.test.ts` |
| Audit log tampering | DB trigger rejects UPDATE/DELETE on `governance_audit_logs` | migration | not runnable in this sandbox (no live DB) — see readiness report |
| Secret leakage into logs/audit | Forbidden-key stripping in `AuditService.record`; `.gitignore` secret patterns | `auditService.ts`, `.gitignore` | not unit-tested yet |
| Invented/unverified contract addresses reaching production | `env.ts` requires address-shaped, explicitly-configured values in production; `Errors.unverifiedContractAddress` for infra code | `env.ts` | not unit-tested yet |
| SQL injection | Parameterized queries required at the (not-yet-implemented) adapter layer — schema itself uses constraints, not string-built SQL | N/A (adapter not implemented) | N/A |
| SSRF via RPC/webhook config | `CELO_RPC_URL` validated as a URL at startup; no user-supplied URL is ever fetched by this library | `env.ts` | not unit-tested yet |

## Explicitly out of scope for this repository

- Smart-contract-level reentrancy/economic attacks on the treasury
  multisig itself — that belongs to the treasury/contracts repo's own
  threat model.
- Social-engineering attacks against individual `GOVERNANCE_ADMIN` or
  `TREASURY_AUTHORIZER` holders (key custody, phishing) — mitigated by
  organizational process (multisig, hardware wallets), not by this
  codebase.
- Sybil attacks on membership eligibility itself — this repo assumes
  `governance_members` reflects a real, vetted membership process
  defined elsewhere; it does not implement identity verification.
