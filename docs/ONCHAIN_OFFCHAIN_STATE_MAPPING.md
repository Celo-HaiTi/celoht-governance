# On-chain / Off-chain State Mapping

The deployed `CeloHTGovernance` contract is advisory. It produces proposal,
vote, and finalization evidence; it does not execute treasury actions.

| Off-chain state | Required evidence |
| --- | --- |
| DRAFT | No chain evidence; application workflow only |
| SUBMITTED / UNDER_REVIEW | Authenticated workflow transition and audit event |
| ACTIVE / VOTING | Workflow state plus indexed proposal/voting evidence where applicable |
| QUORUM_REACHED | Immutable membership snapshot and verified vote set |
| APPROVED / REJECTED | Deterministic quorum/threshold result and finalization evidence |
| QUEUED | Persistent service timelock with `queuedAt` and `executableAt` |
| EXECUTED | Successful, confirmed Safe transaction whose target/calldata/value match the approved action |
| CANCELLED / EXPIRED | Authorized transition and append-only audit event |

A submitted transaction hash alone never establishes `EXECUTED`.
