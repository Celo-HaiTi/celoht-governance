# EMERGENCY GOVERNANCE

## What qualifies as an emergency

A narrowly-defined class of situations where the ordinary proposal
timeline (review → vote → quorum → timelock) would itself cause harm
— e.g. an actively exploited vulnerability requiring an immediate
pause of a vulnerable contract interaction. Routine treasury actions,
policy disagreements, or time pressure from external deadlines do
**not** qualify.

## Who can trigger it

Only a member holding `EMERGENCY_ROLE` — a role deliberately separate
from `GOVERNANCE_ADMIN` and `TREASURY_AUTHORIZER` (see
`ROLES_AND_PERMISSIONS.md`) — may invoke `EMERGENCY_TRIGGER`.

## What actions are permitted

Emergency actions are modeled as `EMERGENCY_ACTION` proposals that
still go through the standard `Proposal`/audit record shape, but with:

- an abbreviated review step (documented separately per deployment,
  not hardcoded here as a bypass of review entirely — review is
  compressed in time, not removed),
- a hard-capped duration for any emergency state, configured via
  `EMERGENCY_ROLE_MAX_DURATION_SECONDS` and enforced by the
  infrastructure layer, not left to manual follow-through,
- mandatory post-event review and community notification.

## Explicit non-goals

- Emergency powers must never be used to move treasury funds directly
  — `EMERGENCY_ROLE` does not carry `TREASURY_AUTHORIZE` (see the RBAC
  matrix). An emergency treasury freeze mechanism, if the community
  adopts one, must be implemented at the contract level (e.g. a
  circuit breaker the multisig can trigger), not as a governance-layer
  bypass of the treasury path.
- An emergency state must never silently become permanent. Any
  extension beyond `EMERGENCY_ROLE_MAX_DURATION_SECONDS` requires a
  fresh, explicit trigger and a new audit record — not an
  auto-renewal.

## Required follow-up

Every `EMERGENCY_TRIGGER` audit event must be followed, within a
documented review window (set by the CeloHT community process, not
hardcoded here), by a postmortem proposal (`POLICY_CHANGE` or
`GOVERNANCE_CHANGE` type) summarizing what happened and any process
changes needed.
