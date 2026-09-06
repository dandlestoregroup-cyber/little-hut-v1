begin;

create table public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  moment_id uuid references public.moments(id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('low','medium','high')),
  resolved boolean not null default false,
  provenance jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  check (jsonb_typeof(provenance) = 'object'),
  check ((resolved = false) or (resolved_at is not null and resolved_by is not null))
);

alter table public.risk_signals enable row level security;

create policy risk_staff_read on public.risk_signals for select to authenticated using (
  public.has_role('assessor') or public.has_role('operator') or public.has_role('admin')
);
create policy risk_staff_create on public.risk_signals for insert to authenticated with check (
  public.has_role('assessor') or public.has_role('operator') or public.has_role('admin')
);
create policy risk_operator_resolve on public.risk_signals for update to authenticated using (
  public.has_role('operator') or public.has_role('admin')
) with check (
  public.has_role('operator') or public.has_role('admin')
);

grant select, insert, update on public.risk_signals to authenticated;
revoke all on public.risk_signals from anon;

-- A scout/assessor may submit raw media, but cannot self-approve it for public display.
drop policy if exists media_staff_write on public.media_assets;
create policy media_staff_write on public.media_assets for insert to authenticated with check (
  (public.has_role('admin'))
  or ((public.has_role('scout') or public.has_role('assessor') or public.has_role('operator')) and public_safe = false)
);

commit;
