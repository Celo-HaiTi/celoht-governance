# CeloHT Governance Constitution

**Version:** 1.0.0
**Status:** Draft — adopted version must be ratified by the community
process this document itself defines before being marked final.

This constitution is the highest-authority governance document in the
CeloHT ecosystem. Where any other document, codebase, or admin tool
conflicts with this constitution, this constitution controls until
amended through the process in §15.

## 1. Purpose

To ensure CeloHT is governed transparently, predictably, and by its
community — not by founder discretion — while remaining safe,
auditable, and resistant to abuse.

## 2. Scope

Applies to: proposal creation and review, voting, membership and
roles, treasury actions, emergency actions, and any future governance
surface (dApp, admin panel, backend) that touches these.

## 3. Governance Principles

Community governance, transparency, accountability, least privilege,
separation of duties, auditability, deterministic rules, secure
authorization, fail-closed behavior, no unilateral treasury control,
no hidden administrative powers, reproducible decision-making, on-chain
verifiability where appropriate, resistance to governance abuse, and
clear emergency procedures.

## 4. Membership

- Governance membership is explicit and tracked in
  `governance_members` (see `DATA_MODEL.md`), not inferred from token
  balances (see `NO_TOKEN_POLICY.md`).
- Membership status is one of `ACTIVE`, `SUSPENDED`, `REMOVED`,
  `PENDING`.
- Only `ACTIVE` members hold any capability, regardless of assigned
  roles (enforced in `src/security/rbac.ts`).
- Membership actions (activation, suspension, removal) are themselves
  role-gated (`MEMBER_MANAGE`) and audited.

## 5. Roles

`GOVERNANCE_MEMBER`, `PROPOSER`, `REVIEWER`, `GOVERNANCE_ADMIN`,
`TREASURY_AUTHORIZER`, `EMERGENCY_ROLE`, `AUDITOR`. Each role's exact
capabilities are defined once, in `src/security/rbac.ts`, and
documented in `ROLES_AND_PERMISSIONS.md`. No role implicitly includes
another's capabilities.

## 6. Proposal Process

Any member holding `PROPOSER` may create a `DRAFT` proposal and submit
it. A `REVIEWER` moves it to `UNDER_REVIEW` and, if appropriate, opens
voting (`ACTIVE` → `VOTING`). See `GOVERNANCE.md` for the full state
machine and `PROPOSALS.md` for the proposal schema.

## 7. Voting

One active, eligible member = one vote (`FOR`, `AGAINST`, or
`ABSTAIN`). No duplicate votes; DB-level and application-level
enforcement (see `VOTING.md`). Wallet-based voting, if used, requires
standards-based signature verification — a wallet address alone is
never proof of authorization.

## 8. Quorum

Quorum is expressed in basis points of the eligible-member count and
computed deterministically at the time of the check
(`VotingService.computeQuorum`). The default is 20% (`2000` bps) but
each proposal may set its own at creation time — never silently
changed afterward.

## 9. Approval Thresholds

Default approval threshold is 50% (`5000` bps) of decisive
(`FOR`+`AGAINST`) votes; abstentions do not count toward the
denominator. Per-proposal overrides must be set at creation, not
after votes have been cast.

## 10. Treasury Governance

No proposal may move directly from approval to treasury execution.
The mandatory path is: Proposal → Review → Vote → Quorum → Approval →
Timelock → Authorized executor (multisig / `TREASURY_AUTHORIZER`) →
on-chain execution → verification → audit record. See
`TREASURY_GOVERNANCE.md`. `GOVERNANCE_ADMIN` alone can never execute a
treasury action (enforced: it does not carry `TREASURY_AUTHORIZE` or
`PROPOSAL_EXECUTE`).

## 11. Emergency Governance

Emergency powers are narrow, time-boxed, automatically expiring,
audited, and require a post-event community review. See
`EMERGENCY_GOVERNANCE.md`. An emergency action is never a substitute
for the ordinary proposal process except for the specific, documented
class of emergencies it is scoped to.

## 12. Conflict of Interest

A member with a direct personal or financial interest in a proposal's
outcome must disclose it and, for votes on that proposal, is treated
as the proposer for self-approval purposes even if they did not author
it, where the governance body has flagged the conflict in the
proposal's metadata. `assertNotSelfActing` enforces the base case (a
proposer cannot approve/reject/queue/execute their own proposal);
broader conflict-of-interest recusal is a review-time human judgment
this constitution requires but does not (and cannot) fully automate.

## 13. Transparency

All proposals, votes (subject to any explicitly documented
privacy-preserving voting mechanism adopted in the future), quorum
snapshots, and execution records are readable via the audit log and
public proposal APIs (`API.md`). Nothing governance-relevant is
decided in a channel that isn't eventually reflected here.

## 14. Auditability

Every sensitive action listed in `AUDIT.md` produces an immutable
audit record. The audit log is append-only at the database level
(trigger-enforced), not merely by application convention.

## 15. Amendments

This constitution may only be amended via a `GOVERNANCE_CHANGE`
proposal that follows the full proposal lifecycle in §6, including
quorum and approval-threshold requirements at least as strict as this
version's defaults. An amendment must bump the version number at the
top of this file and update `GOVERNANCE_VERSION` /
`governance_settings` accordingly. Historical proposals continue to be
interpreted under the constitution version referenced in their own
`governance_version` field — never retroactively reinterpreted.

## 16. Security

See `SECURITY.md` and `THREAT_MODEL.md`. Security requirements in
those documents are binding, not aspirational: a change that weakens
an enforced invariant (self-approval, duplicate-vote prevention,
fail-closed configuration, append-only audit log) is itself a
`GOVERNANCE_CHANGE` requiring the same process as any other amendment.

## 17. Community Accountability

Governance roles are held by identified (at minimum, pseudonymously
consistent) community members, not anonymous or rotating
identities without continuity. Role assignment and revocation are
themselves audited actions requiring `ROLE_ASSIGN` capability, held
only by `GOVERNANCE_ADMIN`.
