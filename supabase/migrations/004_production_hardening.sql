begin;

alter table public.property_moment_evidence
  add column if not exists submitted_by uuid references auth.users(id) default auth.uid();

alter table public.operational_readiness
  add column if not exists expires_at timestamptz;

alter table public.operational_readiness
  drop constraint if exists operational_readiness_expiry_check;
alter table public.operational_readiness
  add constraint operational_readiness_expiry_check
  check (expires_at is null or expires_at > checked_at);

-- Required provenance shape. Exact TTLs stay policy-driven and are not invented here.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'property_moment_evidence_provenance_shape') then
    alter table public.property_moment_evidence
      add constraint property_moment_evidence_provenance_shape
      check (provenance ?& array['source','sourceRef','capturedAt','method']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_assets_provenance_shape') then
    alter table public.media_assets
      add constraint media_assets_provenance_shape
      check (provenance ?& array['source','sourceRef','capturedAt','method']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'availability_provenance_shape') then
    alter table public.availability_windows
      add constraint availability_provenance_shape
      check (provenance ?& array['source','sourceRef','capturedAt','method']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rates_provenance_shape') then
    alter table public.rates
      add constraint rates_provenance_shape
      check (provenance ?& array['source','sourceRef','capturedAt','method']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scout_submissions_provenance_shape') then
    alter table public.scout_submissions
      add constraint scout_submissions_provenance_shape
      check (provenance ?& array['source','sourceRef','capturedAt','method']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'risk_signals_provenance_shape') then
    alter table public.risk_signals
      add constraint risk_signals_provenance_shape
      check (provenance ?& array['source','sourceRef','capturedAt','method']);
  end if;
end $$;

create or replace function public.current_app_role()
returns public.app_role
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.has_role('admin') then return 'admin'; end if;
  if public.has_role('operator') then return 'operator'; end if;
  if public.has_role('assessor') then return 'assessor'; end if;
  if public.has_role('owner') then return 'owner'; end if;
  if public.has_role('scout') then return 'scout'; end if;
  if public.has_role('community') then return 'community'; end if;
  if auth.uid() is not null then return 'guest'; end if;
  return null;
end;
$$;

create or replace function public.audit_material_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_new jsonb;
  row_old jsonb;
  entity uuid;
begin
  if tg_op = 'DELETE' then
    row_old := to_jsonb(old);
    entity := old.id;
  elsif tg_op = 'INSERT' then
    row_new := to_jsonb(new);
    entity := new.id;
  else
    row_new := to_jsonb(new);
    row_old := to_jsonb(old);
    entity := new.id;
  end if;

  insert into public.audit_events (
    actor_id,
    actor_role,
    entity_type,
    entity_id,
    event_type,
    reason,
    payload
  ) values (
    auth.uid(),
    public.current_app_role(),
    tg_table_name,
    entity,
    lower(tg_op),
    coalesce(nullif(current_setting('app.lh_reason', true), ''), 'database_write'),
    jsonb_build_object('old', row_old, 'new', row_new)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events are append-only';
end;
$$;

drop trigger if exists audit_events_no_update_delete on public.audit_events;
create trigger audit_events_no_update_delete
before update or delete on public.audit_events
for each row execute function public.prevent_audit_mutation();

create or replace function public.guard_property_lifecycle_update()
returns trigger
language plpgsql
as $$
begin
  if old.lifecycle is distinct from new.lifecycle then
    if current_setting('app.lh_transition_property', true) is distinct from new.id::text then
      raise exception 'property lifecycle must change through a controlled transition';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_lifecycle_guard on public.properties;
create trigger properties_lifecycle_guard
before update on public.properties
for each row execute function public.guard_property_lifecycle_update();

create or replace function public.guard_evidence_update()
returns trigger
language plpgsql
as $$
begin
  if old.property_id is distinct from new.property_id
     or old.moment_id is distinct from new.moment_id
     or old.submitted_by is distinct from new.submitted_by then
    raise exception 'evidence identity is immutable';
  end if;

  if old.status <> 'pending' then
    if old.claim is distinct from new.claim
       or old.provenance is distinct from new.provenance then
      raise exception 'reviewed evidence content is immutable';
    end if;
  elsif new.status = 'pending' then
    if auth.uid() is distinct from old.submitted_by
       and not public.has_role('admin') then
      raise exception 'only the submitter may edit pending evidence content';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists property_moment_evidence_guard on public.property_moment_evidence;
create trigger property_moment_evidence_guard
before update on public.property_moment_evidence
for each row execute function public.guard_evidence_update();

create or replace function public.validate_evidence_media_property()
returns trigger
language plpgsql
as $$
declare
  evidence_property uuid;
  media_property uuid;
begin
  select property_id into evidence_property from public.property_moment_evidence where id = new.evidence_id;
  select property_id into media_property from public.media_assets where id = new.media_asset_id;
  if evidence_property is null or media_property is null or evidence_property <> media_property then
    raise exception 'evidence media must belong to the same property';
  end if;
  return new;
end;
$$;

drop trigger if exists evidence_media_property_guard on public.evidence_media;
create trigger evidence_media_property_guard
before insert on public.evidence_media
for each row execute function public.validate_evidence_media_property();

-- Owners express decisions, but cannot force lifecycle changes directly.
drop policy if exists properties_owner_update on public.properties;
create policy properties_operator_update on public.properties
for update to authenticated
using (public.has_role('operator') or public.has_role('admin'))
with check (public.has_role('operator') or public.has_role('admin'));

-- Owner decisions must belong to the actual owner of the selected property.
drop policy if exists owner_decision_write on public.owner_decisions;
create policy owner_decision_write on public.owner_decisions
for insert to authenticated
with check (
  public.has_role('admin')
  or (
    owner_user_id = auth.uid()
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_user_id = auth.uid()
    )
  )
);

-- Evidence submission/review boundaries.
drop policy if exists evidence_submit on public.property_moment_evidence;
create policy evidence_submit on public.property_moment_evidence
for insert to authenticated
with check (
  public.has_role('admin')
  or (
    submitted_by = auth.uid()
    and (public.has_role('scout') or public.has_role('assessor') or public.has_role('operator'))
  )
);

create policy evidence_submitter_update on public.property_moment_evidence
for update to authenticated
using (submitted_by = auth.uid() and status = 'pending')
with check (submitted_by = auth.uid());

-- Attachments are denied unless the evidence and media resolve to the same property.
create policy evidence_media_staff_read on public.evidence_media
for select to authenticated
using (
  exists (
    select 1
    from public.property_moment_evidence e
    join public.properties p on p.id = e.property_id
    where e.id = evidence_id
      and (
        p.owner_user_id = auth.uid()
        or public.has_role('scout')
        or public.has_role('assessor')
        or public.has_role('operator')
        or public.has_role('admin')
      )
  )
);

create policy evidence_media_staff_insert on public.evidence_media
for insert to authenticated
with check (
  exists (
    select 1
    from public.property_moment_evidence e
    join public.media_assets m on m.id = media_asset_id
    where e.id = evidence_id
      and e.property_id = m.property_id
      and (
        public.has_role('admin')
        or public.has_role('assessor')
        or public.has_role('operator')
        or (e.submitted_by = auth.uid() and e.status = 'pending')
      )
  )
);

-- Scout workflow.
create policy scout_submissions_read on public.scout_submissions
for select to authenticated
using (
  scout_user_id = auth.uid()
  or public.has_role('assessor')
  or public.has_role('operator')
  or public.has_role('admin')
);

create policy scout_submissions_create on public.scout_submissions
for insert to authenticated
with check (scout_user_id = auth.uid() and public.has_role('scout'));

create policy scout_submissions_review on public.scout_submissions
for update to authenticated
using (public.has_role('operator') or public.has_role('admin'))
with check (public.has_role('operator') or public.has_role('admin'));

-- Assessment workflow.
create policy assessments_read on public.assessments
for select to authenticated
using (
  assessor_user_id = auth.uid()
  or public.has_role('operator')
  or public.has_role('admin')
);

create policy assessments_create on public.assessments
for insert to authenticated
with check (assessor_user_id = auth.uid() and public.has_role('assessor'));

create policy assessments_update_own on public.assessments
for update to authenticated
using (assessor_user_id = auth.uid() and public.has_role('assessor'))
with check (assessor_user_id = auth.uid() and public.has_role('assessor'));

create policy assessments_admin_update on public.assessments
for update to authenticated
using (public.has_role('operator') or public.has_role('admin'))
with check (public.has_role('operator') or public.has_role('admin'));

-- Partners are internal operating data.
create policy partners_staff_read on public.partners
for select to authenticated
using (public.has_role('operator') or public.has_role('admin'));

create policy partners_admin_write on public.partners
for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- Operator can move enquiries after submission. Guest cannot self-accept.
create policy enquiries_operator_update on public.booking_enquiries
for update to authenticated
using (public.has_role('operator') or public.has_role('admin'))
with check (public.has_role('operator') or public.has_role('admin'));

create or replace function public.transition_property(
  p_property_id uuid,
  p_target public.property_lifecycle,
  p_reason text
)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.properties;
  result_row public.properties;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then
    raise exception 'operator or admin role required';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'transition reason required';
  end if;

  select * into current_row from public.properties where id = p_property_id for update;
  if current_row.id is null then raise exception 'property not found'; end if;
  if p_target = 'live' then raise exception 'use activate_property for live transition'; end if;

  if p_target = 'assessment' and current_row.lifecycle not in ('draft','suspended') then
    raise exception 'invalid transition to assessment from %', current_row.lifecycle;
  elsif p_target = 'qualified' then
    if current_row.lifecycle <> 'assessment' then
      raise exception 'invalid transition to qualified from %', current_row.lifecycle;
    end if;
    if not exists (
      select 1 from public.assessments a
      where a.property_id = p_property_id and a.status = 'accepted'
    ) then
      raise exception 'accepted assessment required';
    end if;
    if not exists (
      select 1
      from public.property_moment_evidence e
      join public.evidence_media em on em.evidence_id = e.id
      join public.moments m on m.id = e.moment_id
      where e.property_id = p_property_id
        and e.status = 'verified'
        and (e.expires_at is null or e.expires_at > now())
        and m.status = 'active'
    ) then
      raise exception 'verified Moment evidence with media required';
    end if;
  elsif p_target = 'suspended' and current_row.lifecycle not in ('live','qualified') then
    raise exception 'invalid transition to suspended from %', current_row.lifecycle;
  elsif p_target = 'retired' and current_row.lifecycle = 'retired' then
    raise exception 'property already retired';
  elsif p_target not in ('assessment','qualified','suspended','retired') then
    raise exception 'unsupported transition target %', p_target;
  end if;

  perform set_config('app.lh_transition_property', p_property_id::text, true);
  perform set_config('app.lh_reason', p_reason, true);
  update public.properties set lifecycle = p_target, updated_at = now() where id = p_property_id returning * into result_row;
  perform set_config('app.lh_transition_property', '', true);
  perform set_config('app.lh_reason', '', true);
  return result_row;
end;
$$;

create or replace function public.activate_property(
  p_property_id uuid,
  p_reason text
)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.properties;
  latest_owner_decision text;
  latest_readiness public.operational_readiness;
  result_row public.properties;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then
    raise exception 'operator or admin role required';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'activation reason required';
  end if;

  select * into current_row from public.properties where id = p_property_id for update;
  if current_row.id is null then raise exception 'property not found'; end if;
  if current_row.lifecycle <> 'qualified' then
    raise exception 'property must be qualified before activation';
  end if;

  select decision into latest_owner_decision
  from public.owner_decisions
  where property_id = p_property_id
  order by decided_at desc, id desc
  limit 1;

  if latest_owner_decision is distinct from 'activate' then
    raise exception 'latest owner decision must be activate';
  end if;

  if not exists (
    select 1
    from public.property_moment_evidence e
    join public.evidence_media em on em.evidence_id = e.id
    join public.moments m on m.id = e.moment_id
    where e.property_id = p_property_id
      and e.status = 'verified'
      and (e.expires_at is null or e.expires_at > now())
      and m.status = 'active'
  ) then
    raise exception 'current verified Moment evidence required';
  end if;

  select * into latest_readiness
  from public.operational_readiness
  where property_id = p_property_id
  order by checked_at desc, id desc
  limit 1;

  if latest_readiness.id is null
     or latest_readiness.status <> 'ready'
     or latest_readiness.expires_at is null
     or latest_readiness.expires_at <= now() then
    raise exception 'current operational readiness required';
  end if;

  if exists (
    select 1 from public.risk_signals r
    where r.property_id = p_property_id
      and r.resolved = false
      and r.severity in ('medium','high')
  ) then
    raise exception 'unresolved material risk blocks activation';
  end if;

  perform set_config('app.lh_transition_property', p_property_id::text, true);
  perform set_config('app.lh_reason', p_reason, true);
  update public.properties set lifecycle = 'live', updated_at = now() where id = p_property_id returning * into result_row;
  perform set_config('app.lh_transition_property', '', true);
  perform set_config('app.lh_reason', '', true);
  return result_row;
end;
$$;

grant execute on function public.transition_property(uuid, public.property_lifecycle, text) to authenticated;
grant execute on function public.activate_property(uuid, text) to authenticated;

-- Guest discovery now fails closed on readiness and unresolved material risk.
create or replace view public.guest_moment_properties as
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
  and media.public_safe = true
  and exists (
    select 1
    from public.operational_readiness r
    where r.property_id = p.id
      and r.status = 'ready'
      and r.expires_at > now()
      and r.id = (
        select r2.id
        from public.operational_readiness r2
        where r2.property_id = p.id
        order by r2.checked_at desc, r2.id desc
        limit 1
      )
  )
  and not exists (
    select 1 from public.risk_signals rs
    where rs.property_id = p.id
      and rs.resolved = false
      and rs.severity in ('medium','high')
  );

grant select on public.guest_moment_properties to anon, authenticated;

-- Material tables must emit audit events. Audit row itself is protected above.
do $$
declare
  t text;
begin
  foreach t in array array[
    'properties',
    'scout_submissions',
    'assessments',
    'owner_decisions',
    'property_moment_evidence',
    'availability_windows',
    'rates',
    'operational_readiness',
    'booking_enquiries',
    'mastermind_decisions',
    'risk_signals'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'audit_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_material_change()',
      'audit_' || t,
      t
    );
  end loop;
end $$;

commit;
