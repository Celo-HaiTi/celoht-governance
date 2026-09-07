# Contributing to CeloHT Governance

1. Read `GOVERNANCE_CONSTITUTION.md` first — changes to governance
   *rules* (not just code style) are themselves governance actions and
   should go through the proposal process once this repo is live, not
   just a GitHub PR review.
2. Every change to `src/security/rbac.ts` must be mirrored in
   `ROLES_AND_PERMISSIONS.md` in the same PR.
3. Every change to `src/domain/stateMachine.ts` must be mirrored in
   `GOVERNANCE.md`'s diagram in the same PR.
4. New code must include tests: unit tests for pure logic, integration
   tests for service-level behavior against the in-memory fakes in
   `tests/integration/fakes.ts`, and a security test if the change
   touches an invariant listed in `THREAT_MODEL.md`.
5. Run `npm run lint && npm run typecheck && npm test` before opening
   a PR. CI will re-run these regardless.
6. Never commit secrets, real private keys, or real production
   contract addresses into example/test fixtures — use obviously fake
   values (e.g. `0x` + repeated digits) as this repo's own tests do.
