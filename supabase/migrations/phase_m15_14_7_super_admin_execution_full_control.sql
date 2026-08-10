-- Phase M15.14.7 — Super Admin Execution Full Control
-- Root cause: M15.14.6 exposed another user's active execution visit to Super Admin for observation,
-- while the visit mutation RPCs still required selected_for_execution_by = auth.uid().
-- Fix: preserve technician ownership for every non-super-admin role, but allow Super Admin to
-- operate the already-selected active visit without changing its technician ownership.

begin;

create or replace function public.record_installation_visit_map_opened(p_request_id uuid,p_visit_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  r public.installation_requests%rowtype;
  v public.installation_execution_visits%rowtype;
  is_super_admin boolean := public.current_user_role() = 'super_admin'::public.app_role;
begin
  if not public.has_screen_permission('installationExecution','edit') then
    raise exception 'لا توجد صلاحية تحديث تنفيذ التركيبات';
  end if;

  select * into r from public.installation_requests where id=p_request_id;
  if not found then raise exception 'طلب التركيب غير موجود'; end if;

  select * into v
  from public.installation_execution_visits
  where id=p_visit_id and installation_request_id=p_request_id
  for update;
  if not found then raise exception 'زيارة التنفيذ غير موجودة'; end if;

  if not is_super_admin and (
    not public.can_access_installation_request_scope(r.representative_id,v.installation_team_id)
    or not public.can_access_installation_assignment(v.installation_team_id,v.technician_name)
  ) then
    raise exception 'الزيارة غير مسموحة';
  end if;

  -- Super Admin may control an active visit selected by another technician without taking ownership.
  if v.selected_for_execution_at is null then
    raise exception 'الزيارة ليست تنفيذًا حاليًا نشطًا';
  end if;
  if not is_super_admin and v.selected_for_execution_by is distinct from auth.uid() then
    raise exception 'الزيارة ليست التنفيذ الحالي لهذا المستخدم';
  end if;

  if v.on_route_at is null then raise exception 'ابدأ التحرك أولاً'; end if;

  update public.installation_execution_visits
  set map_opened_at=coalesce(map_opened_at,now()),
      last_status_changed_at=now(),
      last_status_changed_by=auth.uid(),
      updated_at=now()
  where id=v.id;
end;$$;

grant execute on function public.record_installation_visit_map_opened(uuid,uuid) to authenticated;

create or replace function public.advance_installation_execution_visit_stage(p_request_id uuid,p_visit_id uuid,p_next_status text,p_notes text default null)
returns void language plpgsql security definer set search_path=public as $$
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

  -- Keep the technician as the canonical owner. Super Admin only receives an execution override.
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

  update public.installation_execution_visits set
    on_route_at=case when p_next_status='في الطريق' then coalesce(on_route_at,now()) else on_route_at end,
    arrived_at=case when p_next_status='وصل إلى العميل' then coalesce(arrived_at,now()) else arrived_at end,
    started_at=case when p_next_status='قيد التنفيذ' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_next_status='مكتمل' then coalesce(completed_at,now()) else completed_at end,
    status=case when p_next_status='مكتمل' then 'بانتظار التأكيد' else 'قيد التنفيذ' end,
    execution_notes=nullif(trim(coalesce(p_notes,'')),''),
    last_status_changed_at=now(),
    last_status_changed_by=auth.uid(),
    updated_at=now()
  where id=v.id;

  if p_next_status='مكتمل' then
    update public.installation_requests
    set status='مكتمل',completed_at=now(),scheduled_date=v.scheduled_date,scheduled_time=v.scheduled_time,
        installation_team_id=v.installation_team_id,assigned_technician_name=v.technician_name
    where id=r.id;
  end if;
end;$$;

grant execute on function public.advance_installation_execution_visit_stage(uuid,uuid,text,text) to authenticated;

commit;
