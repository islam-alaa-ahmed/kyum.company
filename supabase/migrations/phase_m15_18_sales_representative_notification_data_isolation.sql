begin;

-- ============================================================
-- KYUM CRM — Phase M15.18
-- Sales Representative Notification Data Isolation
--
-- Goal:
--   A sales representative must never receive or read a notification
--   outside their own representative scope, even when a notification
--   event is enabled for the sales_representative role in the dynamic
--   Notification Center matrix.
--
-- Other roles keep the existing dynamic matrix behavior unchanged.
-- ============================================================

create or replace function public.notification_scope_representative_id(
  p_request_id uuid default null,
  p_visit_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public
set row_security=off
stable
as $$
declare
  v_representative_id uuid;
  v_raw text;
  v_customer_id uuid;
  v_quotation_id uuid;
  v_followup_id uuid;
begin
  -- Installation request / visit is authoritative for installation events.
  if p_request_id is not null then
    select coalesce(c.representative_id,r.representative_id)
      into v_representative_id
    from public.installation_requests r
    left join public.customers c on c.id=r.customer_id
    where r.id=p_request_id;
  end if;

  if v_representative_id is null and p_visit_id is not null then
    select coalesce(c.representative_id,r.representative_id)
      into v_representative_id
    from public.installation_execution_visits v
    join public.installation_requests r on r.id=v.installation_request_id
    left join public.customers c on c.id=r.customer_id
    where v.id=p_visit_id;
  end if;

  -- Generic future events may provide the representative directly.
  if v_representative_id is null then
    v_raw:=coalesce(
      nullif(p_metadata->>'representative_id',''),
      nullif(p_metadata->>'representativeId','')
    );
    if v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_representative_id:=v_raw::uuid;
    end if;
  end if;

  -- Customer events inherit the current customer owner.
  if v_representative_id is null then
    v_raw:=coalesce(nullif(p_metadata->>'customer_id',''),nullif(p_metadata->>'customerId',''));
    if v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_customer_id:=v_raw::uuid;
      select c.representative_id into v_representative_id
      from public.customers c where c.id=v_customer_id;
    end if;
  end if;

  -- Quotation events inherit the quotation owner, falling back to customer owner.
  if v_representative_id is null then
    v_raw:=coalesce(nullif(p_metadata->>'quotation_id',''),nullif(p_metadata->>'quotationId',''));
    if v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_quotation_id:=v_raw::uuid;
      select coalesce(c.representative_id,q.representative_id)
        into v_representative_id
      from public.quotations q
      left join public.customers c on c.id=q.customer_id
      where q.id=v_quotation_id;
    end if;
  end if;

  -- Follow-up events inherit the follow-up/customer owner.
  if v_representative_id is null then
    v_raw:=coalesce(nullif(p_metadata->>'followup_id',''),nullif(p_metadata->>'followupId',''));
    if v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_followup_id:=v_raw::uuid;
      select coalesce(c.representative_id,f.representative_id)
        into v_representative_id
      from public.customer_followups f
      left join public.customers c on c.id=f.customer_id
      where f.id=v_followup_id;
    end if;
  end if;

  return v_representative_id;
end;
$$;

revoke all on function public.notification_scope_representative_id(uuid,uuid,jsonb) from public;
grant execute on function public.notification_scope_representative_id(uuid,uuid,jsonb) to authenticated;

create or replace function public.notification_is_visible_to_user(
  p_user_id uuid,
  p_request_id uuid default null,
  p_visit_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path=public
set row_security=off
stable
as $$
declare
  v_role text;
  v_user_representative_id uuid;
  v_scope_representative_id uuid;
begin
  if p_user_id is null then return false; end if;

  select up.role::text,up.representative_id
    into v_role,v_user_representative_id
  from public.user_profiles up
  where up.id=p_user_id and coalesce(up.is_active,true)=true;

  if not found then return false; end if;

  -- Only Sales Representative is hard-scoped here. All other roles remain
  -- governed by the dynamic Notification Center matrix exactly as before.
  if v_role <> 'sales_representative' then
    return true;
  end if;

  -- A sales representative without a representative binding receives nothing.
  if v_user_representative_id is null then
    return false;
  end if;

  v_scope_representative_id:=public.notification_scope_representative_id(
    p_request_id,p_visit_id,coalesce(p_metadata,'{}'::jsonb)
  );

  -- No resolvable owner = no Sales Representative delivery.
  return v_scope_representative_id is not null
     and v_scope_representative_id=v_user_representative_id;
end;
$$;

revoke all on function public.notification_is_visible_to_user(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.notification_is_visible_to_user(uuid,uuid,uuid,jsonb) to authenticated;

-- Query-level defense: previously generated cross-representative notifications
-- are no longer readable by Sales Representatives.
drop policy if exists "notifications own select" on public.notifications;
create policy "notifications own select" on public.notifications
  for select to authenticated
  using (
    user_id=auth.uid()
    and public.notification_is_visible_to_user(auth.uid(),request_id,visit_id,metadata)
  );

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
  for update to authenticated
  using (
    user_id=auth.uid()
    and public.notification_is_visible_to_user(auth.uid(),request_id,visit_id,metadata)
  )
  with check (
    user_id=auth.uid()
    and public.notification_is_visible_to_user(auth.uid(),request_id,visit_id,metadata)
  );

-- Generation-level defense. The dynamic matrix still decides the candidate
-- recipients; this function applies the Sales Representative ownership scope
-- before a notification or Push outbox record is created.
create or replace function public.emit_notification_event(
  p_event_key text,
  p_request_id uuid default null,
  p_visit_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_occurrence_key text default null
) returns integer
language plpgsql security definer set search_path=public set row_security=off as $$
declare
  v_setting public.notification_event_settings%rowtype;
  v_master boolean := true;
  v_request_number text := '';
  v_customer_name text := '';
  v_representative_id uuid;
  v_user_id uuid;
  v_count integer := 0;
  v_occurrence text;
  v_body text;
  v_notification_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode='28000';
  end if;

  select is_enabled into v_master
  from public.notification_system_settings
  where id=1;
  if coalesce(v_master,false)=false then return 0; end if;

  select * into v_setting
  from public.notification_event_settings
  where event_key=p_event_key;

  if not found
     or v_setting.is_enabled=false
     or (coalesce(v_setting.in_app_enabled,false)=false and coalesce(v_setting.push_enabled,false)=false)
  then
    return 0;
  end if;

  if p_request_id is not null then
    select r.request_number,coalesce(c.representative_id,r.representative_id),coalesce(c.customer_name,'')
      into v_request_number,v_representative_id,v_customer_name
    from public.installation_requests r
    left join public.customers c on c.id=r.customer_id
    where r.id=p_request_id;
  else
    v_representative_id:=public.notification_scope_representative_id(
      p_request_id,p_visit_id,coalesce(p_metadata,'{}'::jsonb)
    );
  end if;

  v_occurrence:=coalesce(nullif(p_occurrence_key,''),p_event_key||':'||coalesce(p_visit_id::text,p_request_id::text,'global'));
  v_body:=trim(both ' — ' from concat_ws(' — ',nullif(v_request_number,''),nullif(v_customer_name,'')));

  for v_user_id in
    select distinct recipient_id from (
      select up.id recipient_id
      from public.notification_event_recipient_rules rr
      join public.user_profiles up on up.id=rr.user_id and coalesce(up.is_active,true)=true
      where rr.event_key=p_event_key and rr.is_active=true and rr.recipient_type='user'

      union all

      select up.id
      from public.notification_event_recipient_rules rr
      join public.user_profiles up on up.role::text=rr.role_key and coalesce(up.is_active,true)=true
      where rr.event_key=p_event_key and rr.is_active=true and rr.recipient_type='role'

      union all

      select up.id
      from public.notification_event_recipient_rules rr
      join public.user_profiles up on up.representative_id=v_representative_id and coalesce(up.is_active,true)=true
      where rr.event_key=p_event_key
        and rr.is_active=true
        and rr.recipient_type='request_owner'
        and v_representative_id is not null
    ) q
  loop
    -- Critical isolation gate. Even explicit role/user matrix recipients that
    -- are Sales Representatives are limited to their own data scope.
    if not public.notification_is_visible_to_user(
      v_user_id,p_request_id,p_visit_id,coalesce(p_metadata,'{}'::jsonb)
    ) then
      continue;
    end if;

    v_notification_id:=null;

    insert into public.notifications(
      user_id,event_key,request_id,visit_id,title,body,target_view,metadata,dedupe_key,in_app_delivery
    ) values(
      v_user_id,p_event_key,p_request_id,p_visit_id,v_setting.event_name,v_body,v_setting.target_view,
      coalesce(p_metadata,'{}'::jsonb),
      md5(v_user_id::text||'|'||p_event_key||'|'||v_occurrence),
      coalesce(v_setting.in_app_enabled,false)
    )
    on conflict(dedupe_key) do nothing
    returning id into v_notification_id;

    if v_notification_id is not null then
      v_count:=v_count+1;
      if coalesce(v_setting.push_enabled,false) then
        insert into public.notification_push_outbox(notification_id,user_id)
        values(v_notification_id,v_user_id)
        on conflict(notification_id) do nothing;
      end if;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.emit_notification_event(text,uuid,uuid,jsonb,text) to authenticated;

-- Prevent an already queued legacy cross-representative Push from being sent
-- after this migration. Sent notifications remain as immutable history.
delete from public.notification_push_outbox o
using public.notifications n, public.user_profiles up
where o.notification_id=n.id
  and n.user_id=up.id
  and up.role::text='sales_representative'
  and o.status='pending'
  and not public.notification_is_visible_to_user(up.id,n.request_id,n.visit_id,n.metadata);

commit;
