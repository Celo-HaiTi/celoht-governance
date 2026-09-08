-- Canonical migration name for deployment pipelines.
-- Apply after the canonical celoht-supabase migrations. This migration owns
-- workflow state only; blockchain projections remain indexer-owned.

begin;

create table if not exists public.governance_workflows (
	id uuid primary key,
	title text not null,
	description text not null,
	proposer_id uuid not null,
	proposal_type text not null check (proposal_type in ('POLICY_CHANGE', 'GOVERNANCE_CHANGE', 'TREASURY_ACTION', 'COMMUNITY_FUNDING', 'PROGRAM_CHANGE', 'AGENT_NETWORK_CHANGE', 'REFORESTATION_ACTION', 'EDUCATION_PROGRAM_CHANGE', 'EMERGENCY_ACTION')),
	status text not null check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTIVE', 'VOTING', 'QUORUM_REACHED', 'APPROVED', 'REJECTED', 'QUEUED', 'EXECUTED', 'CANCELLED', 'EXPIRED')),
	governance_version text not null,
	created_at timestamptz not null,
	submitted_at timestamptz,
	voting_starts_at timestamptz,
	voting_ends_at timestamptz,
	quorum_bps integer not null check (quorum_bps between 1 and 10000),
	approval_threshold_bps integer not null check (approval_threshold_bps between 1 and 10000),
	execution_delay_seconds integer not null check (execution_delay_seconds >= 0),
	execution_status text not null check (execution_status in ('NOT_EXECUTED', 'QUEUED', 'EXECUTED', 'FAILED')),
	queued_at timestamptz,
	executable_at timestamptz,
	executed_at timestamptz,
	cancellation_reason text,
	rejection_reason text,
	metadata jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null,
	constraint governance_workflow_voting_window check (voting_starts_at is null or voting_ends_at is null or voting_ends_at > voting_starts_at),
	constraint governance_workflow_queue_window check (executable_at is null or queued_at is not null and executable_at >= queued_at)
);

create index if not exists governance_workflows_status_idx on public.governance_workflows(status);
create index if not exists governance_workflows_proposer_idx on public.governance_workflows(proposer_id);
create index if not exists governance_workflows_updated_idx on public.governance_workflows(updated_at desc);

alter table public.governance_workflows enable row level security;
revoke all on public.governance_workflows from anon, authenticated;

create table if not exists public.governance_workflow_members (
	id uuid primary key,
	auth_user_id uuid unique,
	wallet_address text unique,
	display_name text not null,
	status text not null check (status in ('ACTIVE', 'SUSPENDED', 'REMOVED', 'PENDING')),
	roles text[] not null default '{}',
	eligible_to_vote_since timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
alter table public.governance_workflow_members enable row level security;
revoke all on public.governance_workflow_members from anon, authenticated;

create table if not exists public.governance_workflow_votes (
	id uuid primary key default gen_random_uuid(),
	proposal_id uuid not null references public.governance_workflows(id) on delete cascade,
	member_id uuid not null references public.governance_workflow_members(id),
	choice text not null check (choice in ('FOR', 'AGAINST', 'ABSTAIN')),
	voting_power integer not null default 1 check (voting_power = 1),
	cast_at timestamptz not null default now(),
	invalidated boolean not null default false,
	invalidated_reason text
);
create unique index if not exists governance_workflow_one_active_vote_idx
	on public.governance_workflow_votes(proposal_id, member_id) where invalidated = false;
alter table public.governance_workflow_votes enable row level security;
revoke all on public.governance_workflow_votes from anon, authenticated;

create table if not exists public.governance_workflow_quorum_snapshots (
	id uuid primary key default gen_random_uuid(),
	proposal_id uuid not null references public.governance_workflows(id) on delete cascade,
	eligible_member_count integer not null check (eligible_member_count >= 0),
	quorum_required integer not null check (quorum_required >= 0),
	votes_for_count integer not null check (votes_for_count >= 0),
	votes_against_count integer not null check (votes_against_count >= 0),
	votes_abstain_count integer not null check (votes_abstain_count >= 0),
	governance_version text not null,
	taken_at timestamptz not null default now()
);
alter table public.governance_workflow_quorum_snapshots enable row level security;
revoke all on public.governance_workflow_quorum_snapshots from anon, authenticated;

create table if not exists public.governance_workflow_idempotency (
	idempotency_key text primary key check (length(idempotency_key) between 16 and 200),
	actor_id uuid not null,
	operation text not null,
	request_hash text not null,
	response jsonb,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null,
	constraint governance_idempotency_expiry check (expires_at > created_at)
);

alter table public.governance_workflow_idempotency enable row level security;
revoke all on public.governance_workflow_idempotency from anon, authenticated;

create table if not exists public.governance_workflow_audit_logs (
	id uuid primary key default gen_random_uuid(),
	actor_id uuid,
	event_type text not null,
	target_entity text not null,
	target_id uuid not null,
	"timestamp" timestamptz not null default now(),
	metadata jsonb not null default '{}'::jsonb,
	correlation_id uuid not null,
	resulting_state text
);

create index if not exists governance_workflow_audit_target_idx on public.governance_workflow_audit_logs(target_entity, target_id, "timestamp");
alter table public.governance_workflow_audit_logs enable row level security;
revoke all on public.governance_workflow_audit_logs from anon, authenticated;

create table if not exists public.governance_workflow_executions (
	id uuid primary key default gen_random_uuid(),
	proposal_id uuid not null unique references public.governance_workflows(id) on delete restrict,
	transaction_hash text not null unique check (transaction_hash ~ '^0x[0-9a-fA-F]{64}$'),
	status text not null check (status in ('PENDING', 'VERIFIED', 'FAILED')),
	verified_at timestamptz,
	chain_id integer not null check (chain_id > 0),
	target_address text,
	executed_by uuid,
	created_at timestamptz not null default now(),
	metadata jsonb not null default '{}'::jsonb
);
alter table public.governance_workflow_executions enable row level security;
revoke all on public.governance_workflow_executions from anon, authenticated;

create or replace function public.reject_governance_workflow_audit_mutation()
returns trigger language plpgsql as $$
begin
	raise exception 'governance_workflow_audit_logs is append-only: % is not permitted', tg_op;
end;
$$;

drop trigger if exists governance_workflow_audit_no_update on public.governance_workflow_audit_logs;
create trigger governance_workflow_audit_no_update before update on public.governance_workflow_audit_logs for each row execute function public.reject_governance_workflow_audit_mutation();
drop trigger if exists governance_workflow_audit_no_delete on public.governance_workflow_audit_logs;
create trigger governance_workflow_audit_no_delete before delete on public.governance_workflow_audit_logs for each row execute function public.reject_governance_workflow_audit_mutation();

commit;