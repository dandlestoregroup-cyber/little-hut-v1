begin;

-- Operationally useful property detail without exposing internal evidence.
alter table public.properties add column if not exists location_label text;
alter table public.properties add column if not exists short_description text;
alter table public.properties add column if not exists max_guests integer check (max_guests is null or max_guests between 1 and 30);
alter table public.properties add column if not exists bedrooms smallint check (bedrooms is null or bedrooms >= 0);
alter table public.properties add column if not exists bathrooms numeric(4,1) check (bathrooms is null or bathrooms >= 0);

alter table public.scout_submissions add column if not exists candidate_name text;
alter table public.scout_submissions add column if not exists location_label text;
alter table public.scout_submissions add column if not exists notes text;

alter table public.guest_intents add column if not exists request_key text;
alter table public.booking_enquiries add column if not exists request_key text;
alter table public.booking_enquiries add column if not exists decision_id uuid references public.mastermind_decisions(id);

create unique index if not exists guest_intents_user_request_key_unique
  on public.guest_intents(user_id, request_key)
  where user_id is not null and request_key is not null;
create unique index if not exists booking_enquiries_user_request_key_unique
  on public.booking_enquiries(user_id, request_key)
  where user_id is not null and request_key is not null;
create index if not exists availability_property_dates_idx on public.availability_windows(property_id, start_date, end_date, checked_at desc);
create index if not exists rates_property_dates_idx on public.rates(property_id, start_date, end_date, checked_at desc);
create index if not exists readiness_property_checked_idx on public.operational_readiness(property_id, checked_at desc);
create index if not exists evidence_property_moment_status_idx on public.property_moment_evidence(property_id, moment_id, status);
create index if not exists risks_property_resolution_idx on public.risk_signals(property_id, resolved, severity);

-- Every authenticated user receives a profile and a least-privilege guest role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles(user_id, role)
  values (new.id, 'guest')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- One scoped access predicate is reused by every property-sensitive policy.
create or replace function public.can_access_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and (
        p.owner_user_id = auth.uid()
        or public.has_role('operator')
        or public.has_role('admin')
        or exists (
          select 1 from public.assessments a
          where a.property_id = p.id and a.assessor_user_id = auth.uid()
        )
        or exists (
          select 1 from public.scout_submissions s
          where s.property_id = p.id and s.scout_user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.can_access_property(uuid) to authenticated;

-- Replace broad role-wide reads with property assignment/ownership boundaries.
drop policy if exists properties_staff_read on public.properties;
create policy properties_scoped_read on public.properties
for select to authenticated
using (public.can_access_property(id));

drop policy if exists media_staff_read on public.media_assets;
create policy media_scoped_read on public.media_assets
for select to authenticated
using (public.can_access_property(property_id));

drop policy if exists media_staff_write on public.media_assets;
create policy media_scoped_insert on public.media_assets
for insert to authenticated
with check (
  public.can_access_property(property_id)
  and public_safe = false
  and (public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('admin'))
);

drop policy if exists evidence_staff_read on public.property_moment_evidence;
create policy evidence_scoped_read on public.property_moment_evidence
for select to authenticated
using (public.can_access_property(property_id));

drop policy if exists evidence_submit on public.property_moment_evidence;
drop policy if exists evidence_review on public.property_moment_evidence;
drop policy if exists evidence_submitter_update on public.property_moment_evidence;
create policy evidence_pending_submitter_update on public.property_moment_evidence
for update to authenticated
using (submitted_by = auth.uid() and status = 'pending' and public.can_access_property(property_id))
with check (submitted_by = auth.uid() and public.can_access_property(property_id));

drop policy if exists evidence_media_staff_read on public.evidence_media;
create policy evidence_media_scoped_read on public.evidence_media
for select to authenticated
using (
  exists (
    select 1 from public.property_moment_evidence e
    where e.id = evidence_id and public.can_access_property(e.property_id)
  )
);

drop policy if exists evidence_media_staff_insert on public.evidence_media;
-- Evidence/media links are created only by submit_moment_evidence().

drop policy if exists scout_submissions_read on public.scout_submissions;
create policy scout_submissions_scoped_read on public.scout_submissions
for select to authenticated
using (
  scout_user_id = auth.uid()
  or public.has_role('operator')
  or public.has_role('admin')
  or (property_id is not null and public.can_access_property(property_id))
);

drop policy if exists scout_submissions_review on public.scout_submissions;
-- Review is performed only through accept/reject workflow functions.

drop policy if exists assessments_read on public.assessments;
create policy assessments_scoped_read on public.assessments
for select to authenticated
using (assessor_user_id = auth.uid() or public.has_role('operator') or public.has_role('admin'));

drop policy if exists assessments_create on public.assessments;
drop policy if exists assessments_update_own on public.assessments;
drop policy if exists assessments_admin_update on public.assessments;
-- Assessment assignment/submission/review are RPC-only.

drop policy if exists risk_staff_read on public.risk_signals;
create policy risk_scoped_read on public.risk_signals
for select to authenticated
using (public.can_access_property(property_id));

drop policy if exists risk_staff_create on public.risk_signals;
create policy risk_scoped_create on public.risk_signals
for insert to authenticated
with check (
  public.can_access_property(property_id)
  and (public.has_role('assessor') or public.has_role('operator') or public.has_role('admin'))
);

drop policy if exists risk_operator_resolve on public.risk_signals;
-- Risk resolution is RPC-only so identity fields cannot be rewritten.

drop policy if exists readiness_staff_read on public.operational_readiness;
create policy readiness_scoped_read on public.operational_readiness
for select to authenticated
using (public.can_access_property(property_id));

drop policy if exists readiness_staff_write on public.operational_readiness;
create policy readiness_scoped_insert on public.operational_readiness
for insert to authenticated
with check (
  public.can_access_property(property_id)
  and (public.has_role('operator') or public.has_role('admin'))
);

drop policy if exists truth_owner_operator_read_availability on public.availability_windows;
create policy availability_scoped_read on public.availability_windows
for select to authenticated
using (public.can_access_property(property_id));

drop policy if exists truth_owner_operator_write_availability on public.availability_windows;
create policy availability_scoped_insert on public.availability_windows
for insert to authenticated
with check (
  public.can_access_property(property_id)
  and (
    public.has_role('operator') or public.has_role('admin')
    or exists (select 1 from public.properties p where p.id = property_id and p.owner_user_id = auth.uid())
  )
);

drop policy if exists truth_owner_operator_read_rates on public.rates;
create policy rates_scoped_read on public.rates
for select to authenticated
using (public.can_access_property(property_id));

drop policy if exists truth_owner_operator_write_rates on public.rates;
create policy rates_scoped_insert on public.rates
for insert to authenticated
with check (
  public.can_access_property(property_id)
  and (
    public.has_role('operator') or public.has_role('admin')
    or exists (select 1 from public.properties p where p.id = property_id and p.owner_user_id = auth.uid())
  )
);

-- Guest intent is append-only. Enquiries cannot bypass Mastermind by direct client INSERT.
drop policy if exists intents_own on public.guest_intents;
create policy intents_own_read on public.guest_intents
for select to authenticated using (user_id = auth.uid());

drop policy if exists enquiries_own_create on public.booking_enquiries;

-- Guard direct evidence status changes. Only the independent review RPC may set a verdict.
create or replace function public.guard_evidence_update()
returns trigger
language plpgsql
as $$
begin
  if old.property_id is distinct from new.property_id
     or old.moment_id is distinct from new.moment_id
     or old.submitted_by is distinct from new.submitted_by
     or old.created_at is distinct from new.created_at then
    raise exception 'evidence identity is immutable';
  end if;

  if old.status is distinct from new.status
     or old.reviewed_by is distinct from new.reviewed_by
     or old.reviewed_at is distinct from new.reviewed_at
     or old.expires_at is distinct from new.expires_at then
    if current_setting('app.lh_review_evidence', true) is distinct from new.id::text then
      raise exception 'evidence verdict must change through review_moment_evidence';
    end if;
  end if;

  if old.status <> 'pending' and (
    old.claim is distinct from new.claim or old.provenance is distinct from new.provenance
  ) then
    raise exception 'reviewed evidence content is immutable';
  end if;

  if old.status = 'pending' and new.status = 'pending' and (
    old.claim is distinct from new.claim or old.provenance is distinct from new.provenance
  ) then
    if auth.uid() is distinct from old.submitted_by and not public.has_role('admin') then
      raise exception 'only the submitter may edit pending evidence';
    end if;
  end if;

  return new;
end;
$$;

-- Public-safety promotion can never be toggled by a client-side table update.
create or replace function public.guard_media_public_safety()
returns trigger
language plpgsql
as $$
begin
  if old.public_safe is distinct from new.public_safe then
    if current_setting('app.lh_promote_media', true) is distinct from new.id::text then
      raise exception 'media public safety must change through controlled promotion';
    end if;
  end if;
  if old.property_id is distinct from new.property_id or old.storage_path is distinct from new.storage_path then
    raise exception 'media identity is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists media_assets_public_safety_guard on public.media_assets;
create trigger media_assets_public_safety_guard
before update on public.media_assets
for each row execute function public.guard_media_public_safety();

create or replace function public.guard_enquiry_update()
returns trigger
language plpgsql
as $$
begin
  if old.intent_id is distinct from new.intent_id
     or old.property_id is distinct from new.property_id
     or old.user_id is distinct from new.user_id
     or old.request_key is distinct from new.request_key
     or old.decision_id is distinct from new.decision_id
     or old.created_at is distinct from new.created_at then
    raise exception 'booking enquiry identity is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_enquiries_identity_guard on public.booking_enquiries;
create trigger booking_enquiries_identity_guard
before update on public.booking_enquiries
for each row execute function public.guard_enquiry_update();

create or replace function public.guard_risk_update()
returns trigger
language plpgsql
as $$
begin
  if old.property_id is distinct from new.property_id
     or old.moment_id is distinct from new.moment_id
     or old.code is distinct from new.code
     or old.severity is distinct from new.severity
     or old.provenance is distinct from new.provenance
     or old.created_at is distinct from new.created_at then
    raise exception 'risk identity is immutable';
  end if;
  if old.resolved = true and new.resolved = false then
    raise exception 'resolved risk cannot be reopened by mutation';
  end if;
  return new;
end;
$$;

drop trigger if exists risk_signals_identity_guard on public.risk_signals;
create trigger risk_signals_identity_guard
before update on public.risk_signals
for each row execute function public.guard_risk_update();

create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'cannot remove the last admin';
  end if;
  return old;
end;
$$;

drop trigger if exists user_roles_last_admin_guard on public.user_roles;
create trigger user_roles_last_admin_guard
before delete on public.user_roles
for each row execute function public.prevent_last_admin_removal();

-- Atomic evidence submission: evidence and its attachments either all exist or none do.
create or replace function public.submit_moment_evidence(
  p_property_id uuid,
  p_moment_id uuid,
  p_claim text,
  p_provenance jsonb,
  p_media_asset_ids uuid[]
)
returns public.property_moment_evidence
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.property_moment_evidence;
  media_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not (public.has_role('scout') or public.has_role('assessor') or public.has_role('operator') or public.has_role('admin')) then
    raise exception 'evidence role required';
  end if;
  if not public.can_access_property(p_property_id) then raise exception 'property access denied'; end if;
  if p_claim is null or btrim(p_claim) = '' then raise exception 'evidence claim required'; end if;
  if p_provenance is null or not (p_provenance ?& array['source','sourceRef','capturedAt','method']) then
    raise exception 'complete provenance required';
  end if;
  if coalesce(array_length(p_media_asset_ids, 1), 0) < 1 then raise exception 'supporting media required'; end if;

  select count(*) into media_count
  from public.media_assets m
  where m.id = any(p_media_asset_ids) and m.property_id = p_property_id;
  if media_count <> array_length(p_media_asset_ids, 1) then
    raise exception 'every media asset must belong to the property';
  end if;

  insert into public.property_moment_evidence(property_id, moment_id, status, claim, provenance, submitted_by)
  values (p_property_id, p_moment_id, 'pending', p_claim, p_provenance, auth.uid())
  returning * into result_row;

  insert into public.evidence_media(evidence_id, media_asset_id)
  select result_row.id, unnest(p_media_asset_ids);

  return result_row;
end;
$$;

grant execute on function public.submit_moment_evidence(uuid, uuid, text, jsonb, uuid[]) to authenticated;

-- Independent review is mandatory. A submitter can never verify their own evidence.
create or replace function public.review_moment_evidence(
  p_evidence_id uuid,
  p_status public.evidence_status,
  p_reason text,
  p_expires_at timestamptz default null
)
returns public.property_moment_evidence
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.property_moment_evidence;
  result_row public.property_moment_evidence;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not (public.has_role('assessor') or public.has_role('admin')) then raise exception 'assessor or admin role required'; end if;
  if p_status not in ('verified','rejected') then raise exception 'review status must be verified or rejected'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'review reason required'; end if;

  select * into current_row from public.property_moment_evidence where id = p_evidence_id for update;
  if current_row.id is null then raise exception 'evidence not found'; end if;
  if not public.can_access_property(current_row.property_id) and not public.has_role('admin') then raise exception 'property access denied'; end if;
  if current_row.status <> 'pending' then raise exception 'only pending evidence can be reviewed'; end if;
  if current_row.submitted_by = auth.uid() then raise exception 'independent reviewer required'; end if;

  if p_status = 'verified' then
    if p_expires_at is null or p_expires_at <= now() then raise exception 'future evidence expiry required'; end if;
    if not exists (
      select 1
      from public.evidence_media em
      join public.media_assets m on m.id = em.media_asset_id
      where em.evidence_id = p_evidence_id and m.kind = 'photo'
    ) then
      raise exception 'verified Moment evidence requires at least one photo';
    end if;
  end if;

  perform set_config('app.lh_review_evidence', p_evidence_id::text, true);
  perform set_config('app.lh_reason', p_reason, true);
  update public.property_moment_evidence
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      expires_at = case when p_status = 'verified' then p_expires_at else null end
  where id = p_evidence_id
  returning * into result_row;
  perform set_config('app.lh_review_evidence', '', true);
  perform set_config('app.lh_reason', '', true);

  return result_row;
end;
$$;

grant execute on function public.review_moment_evidence(uuid, public.evidence_status, text, timestamptz) to authenticated;

-- Service-only step after review and storage copy succeeds.
create or replace function public.mark_media_public_safe(p_media_id uuid, p_reason text)
returns public.media_assets
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.media_assets;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'promotion reason required'; end if;
  if not exists (select 1 from public.media_assets where id = p_media_id and kind = 'photo') then
    raise exception 'photo media not found';
  end if;
  perform set_config('app.lh_promote_media', p_media_id::text, true);
  perform set_config('app.lh_reason', p_reason, true);
  update public.media_assets set public_safe = true where id = p_media_id returning * into result_row;
  perform set_config('app.lh_promote_media', '', true);
  perform set_config('app.lh_reason', '', true);
  return result_row;
end;
$$;

revoke all on function public.mark_media_public_safe(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_media_public_safe(uuid, text) to service_role;

create or replace function public.assign_assessment(p_property_id uuid, p_assessor_user_id uuid)
returns public.assessments
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.assessments;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then raise exception 'operator or admin role required'; end if;
  if not exists (select 1 from public.user_roles where user_id = p_assessor_user_id and role = 'assessor') then
    raise exception 'selected user is not an assessor';
  end if;
  insert into public.assessments(property_id, assessor_user_id, status)
  values (p_property_id, p_assessor_user_id, 'draft') returning * into result_row;
  return result_row;
end;
$$;

grant execute on function public.assign_assessment(uuid, uuid) to authenticated;

create or replace function public.submit_assessment(p_assessment_id uuid, p_findings jsonb)
returns public.assessments
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.assessments;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.assessments
  set findings = coalesce(p_findings, '{}'::jsonb), status = 'submitted', assessed_at = now()
  where id = p_assessment_id and assessor_user_id = auth.uid() and status = 'draft'
  returning * into result_row;
  if result_row.id is null then raise exception 'assigned draft assessment not found'; end if;
  return result_row;
end;
$$;

grant execute on function public.submit_assessment(uuid, jsonb) to authenticated;

create or replace function public.review_assessment(p_assessment_id uuid, p_status text, p_reason text)
returns public.assessments
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.assessments;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then raise exception 'operator or admin role required'; end if;
  if p_status not in ('accepted','rejected') then raise exception 'review status must be accepted or rejected'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'review reason required'; end if;
  perform set_config('app.lh_reason', p_reason, true);
  update public.assessments set status = p_status
  where id = p_assessment_id and status = 'submitted'
  returning * into result_row;
  perform set_config('app.lh_reason', '', true);
  if result_row.id is null then raise exception 'submitted assessment not found'; end if;
  return result_row;
end;
$$;

grant execute on function public.review_assessment(uuid, text, text) to authenticated;

create or replace function public.accept_scout_submission(
  p_submission_id uuid,
  p_slug text,
  p_name text,
  p_reason text
)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare submission_row public.scout_submissions;
declare property_row public.properties;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then raise exception 'operator or admin role required'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'acceptance reason required'; end if;
  select * into submission_row from public.scout_submissions where id = p_submission_id for update;
  if submission_row.id is null or submission_row.status <> 'submitted' then raise exception 'submitted scout record not found'; end if;
  insert into public.properties(slug, name, location_label, lifecycle)
  values (p_slug, p_name, submission_row.location_label, 'draft') returning * into property_row;
  perform set_config('app.lh_reason', p_reason, true);
  update public.scout_submissions set status = 'accepted', property_id = property_row.id where id = p_submission_id;
  perform set_config('app.lh_reason', '', true);
  return property_row;
end;
$$;

grant execute on function public.accept_scout_submission(uuid, text, text, text) to authenticated;

create or replace function public.reject_scout_submission(p_submission_id uuid, p_reason text)
returns public.scout_submissions
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.scout_submissions;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then raise exception 'operator or admin role required'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'rejection reason required'; end if;
  perform set_config('app.lh_reason', p_reason, true);
  update public.scout_submissions set status = 'rejected'
  where id = p_submission_id and status = 'submitted'
  returning * into result_row;
  perform set_config('app.lh_reason', '', true);
  if result_row.id is null then raise exception 'submitted scout record not found'; end if;
  return result_row;
end;
$$;

grant execute on function public.reject_scout_submission(uuid, text) to authenticated;

create or replace function public.resolve_risk(p_risk_id uuid, p_reason text)
returns public.risk_signals
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.risk_signals;
begin
  if not (public.has_role('operator') or public.has_role('admin')) then raise exception 'operator or admin role required'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'resolution reason required'; end if;
  perform set_config('app.lh_reason', p_reason, true);
  update public.risk_signals
  set resolved = true, resolved_at = now(), resolved_by = auth.uid()
  where id = p_risk_id and resolved = false
  returning * into result_row;
  perform set_config('app.lh_reason', '', true);
  if result_row.id is null then raise exception 'open risk not found'; end if;
  return result_row;
end;
$$;

grant execute on function public.resolve_risk(uuid, text) to authenticated;

-- Only the trusted server may persist a Mastermind result and its resulting enquiry.
create or replace function public.finalize_guest_decision(
  p_user_id uuid,
  p_property_id uuid,
  p_moment_id uuid,
  p_start_date date,
  p_end_date date,
  p_party_size integer,
  p_action text,
  p_reasons jsonb,
  p_evidence_ids uuid[],
  p_engine_version text,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  intent_row public.guest_intents;
  decision_row public.mastermind_decisions;
  enquiry_row public.booking_enquiries;
  existing_intent_id uuid;
begin
  if p_user_id is null or p_request_key is null or btrim(p_request_key) = '' then raise exception 'user and request key required'; end if;
  if p_action not in ('recommend','block','escalate') then raise exception 'invalid Mastermind action'; end if;
  if p_end_date <= p_start_date then raise exception 'invalid stay dates'; end if;
  if p_party_size < 1 or p_party_size > 30 then raise exception 'invalid party size'; end if;

  select id into existing_intent_id from public.guest_intents
  where user_id = p_user_id and request_key = p_request_key
  limit 1;

  if existing_intent_id is not null then
    select * into decision_row from public.mastermind_decisions
    where intent_id = existing_intent_id order by decided_at desc, id desc limit 1;
    select * into enquiry_row from public.booking_enquiries
    where intent_id = existing_intent_id limit 1;
    return jsonb_build_object(
      'intentId', existing_intent_id,
      'decisionId', decision_row.id,
      'enquiryId', enquiry_row.id,
      'action', decision_row.action,
      'idempotentReplay', true
    );
  end if;

  insert into public.guest_intents(user_id, desired_moment_id, start_date, end_date, party_size, request_key)
  values (p_user_id, p_moment_id, p_start_date, p_end_date, p_party_size, p_request_key)
  returning * into intent_row;

  insert into public.mastermind_decisions(property_id, moment_id, intent_id, action, reasons, evidence_ids, engine_version)
  values (p_property_id, p_moment_id, intent_row.id, p_action, coalesce(p_reasons, '[]'::jsonb), coalesce(p_evidence_ids, '{}'), p_engine_version)
  returning * into decision_row;

  if p_action <> 'block' then
    insert into public.booking_enquiries(intent_id, property_id, user_id, status, request_key, decision_id)
    values (
      intent_row.id,
      p_property_id,
      p_user_id,
      case when p_action = 'escalate' then 'reviewing' else 'submitted' end,
      p_request_key,
      decision_row.id
    )
    returning * into enquiry_row;
  end if;

  insert into public.audit_events(actor_id, actor_role, entity_type, entity_id, event_type, reason, payload)
  values (
    p_user_id,
    'guest',
    'mastermind_decisions',
    decision_row.id,
    'decision_finalized',
    'mastermind_booking_gate',
    jsonb_build_object('action', p_action, 'intentId', intent_row.id, 'enquiryId', enquiry_row.id)
  );

  return jsonb_build_object(
    'intentId', intent_row.id,
    'decisionId', decision_row.id,
    'enquiryId', enquiry_row.id,
    'action', p_action,
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.finalize_guest_decision(uuid, uuid, uuid, date, date, integer, text, jsonb, uuid[], text, text) from public, anon, authenticated;
grant execute on function public.finalize_guest_decision(uuid, uuid, uuid, date, date, integer, text, jsonb, uuid[], text, text) to service_role;

-- Role changes are performed by the trusted admin API. The DB prevents deleting the final admin.
revoke insert, update, delete on public.user_roles from authenticated;

-- Keep the public projection sparse, cinematic, and evidence-only.
create or replace view public.guest_moment_properties as
select distinct
  p.id as property_id,
  p.slug as property_slug,
  p.name as property_name,
  p.location_label,
  p.short_description,
  p.max_guests,
  p.bedrooms,
  p.bathrooms,
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
  and e.expires_at > now()
  and media.public_safe = true
  and exists (
    select 1 from public.operational_readiness r
    where r.property_id = p.id
      and r.status = 'ready'
      and r.expires_at > now()
      and r.id = (
        select r2.id from public.operational_readiness r2
        where r2.property_id = p.id
        order by r2.checked_at desc, r2.id desc limit 1
      )
  )
  and not exists (
    select 1 from public.risk_signals rs
    where rs.property_id = p.id and rs.resolved = false and rs.severity in ('medium','high')
  );

grant select on public.guest_moment_properties to anon, authenticated;

-- Guest intents now participate in the audit chain.
drop trigger if exists audit_guest_intents on public.guest_intents;
create trigger audit_guest_intents
after insert or update or delete on public.guest_intents
for each row execute function public.audit_material_change();

commit;
