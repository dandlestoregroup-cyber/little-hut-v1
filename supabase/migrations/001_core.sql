begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('guest','owner','scout','assessor','operator','community','admin');
create type public.property_lifecycle as enum ('draft','assessment','qualified','live','suspended','retired');
create type public.evidence_status as enum ('pending','verified','rejected','expired');
create type public.readiness_status as enum ('ready','blocked','unknown');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('owner','operator','community','other')),
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_user_id uuid references auth.users(id),
  partner_id uuid references public.partners(id),
  lifecycle public.property_lifecycle not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  promise text not null,
  status text not null default 'draft' check (status in ('draft','active','retired')),
  created_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('photo','video')),
  public_safe boolean not null default false,
  provenance jsonb not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(provenance) = 'object')
);

create table public.scout_submissions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  scout_user_id uuid not null references auth.users(id),
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected')),
  provenance jsonb not null,
  submitted_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  assessor_user_id uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft','submitted','accepted','rejected')),
  findings jsonb not null default '{}'::jsonb,
  assessed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.owner_decisions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id),
  decision text not null check (decision in ('activate','hold','reject','suspend','retire')),
  reason text not null,
  decided_at timestamptz not null default now()
);

create table public.property_moment_evidence (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  moment_id uuid not null references public.moments(id) on delete cascade,
  status public.evidence_status not null default 'pending',
  claim text not null,
  provenance jsonb not null,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(provenance) = 'object'),
  check ((status <> 'verified') or (reviewed_by is not null and reviewed_at is not null))
);

create table public.evidence_media (
  evidence_id uuid not null references public.property_moment_evidence(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  primary key (evidence_id, media_asset_id)
);

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('verified_available','verified_unavailable','unknown')),
  checked_at timestamptz not null,
  expires_at timestamptz not null,
  provenance jsonb not null,
  check (end_date >= start_date),
  check (expires_at > checked_at)
);

create table public.rates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null check (status in ('verified','unknown')),
  checked_at timestamptz not null,
  expires_at timestamptz not null,
  provenance jsonb not null,
  check (end_date >= start_date),
  check (expires_at > checked_at)
);

create table public.operational_readiness (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  status public.readiness_status not null,
  blockers jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(blockers) = 'array')
);

create table public.guest_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  desired_moment_id uuid not null references public.moments(id),
  start_date date not null,
  end_date date not null,
  party_size integer not null check (party_size > 0 and party_size <= 30),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.booking_enquiries (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid references public.guest_intents(id),
  property_id uuid not null references public.properties(id),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','declined','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mastermind_decisions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  moment_id uuid not null references public.moments(id),
  intent_id uuid references public.guest_intents(id),
  action text not null check (action in ('recommend','block','escalate')),
  reasons jsonb not null default '[]'::jsonb,
  evidence_ids uuid[] not null default '{}',
  engine_version text not null,
  decided_at timestamptz not null default now(),
  check (jsonb_typeof(reasons) = 'array')
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_role public.app_role,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = required_role
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.partners enable row level security;
alter table public.properties enable row level security;
alter table public.moments enable row level security;
alter table public.media_assets enable row level security;
alter table public.scout_submissions enable row level security;
alter table public.assessments enable row level security;
alter table public.owner_decisions enable row level security;
alter table public.property_moment_evidence enable row level security;
alter table public.evidence_media enable row level security;
alter table public.availability_windows enable row level security;
alter table public.rates enable row level security;
alter table public.operational_readiness enable row level security;
alter table public.guest_intents enable row level security;
alter table public.booking_enquiries enable row level security;
alter table public.mastermind_decisions enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.has_role('admin'));
create policy roles_self_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role('admin'));

create policy properties_staff_read on public.properties for select to authenticated using (
  owner_user_id = auth.uid() or public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('community') or public.has_role('admin')
);
create policy properties_owner_create on public.properties for insert to authenticated with check (owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin'));
create policy properties_owner_update on public.properties for update to authenticated using (owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin')) with check (owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin'));

create policy moments_staff_read on public.moments for select to authenticated using (true);
create policy moments_admin_write on public.moments for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy media_staff_read on public.media_assets for select to authenticated using (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_user_id = auth.uid() or public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('admin')))
);
create policy media_staff_write on public.media_assets for insert to authenticated with check (public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('admin'));

create policy evidence_staff_read on public.property_moment_evidence for select to authenticated using (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_user_id = auth.uid() or public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('admin')))
);
create policy evidence_submit on public.property_moment_evidence for insert to authenticated with check (public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('admin'));
create policy evidence_review on public.property_moment_evidence for update to authenticated using (public.has_role('assessor') or public.has_role('admin')) with check (public.has_role('assessor') or public.has_role('admin'));

create policy owner_decision_read on public.owner_decisions for select to authenticated using (owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin'));
create policy owner_decision_write on public.owner_decisions for insert to authenticated with check (owner_user_id = auth.uid() or public.has_role('admin'));

create policy truth_owner_operator_read_availability on public.availability_windows for select to authenticated using (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('assessor') or public.has_role('admin')))
);
create policy truth_owner_operator_write_availability on public.availability_windows for insert to authenticated with check (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin')))
);
create policy truth_owner_operator_read_rates on public.rates for select to authenticated using (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('assessor') or public.has_role('admin')))
);
create policy truth_owner_operator_write_rates on public.rates for insert to authenticated with check (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin')))
);

create policy readiness_staff_read on public.operational_readiness for select to authenticated using (public.has_role('assessor') or public.has_role('operator') or public.has_role('admin'));
create policy readiness_staff_write on public.operational_readiness for insert to authenticated with check (public.has_role('assessor') or public.has_role('operator') or public.has_role('admin'));

create policy intents_own on public.guest_intents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy enquiries_own_read on public.booking_enquiries for select to authenticated using (user_id = auth.uid() or public.has_role('operator') or public.has_role('admin'));
create policy enquiries_own_create on public.booking_enquiries for insert to authenticated with check (user_id = auth.uid());
create policy mastermind_staff_read on public.mastermind_decisions for select to authenticated using (public.has_role('operator') or public.has_role('assessor') or public.has_role('admin'));
create policy audit_admin_read on public.audit_events for select to authenticated using (public.has_role('admin'));

-- Guest-safe projection. Internal provenance, owner identity, evidence claims and scores are deliberately absent.
create view public.guest_moment_properties as
select distinct
  p.id as property_id,
  p.slug as property_slug,
  p.name as property_name,
  m.id as moment_id,
  m.slug as moment_slug,
  m.name as moment_name,
  m.promise as moment_promise,
  media.storage_path as hero_media_path
from public.properties p
join public.property_moment_evidence e on e.property_id = p.id
join public.moments m on m.id = e.moment_id
join public.evidence_media em on em.evidence_id = e.id
join public.media_assets media on media.id = em.media_asset_id
where p.lifecycle = 'live'
  and m.status = 'active'
  and e.status = 'verified'
  and (e.expires_at is null or e.expires_at > now())
  and media.public_safe = true;

revoke all on public.profiles, public.user_roles, public.partners, public.properties, public.moments, public.media_assets,
  public.scout_submissions, public.assessments, public.owner_decisions, public.property_moment_evidence,
  public.evidence_media, public.availability_windows, public.rates, public.operational_readiness,
  public.guest_intents, public.booking_enquiries, public.mastermind_decisions, public.audit_events from anon;
grant select on public.guest_moment_properties to anon, authenticated;

grant select, insert, update on public.profiles, public.user_roles, public.partners, public.properties, public.moments,
  public.media_assets, public.scout_submissions, public.assessments, public.owner_decisions,
  public.property_moment_evidence, public.evidence_media, public.availability_windows, public.rates,
  public.operational_readiness, public.guest_intents, public.booking_enquiries, public.mastermind_decisions to authenticated;
grant select on public.audit_events to authenticated;

commit;
