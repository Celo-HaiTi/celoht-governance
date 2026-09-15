# Celo-HaiTi Source of Truth

| Concern | Canonical repository/system |
| --- | --- |
| Smart-contract source | `celoht-smart-contracts` |
| Deployment and addresses | `celoht-smart-contracts/deployments` |
| ABI | `celoht-smart-contracts` artifacts, mirrored by `celoht-indexer/abis` |
| Blockchain events and checkpoints | `celoht-indexer` |
| On-chain projections and RLS | `celoht-supabase` |
| Wallet authentication | `celoht-backend` |
| Application API | `celoht-backend` |
| Canonical governance policy | `celoht-governance/GOVERNANCE.md` |
| Governance business rules and implementation | `celoht-governance` |
| Admin presentation | `celoht-admin` |
| Public wallet UI | `celoht-dapp` |
| Treasury custody | Verified Celo-HaiTi Treasury Safe |
| Institutional principles | `celoht-docs` |

This repository owns workflow rules and execution verification. It does not
index blocks, own private keys, or write indexer-owned blockchain projections.
