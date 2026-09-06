begin;

-- New properties always begin as drafts. Lifecycle is earned through controlled transitions.
create or replace function public.guard_property_insert()
returns trigger
language plpgsql
as $$
begin
  if new.lifecycle <> 'draft' then
    raise exception 'new properties must begin as draft';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_insert_guard on public.properties;
create trigger properties_insert_guard
before insert on public.properties
for each row execute function public.guard_property_insert();

drop policy if exists properties_owner_create on public.properties;

create or replace function public.create_property(
  p_slug text,
  p_name text,
  p_location_label text default null,
  p_short_description text default null,
  p_max_guests integer default null,
  p_bedrooms smallint default null,
  p_bathrooms numeric default null,
  p_owner_user_id uuid default null
)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.properties;
  resolved_owner uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not (public.has_role('owner') or public.has_role('operator') or public.has_role('admin')) then
    raise exception 'owner, operator or admin role required';
  end if;
  if p_slug is null or btrim(p_slug) = '' or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'valid lowercase slug required';
  end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'property name required'; end if;

  if public.has_role('operator') or public.has_role('admin') then
    resolved_owner := p_owner_user_id;
  else
    resolved_owner := auth.uid();
    if p_owner_user_id is not null and p_owner_user_id <> auth.uid() then
      raise exception 'owner may only create their own property';
    end if;
  end if;

  perform set_config('app.lh_reason', 'controlled_property_create', true);
  insert into public.properties(
    slug, name, location_label, short_description, max_guests, bedrooms, bathrooms, owner_user_id, lifecycle
  ) values (
    p_slug, p_name, p_location_label, p_short_description, p_max_guests, p_bedrooms, p_bathrooms, resolved_owner, 'draft'
  ) returning * into result_row;
  perform set_config('app.lh_reason', '', true);

  return result_row;
end;
$$;

grant execute on function public.create_property(text, text, text, text, integer, smallint, numeric, uuid) to authenticated;

-- Direct property updates are removed. Details are changed by a reasoned RPC; lifecycle remains separately controlled.
drop policy if exists properties_operator_update on public.properties;

create or replace function public.update_property_details(
  p_property_id uuid,
  p_name text,
  p_location_label text,
  p_short_description text,
  p_max_guests integer,
  p_bedrooms smallint,
  p_bathrooms numeric,
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
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into current_row from public.properties where id = p_property_id for update;
  if current_row.id is null then raise exception 'property not found'; end if;
  if not (
    public.has_role('operator')
    or public.has_role('admin')
    or current_row.owner_user_id = auth.uid()
  ) then raise exception 'property update access denied'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'property name required'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'update reason required'; end if;

  perform set_config('app.lh_reason', p_reason, true);
  update public.properties
  set name = p_name,
      location_label = p_location_label,
      short_description = p_short_description,
      max_guests = p_max_guests,
      bedrooms = p_bedrooms,
      bathrooms = p_bathrooms,
      updated_at = now()
  where id = p_property_id
  returning * into result_row;
  perform set_config('app.lh_reason', '', true);

  return result_row;
end;
$$;

grant execute on function public.update_property_details(uuid, text, text, text, integer, smallint, numeric, text) to authenticated;

-- Enquiry status is forward-only and terminal states cannot be silently reopened.
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

  if old.status is distinct from new.status then
    if old.status = 'submitted' and new.status not in ('reviewing','accepted','declined','expired') then
      raise exception 'invalid enquiry transition from submitted to %', new.status;
    elsif old.status = 'reviewing' and new.status not in ('accepted','declined','expired') then
      raise exception 'invalid enquiry transition from reviewing to %', new.status;
    elsif old.status in ('accepted','declined','expired') then
      raise exception 'terminal enquiry status cannot change';
    end if;
  end if;

  return new;
end;
$$;

-- Public-safe media must be attached to currently verified evidence before it can be exposed.
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
  if not exists (
    select 1
    from public.media_assets m
    join public.evidence_media em on em.media_asset_id = m.id
    join public.property_moment_evidence e on e.id = em.evidence_id
    where m.id = p_media_id
      and m.kind = 'photo'
      and e.status = 'verified'
      and e.expires_at > now()
  ) then
    raise exception 'only media linked to current verified evidence may be public';
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

-- An idempotency key is bound to one exact booking request. Reuse with different inputs is rejected.
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
  existing_intent public.guest_intents;
begin
  if p_user_id is null or p_request_key is null or btrim(p_request_key) = '' then raise exception 'user and request key required'; end if;
  if p_action not in ('recommend','block','escalate') then raise exception 'invalid Mastermind action'; end if;
  if p_end_date <= p_start_date then raise exception 'invalid stay dates'; end if;
  if p_party_size < 1 or p_party_size > 30 then raise exception 'invalid party size'; end if;

  select * into existing_intent
  from public.guest_intents
  where user_id = p_user_id and request_key = p_request_key
  limit 1;

  if existing_intent.id is not null then
    if existing_intent.desired_moment_id <> p_moment_id
       or existing_intent.start_date <> p_start_date
       or existing_intent.end_date <> p_end_date
       or existing_intent.party_size <> p_party_size then
      raise exception 'idempotency key already belongs to a different request';
    end if;

    select * into decision_row from public.mastermind_decisions
    where intent_id = existing_intent.id order by decided_at desc, id desc limit 1;
    select * into enquiry_row from public.booking_enquiries
    where intent_id = existing_intent.id and property_id = p_property_id limit 1;

    if decision_row.id is null or decision_row.property_id <> p_property_id then
      raise exception 'idempotency key already belongs to a different property decision';
    end if;

    return jsonb_build_object(
      'intentId', existing_intent.id,
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

-- Audit content/catalogue changes that affect guest truth.
do $$
declare t text;
begin
  foreach t in array array['moments','media_assets'] loop
    execute format('drop trigger if exists %I on public.%I', 'audit_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_material_change()',
      'audit_' || t,
      t
    );
  end loop;
end $$;

commit;
