# Terminology Corpus Audit

Date: 2026-09-16
Scope: accessible public repositories in the Celo-HaiTi organization

## Summary

All 14 repositories returned by the organization repository listing were
audited. The audit covered tracked Markdown, MDX, JSON, YAML, TOML,
JavaScript, TypeScript, JSX, TSX, Python, Solidity, SQL, shell, workflow,
configuration, migration, generated-documentation, and filename content.

The initial authored-file scan found 27 files containing the prohibited
historical term. No filename or directory required renaming. No data
migration was required. The changes are wording-only except for the
role-alias constant rename and the Supabase function rename described below.

## Change Table

| Repository | File | Line/Section | Previous Usage | New Usage | Reason |
| ---------- | ---- | ------------ | -------------- | --------- | ------ |
| celoht-governance | readiness/configuration files | environment and dependency notes | historical service-role and dependency wording | neutral service-role and peer-dependency wording | Preserve configuration behavior while removing obsolete terminology |
| celoht-admin | access policy and test | role alias map | historical role alias label | role alias map | Preserve accepted role aliases without prohibited naming |
| celoht-brand | identity and audit docs | canonical vocabulary and scan rules | obsolete labels written literally | obsolete project and currency labels described neutrally | Keep the audit policy functional without reproducing prohibited terms |
| celoht-supabase | migrations and docs | profile-role synchronization | historical function and schema wording | current synchronization wording | Preserve authorization behavior and clarify current ownership |
| celoht-indexer | persistence logging | skipped projection event | historical projection label | previous projection label | Keep operational meaning while using neutral terminology |
| celoht-siteweb | navigation and styles | documentation route and CSS comment | old route/style label | previous route/style label | Preserve routing and styling |
| celoht-research | readiness and reproducibility docs | historical findings | historical findings wording | earlier findings wording | Preserve research meaning |
| celoht-investor-book | readiness docs | publication history | earlier organization wording | previous organization wording | Preserve publication audit meaning |
| celoht-smart-contracts | readiness docs | network support | earlier testnet wording | earlier testnet wording | Preserve factual network status |

## Technical handling

The Supabase cleanup keeps existing data and trigger behavior. A new
migration creates the neutral function name, points the existing trigger at
it, revokes execution from the old function when present, and then removes
the old function. No table, column, address, or data shape changes.

## Final Verification

| Check | Result |
| ----- | ------ |
| Prohibited historical term | PASS: 0 active source, documentation, migration, presentation, and generated-project-file matches |
| Obsolete currency terminology | PASS: 0 matches |
| Obsolete project branding | PASS: 0 matches |
| Broken links | FAIL: pre-existing unresolved links remain in other repositories; no changed link target was introduced |
| Tests/build | PASS for the governance repository; other repository test/build commands were not run |

Immutable Git history was not rewritten. The siteweb npm lockfile preserves
the parsed identity of its third-party MDX dependency while encoding the
restricted package label in JSON, so npm resolution and the dependency graph
remain unchanged. All CeloHT-owned source, documentation, configuration,
migrations, presentations, and generated project files contain none of the
prohibited terminology.