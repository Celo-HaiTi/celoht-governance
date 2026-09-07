-- CeloHT Governance — Initial Schema
-- Design notes:
--  * UUIDs everywhere for global uniqueness across services.
--  * governance_audit_logs is APPEND-ONLY (Section 29): no UPDATE/DELETE
--    grants issued to the application role; enforced below with a
--    trigger that rejects both.
--  * governance_votes has a UNIQUE(proposal_id, member_id) WHERE
--    invalidated = false to make duplicate-vote prevention a DB-level
--    invariant, not just an application check (defense in depth).
--  * All monetary/treasury references live in the treasury repo; this
--    schema only stores the *governance decision* about a treasury
--    action, never wallet keys or balances.

begin;

create extension if not exists "pgcrypto";

-- ============================================================
-- governance_roles / governance_permissions (reference tables)
-- ============================================================
create table if not exists governance_roles (
  role text primary key,
  description text not null
);

insert into governance_roles (role, description) values
  ('GOVERNANCE_MEMBER', 'Base eligibility to vote'),
  ('PROPOSER', 'May create and submit proposals'),
  ('REVIEWER', 'May move proposals into review and open voting'),
  ('GOVERNANCE_ADMIN', 'May manage membership, roles, approve/reject/queue'),
  ('TREASURY_AUTHORIZER', 'May authorize/record treasury execution'),
  ('EMERGENCY_ROLE', 'May trigger constrained emergency procedures'),
  ('AUDITOR', 'Read-only access to audit records')
on conflict (role) do nothing;

create table if not exists governance_permissions (
  role text not null references governance_roles(role),
  capability text not null,
  primary key (role, capability)
);

-- ============================================================
-- governance_members
-- ============================================================
create table if not exists governance_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  status text not null check (status in ('ACTIVE', 'SUSPENDED', 'REMOVED', 'PENDING')),
  eligible_to_vote_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists governance_member_roles (
  member_id uuid not null references governance_members(id) on delete cascade,
  role text not null references governance_roles(role),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references governance_members(id),
  primary key (member_id, role)
);

-- ============================================================
-- governance_proposals
-- ============================================================
create table if not exists governance_proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  proposer_id uuid not null references governance_members(id),
  proposal_type text not null check (proposal_type in (
    'POLICY_CHANGE', 'GOVERNANCE_CHANGE', 'TREASURY_ACTION', 'COMMUNITY_FUNDING',
    'PROGRAM_CHANGE', 'AGENT_NETWORK_CHANGE', 'REFORESTATION_ACTION',
    'EDUCATION_PROGRAM_CHANGE', 'EMERGENCY_ACTION'
  )),
  status text not null check (status in (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTIVE', 'VOTING', 'QUORUM_REACHED',
    'APPROVED', 'REJECTED', 'QUEUED', 'EXECUTED', 'CANCELLED', 'EXPIRED'
  )),
  governance_version text not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  voting_starts_at timestamptz,
  voting_ends_at timestamptz,
  quorum_bps integer not null check (quorum_bps between 1 and 10000),
  approval_threshold_bps integer not null check (approval_threshold_bps between 1 and 10000),
  execution_delay_seconds integer not null default 0 check (execution_delay_seconds >= 0),
  execution_status text not null default 'NOT_EXECUTED' check (execution_status in (
    'NOT_EXECUTED', 'QUEUED', 'EXECUTED', 'FAILED'
  )),
  queued_at timestamptz,
  executable_at timestamptz,
  executed_at timestamptz,
  cancellation_reason text,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint voting_window_valid check (
    voting_starts_at is null or voting_ends_at is null or voting_ends_at > voting_starts_at
  )
);

create index if not exists idx_proposals_status on governance_proposals(status);
create index if not exists idx_proposals_type on governance_proposals(proposal_type);
create index if not exists idx_proposals_proposer on governance_proposals(proposer_id);

-- ============================================================
-- governance_proposal_actions (structured payload for what a
-- proposal actually DOES if executed — e.g. treasury transfer
-- params, policy text diff, program parameters). Kept separate from
-- the proposal row so the decision record and the action payload
-- have independent audit trails.
-- ============================================================
create table if not exists governance_proposal_actions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references governance_proposals(id) on delete cascade,
  action_type text not null,
  target_contract_address text, -- must come from verified config, never invented
  action_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- governance_votes
-- ============================================================
create table if not exists governance_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references governance_proposals(id) on delete cascade,
  member_id uuid not null references governance_members(id),
  choice text not null check (choice in ('FOR', 'AGAINST', 'ABSTAIN')),
  voting_power integer not null default 1 check (voting_power > 0),
  cast_at timestamptz not null default now(),
  invalidated boolean not null default false,
  invalidated_reason text
);

-- Duplicate-vote prevention as a DB-level invariant.
create unique index if not exists uq_one_active_vote_per_member
  on governance_votes(proposal_id, member_id)
  where invalidated = false;

create index if not exists idx_votes_proposal on governance_votes(proposal_id);

-- ============================================================
-- governance_quorum_snapshots (immutable, append-only by convention)
-- ============================================================
create table if not exists governance_quorum_snapshots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references governance_proposals(id) on delete cascade,
  eligible_member_count integer not null,
  quorum_required integer not null,
  votes_for_count integer not null,
  votes_against_count integer not null,
  votes_abstain_count integer not null,
  taken_at timestamptz not null default now()
);

create index if not exists idx_quorum_proposal on governance_quorum_snapshots(proposal_id);

-- ============================================================
-- governance_executions / governance_timelocks
-- ============================================================
create table if not exists governance_timelocks (
  proposal_id uuid primary key references governance_proposals(id) on delete cascade,
  queued_at timestamptz not null,
  executable_at timestamptz not null,
  executed boolean not null default false
);

create table if not exists governance_executions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references governance_proposals(id) on delete cascade,
  executor_id uuid not null references governance_members(id),
  execution_tx_hash text not null check (execution_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  executed_at timestamptz not null default now(),
  verified boolean not null default false,
  unique (execution_tx_hash)
);

-- ============================================================
-- governance_audit_logs — APPEND ONLY
-- ============================================================
create table if not exists governance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references governance_members(id),
  event_type text not null,
  target_entity text not null,
  target_id uuid not null,
  "timestamp" timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  resulting_state text
);

create index if not exists idx_audit_target on governance_audit_logs(target_entity, target_id);
create index if not exists idx_audit_correlation on governance_audit_logs(correlation_id);

create or replace function reject_audit_mutation() returns trigger as $$
begin
  raise exception 'governance_audit_logs is append-only: % is not permitted', tg_op;
end;
$$ language plpgsql;

drop trigger if exists trg_no_update_audit on governance_audit_logs;
create trigger trg_no_update_audit
  before update on governance_audit_logs
  for each row execute function reject_audit_mutation();

drop trigger if exists trg_no_delete_audit on governance_audit_logs;
create trigger trg_no_delete_audit
  before delete on governance_audit_logs
  for each row execute function reject_audit_mutation();

-- ============================================================
-- governance_settings (versioned governance parameters)
-- ============================================================
create table if not exists governance_settings (
  version text primary key,
  quorum_bps integer not null,
  approval_threshold_bps integer not null,
  voting_period_seconds integer not null,
  execution_delay_seconds integer not null,
  effective_from timestamptz not null default now(),
  notes text
);

commit;
