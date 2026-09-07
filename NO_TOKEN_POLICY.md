# NO_TOKEN_POLICY

CeloHT does not have, and this repository must never introduce, a
CeloHT governance token, tokenomics, or investment product.

## Rules

1. Governance participation (proposing, voting) is based on an explicit
   membership/eligibility model defined in `ROLES_AND_PERMISSIONS.md`,
   **not** on holding or staking any token.
2. `USDm` is referenced only as CeloHT's stablecoin for treasury
   accounting. `CELO` is referenced only as the native gas asset on the
   Celo network. Neither may be treated as a governance/voting-weight
   token anywhere in this codebase.
3. No code in this repository may mint, issue, price, or create a
   market for a CeloHT-specific token.
4. Any proposal, PR, or design document that would make voting power
   proportional to holdings of any token is out of scope and must be
   rejected in review.
5. If a future community decision changes this policy, it must happen
   through a formal `GOVERNANCE_CHANGE` proposal under
   `GOVERNANCE_CONSTITUTION.md`, with this file updated and versioned
   accordingly — never silently.
