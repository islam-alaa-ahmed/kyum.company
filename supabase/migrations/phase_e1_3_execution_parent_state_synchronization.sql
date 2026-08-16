begin;

-- Phase E1.3
-- Keep installation_requests.status synchronized with the canonical execution-visit lifecycle.
-- This is deliberately narrow: exceptional/manual parent states are never overwritten.

create or replace function public.sync_installation_request_execution_state(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.installation_requests%rowtype;
  v_has_in_progress boolean := false;
  v_has_waiting_confirmation boolean := false;
  v_has_scheduled boolean := false;
  v_has_waiting_schedule boolean := false;
  v_has_confirmed boolean := false;
  v_target_status text;
  v_completed_at timestamptz;
begin
  if p_request_id is null then return; end if;

  select * into r
  from public.installation_requests
  where id=p_request_id
  for update;
  if not found then return; end if;

  -- Preserve explicit exception/cancellation states. This synchronizer only owns
  -- the normal scheduling/execution/completion lifecycle.
  if r.status in ('مؤجل','متعذر','ملغي') then return; end if;

  select
    coalesce(bool_or(v.status='قيد التنفيذ' and v.completed_at is null),false),
    coalesce(bool_or(v.status='بانتظار التأكيد'),false),
    coalesce(bool_or(v.status='مجدولة'),false),
    coalesce(bool_or(v.status='بانتظار الجدولة'),false),
    coalesce(bool_or(v.status='مؤكدة'),false),
    max(v.completed_at) filter (where v.status in ('بانتظار التأكيد','مؤكدة'))
  into
    v_has_in_progress,
    v_has_waiting_confirmation,
    v_has_scheduled,
    v_has_waiting_schedule,
    v_has_confirmed,
    v_completed_at
  from public.installation_execution_visits v
  where v.installation_request_id=p_request_id
    and v.status<>'ملغاة';

  -- Precedence is intentional:
  -- 1) any genuinely running visit means the request is running;
  -- 2) a finished visit awaiting quantity confirmation enters the existing
  --    completion handoff represented by parent status 'مكتمل';
  -- 3) after confirmation, any future scheduled visit becomes the next owner;
  -- 4) confirmed-only history means the request is complete.
  if v_has_in_progress then
    v_target_status:='قيد التنفيذ';
  elsif v_has_waiting_confirmation then
    v_target_status:='مكتمل';
  elsif v_has_scheduled then
    v_target_status:='مسند';
  elsif v_has_waiting_schedule then
    v_target_status:='بانتظار الجدولة';
  elsif v_has_confirmed then
    v_target_status:='مكتمل';
  else
    return;
  end if;

  update public.installation_requests
  set status=v_target_status,
      completed_at=case when v_target_status='مكتمل' then coalesce(v_completed_at,completed_at) else null end,
      updated_at=now()
  where id=p_request_id
    and status is distinct from v_target_status;
end;
$$;

revoke all on function public.sync_installation_request_execution_state(uuid) from public;
revoke all on function public.sync_installation_request_execution_state(uuid) from anon;
revoke all on function public.sync_installation_request_execution_state(uuid) from authenticated;

create or replace function public.trg_sync_installation_request_execution_state()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.sync_installation_request_execution_state(
    case when tg_op='DELETE' then old.installation_request_id else new.installation_request_id end
  );
  return case when tg_op='DELETE' then old else new end;
end;
$$;

revoke all on function public.trg_sync_installation_request_execution_state() from public;
revoke all on function public.trg_sync_installation_request_execution_state() from anon;
revoke all on function public.trg_sync_installation_request_execution_state() from authenticated;

drop trigger if exists trg_installation_execution_visit_parent_state_sync
  on public.installation_execution_visits;
create trigger trg_installation_execution_visit_parent_state_sync
after insert or delete or update of status,completed_at
on public.installation_execution_visits
for each row
execute function public.trg_sync_installation_request_execution_state();

-- Canonical stage transition. The parent request is synchronized AFTER the visit update;
-- selected_for_execution is cleared at the handoff so a finished visit cannot remain active.
create or replace function public.advance_installation_execution_visit_stage(
  p_request_id uuid,
  p_visit_id uuid,
  p_next_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.installation_requests%rowtype;
  v public.installation_execution_visits%rowtype;
  expected text;
  is_super_admin boolean := public.current_user_role() = 'super_admin'::public.app_role;
begin
  if not public.has_screen_permission('installationExecution','edit') then
    raise exception 'لا توجد صلاحية تحديث تنفيذ التركيبات';
  end if;

  select * into r from public.installation_requests where id=p_request_id for update;
  if not found then raise exception 'طلب التركيب غير موجود'; end if;

  select * into v
  from public.installation_execution_visits
  where id=p_visit_id and installation_request_id=p_request_id
  for update;
  if not found then raise exception 'زيارة التنفيذ غير موجودة لهذا الطلب'; end if;

  if not is_super_admin and (
    not public.can_access_installation_request_scope(r.representative_id,v.installation_team_id)
    or not public.can_access_installation_assignment(v.installation_team_id,v.technician_name)
  ) then
    raise exception 'هذه الزيارة غير مرتبطة بفرقتك واسم الفني الخاص بك';
  end if;

  if v.selected_for_execution_at is null then
    raise exception 'هذه الزيارة ليست تنفيذًا حاليًا نشطًا';
  end if;
  if not is_super_admin and v.selected_for_execution_by is distinct from auth.uid() then
    raise exception 'هذه الزيارة ليست التنفيذ الحالي لهذا المستخدم';
  end if;

  expected:=case
    when v.on_route_at is null then 'في الطريق'
    when v.map_opened_at is null then null
    when v.arrived_at is null then 'وصل إلى العميل'
    when v.started_at is null then 'قيد التنفيذ'
    when v.completed_at is null then 'مكتمل'
    else null
  end;

  if expected is distinct from p_next_status then raise exception 'يجب تنفيذ مراحل الزيارة بالترتيب'; end if;
  if p_next_status='وصل إلى العميل' and v.map_opened_at is null then raise exception 'افتح موقع العميل قبل تسجيل الوصول'; end if;

  update public.installation_execution_visits
  set on_route_at=case when p_next_status='في الطريق' then coalesce(on_route_at,now()) else on_route_at end,
      arrived_at=case when p_next_status='وصل إلى العميل' then coalesce(arrived_at,now()) else arrived_at end,
      started_at=case when p_next_status='قيد التنفيذ' then coalesce(started_at,now()) else started_at end,
      completed_at=case when p_next_status='مكتمل' then coalesce(completed_at,now()) else completed_at end,
      status=case when p_next_status='مكتمل' then 'بانتظار التأكيد' else 'قيد التنفيذ' end,
      selected_for_execution_at=case when p_next_status='مكتمل' then null else selected_for_execution_at end,
      selected_for_execution_by=case when p_next_status='مكتمل' then null else selected_for_execution_by end,
      execution_notes=nullif(trim(coalesce(p_notes,'')),''),
      last_status_changed_at=now(),
      last_status_changed_by=auth.uid(),
      updated_at=now()
  where id=v.id;

  -- Preserve the current visit assignment/date on the parent, but derive lifecycle
  -- status from all visits rather than writing a potentially stale hard-coded state.
  update public.installation_requests
  set scheduled_date=v.scheduled_date,
      scheduled_time=v.scheduled_time,
      installation_team_id=v.installation_team_id,
      assigned_technician_name=v.technician_name,
      selected_for_execution_at=case when p_next_status='مكتمل' then null else selected_for_execution_at end,
      selected_for_execution_by=case when p_next_status='مكتمل' then null else selected_for_execution_by end,
      updated_at=now()
  where id=r.id;

  perform public.sync_installation_request_execution_state(p_request_id);
end;
$$;

grant execute on function public.advance_installation_execution_visit_stage(uuid,uuid,text,text) to authenticated;

-- One-time generic repair for historical drift. No request IDs are hard-coded.
do $$
declare x record;
begin
  for x in
    select distinct installation_request_id
    from public.installation_execution_visits
    where status in ('بانتظار الجدولة','مجدولة','قيد التنفيذ','بانتظار التأكيد','مؤكدة')
  loop
    perform public.sync_installation_request_execution_state(x.installation_request_id);
  end loop;
end $$;

commit;
