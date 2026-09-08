# CeloHT Governance Production Audit

Date: 2026-09-08
Repository: `celoht-governance`

## Verdict

**NOT PRODUCTION READY**

## Verified

- The domain model uses fixed `votingPower = 1`; no token, CELO, USDm, NFT, contribution, or volume weighting is used.
- The legal lifecycle is represented by the state machine, and quorum computation now persists the `VOTING -> QUORUM_REACHED` transition.
- Duplicate active votes are protected in the application and by the partial unique index in the workflow migration.
- The canonical manifest constants are Celo Sepolia chain `11142220`, governance `0x7D384851FAbB912287206556479Dd30c740CAdA5`, deployment block `35343249`, USDm `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`, and Treasury Safe `0xd856e0599cc49C9cef6C358d2c2f064112A6b384`.
- The real Celo Sepolia RPC responded with chain ID `0xaa044c` (`11142220`). Governance address bytecode is present.
- The local TypeScript build, lint, full unit/security suite, and all 29 tests pass.
- Persistence adapters now use the workflow-owned table names and map domain camelCase to Supabase snake_case columns.

## Exact blockers

### Canonical smart-contract repository reconciliation

The canonical `celoht-smart-contracts` repository was inspected at main commit
`bdfc9ecf879f09418fb609b0695986b5dbe6ee27`. Its deployment manifest confirms
the chain ID, governance address, USDm address, treasury address, deployment
block, transaction hash, and ABI reference already recorded here.

That repository also confirms the following integration facts:

- `CeloHTGovernance` is advisory only. It implements proposal creation, a
	fixed USDm participation fee, one-wallet-one-vote, and finalization. It does
	not implement quorum, approval thresholds, `QUEUED`, `EXECUTED`, Safe
	authorization, or treasury execution.
- Governance results therefore cannot be represented as on-chain execution
	evidence. The application lifecycle must keep approval separate from Safe
	execution and must consume indexed contract events.
- The recorded deployment's `protocolAdmin` is the deployer EOA
	`0xAC4F2AE7127150eAf411E7Be774531af9c94Bb66`. The contract repository says
	this deployment retains default admin roles on the deployment EOA and needs
	a reviewed role handoff before operational governance.
- The contract repository calls the treasury address a confirmed Safe, but the
	live Celo Sepolia RPC returned no bytecode (`0x`) for that address. This
	conflict must be resolved with a corrected address or independently verified
	deployment evidence.

1. **Treasury Safe cannot be verified on the configured live RPC.** `eth_getCode` for `0xd856e0599cc49C9cef6C358d2c2f064112A6b384` returned `0x`. The address therefore cannot currently be treated as a deployed Safe without canonical deployment evidence or a corrected address.

2. **Historical deployment verification is unavailable from the tested RPC endpoint.** A request for block `35343249` returned `block is more than 10064 blocks behind head`. A historical RPC/archive provider or canonical indexed deployment evidence is required before accepting the deployment block as verified.

3. **No production composition or startup entrypoint exists.** There is no server start script wiring backend authentication, Supabase repositories, the nonce store, execution verifier, readiness checks, and the HTTP server into one deployable process.

4. **Backend authentication is not verifiably wired end to end.** The HTTP boundary accepts an `Authenticator`, but this repository contains no production composition proving that `celoht-backend` authentication is the sole actor identity source. No wallet-login replacement or deployed backend-auth integration test is present.

5. **Canonical Supabase connectivity and schema/RLS are unverified.** Required runtime configuration is absent, so `npm run production:readiness` correctly fails closed. There is no live Supabase connectivity test, RLS test, or evidence that the migration has been reviewed/applied by `celoht-supabase`.

6. **Member identity/role ownership is duplicated in the local migration.** `governance_workflow_members` stores `roles` and identity-like fields even though the documented canonical authority is `profiles`, `roles`, `profile_roles`, and `role_permissions` in `celoht-supabase`. The adapter must be mapped to those canonical sources before deployment.

7. **Indexer integration and reconciliation are absent.** No indexer client, event consumer, checkpoint handling, or on-chain/off-chain reconciliation exists. The execution path verifies a transaction directly through RPC and does not require indexed evidence, despite the governance boundary requiring canonical `celoht-indexer` data.

8. **Treasury execution authorization is incomplete.** `CeloProposalExecutionVerifier` accepts `metadata.targetAddress` from the proposal and does not enforce that the action is authorized by the verified Safe or match a canonical Safe execution schema. A transaction can therefore be valid at the RPC level without proving Safe authorization.

9. **Execution evidence is still not wired into the application mutation.** The execution repository and table now exist, but `ProposalService.recordExecution` does not persist an `ExecutionRecord`; it only updates proposal fields and audit metadata. Verified execution evidence is therefore incomplete.

10. **Idempotency and audit atomicity are not production-grade.** A failed action or response persistence can leave an idempotency key permanently in progress, and state mutation is separate from audit insertion with no transaction or outbox guarantee.

11. **The integration test command is not viable.** `npm run test:integration` exits with `No test files found`; existing security tests use in-memory fakes and do not validate live Supabase, backend authentication, indexer evidence, RLS, or RPC execution semantics.

## Checks run

- `npm test`: PASS, 5 files, 29 tests.
- `npm run test:security`: PASS, 8 tests.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm run production:readiness`: BLOCKED as designed because required runtime configuration is absent.
- `npm run test:integration`: BLOCKED because no integration test files exist.
- Celo Sepolia RPC chain identity: PASS.
- Governance contract bytecode: PASS.
- Treasury Safe bytecode: FAIL (`0x`).
- Deployment block lookup: BLOCKED by RPC historical-depth limit.

The system must remain **NOT PRODUCTION READY** until every blocker above has owner-repository evidence and a passing live integration check.
