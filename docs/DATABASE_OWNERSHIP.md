# Database Ownership

`celoht-supabase` owns the canonical database migrations and RLS policy model.
`celoht-indexer` owns writes to `governance_proposals`,
`governance_activity`, blockchain events, transactions, indexed blocks, and
checkpoints. Governance must not write those tables or scan blocks.

This repository's `migrations/0013_governance_workflow.sql` is an application
schema proposal for the canonical Supabase repository. It owns only workflow
state, idempotency records, and governance execution evidence. It must be
copied/reviewed into `celoht-supabase` as the next available upstream
migration number in the canonical chain; if the upstream sequence is at `0017`,
this proposal is the correct candidate for `0018`. This repository cannot make
it production-applied by itself. Do not edit already-applied migrations.

The canonical Supabase identity and role sources remain `profiles`, `roles`,
`profile_roles`, and `role_permissions`. A future `0013` review must map
authenticated backend actors to those tables rather than creating a second
role authority in workflow rows.

All service-role access is server-side. Anonymous and authenticated Data API
roles receive no grants on workflow tables; authorization occurs at the backend
boundary.
