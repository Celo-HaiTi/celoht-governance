# Authentication Integration

Governance does not create a competing login system. The request path is:

`wallet -> celoht-backend nonce/signature flow -> verified actor -> governance authorization`

The backend owns nonce issuance, `viem` signature verification, atomic nonce
consumption, and the HTTP-only `celoht_session` cookie. Governance receives a
server-verified actor/member identity through `BackendAuthenticator` and
re-checks member status/capabilities before every mutation. Governance never
parses the backend HMAC token and never trusts a client role field.

The HTTP boundary also forwards an Authorization header for deployments where
the backend exposes a bearer-token adapter, but the resolver remains owned by
`celoht-backend`.

Governance action signatures, where required, are separate from login
signatures. They must bind proposal, action, chain ID, domain, nonce, and
deadline, and use persistent nonce storage.
