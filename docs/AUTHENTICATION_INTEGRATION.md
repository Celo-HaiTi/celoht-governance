# Authentication Integration

Governance does not create a competing login system. The request path is:

`wallet -> celoht-backend nonce/signature flow -> verified actor -> governance authorization`

The backend owns nonce issuance, `viem` signature verification, atomic nonce
consumption, and the HTTP-only session. Governance receives a server-verified
actor/member identity and re-checks role/status before every mutation.

Governance action signatures, where required, are separate from login
signatures. They must bind proposal, action, chain ID, domain, nonce, and
deadline, and use persistent nonce storage.
