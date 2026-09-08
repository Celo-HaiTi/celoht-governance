# RBAC Mapping

Backend/admin operational roles are not governance roles and must not be
implicitly elevated.

| Admin/backend role | Governance capability |
| --- | --- |
| viewer | Read public data only |
| contributor | Submit only if explicitly mapped to `PROPOSER` |
| council | Review only if explicitly mapped to `REVIEWER` |
| director | Governance administration only when explicitly assigned; never automatic treasury/emergency authority |
| treasury authorizer | Explicit `TREASURY_AUTHORIZER` assignment, separate from admin |

The mapping is stored server-side and resolved from the authenticated actor.
Client role fields, localStorage, and user-editable metadata are never trusted.
