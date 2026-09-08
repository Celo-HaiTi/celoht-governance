# Database Ownership

`celoht-supabase` owns the canonical database migrations and RLS policy model.
`celoht-indexer` owns writes to `governance_proposals`,
`governance_activity`, blockchain events, transactions, indexed blocks, and
checkpoints. Governance must not write those tables or scan blocks.

This repository's `migrations/002_governance_workflow.sql` owns only workflow
state, idempotency records, and append-only workflow audit records. Apply it in
the canonical Supabase migration repository after the existing migrations,
using the next approved migration number there. Do not edit applied migrations.

All service-role access is server-side. Anonymous and authenticated Data API
roles receive no grants on workflow tables; authorization occurs at the backend
boundary.
