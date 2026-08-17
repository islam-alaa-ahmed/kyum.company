begin;

create or replace function public.guard_installation_execution_visit_timeline_integrity()
returns trigger
language plpgsql
security definer
set search_path=public
as $function$
begin
  if new.status in ('بانتظار التأكيد','مؤكدة')
     and new.completed_at is null
     and (
       tg_op='INSERT'
       or old.status is distinct from new.status
       or old.confirmed_at is distinct from new.confirmed_at
     )
  then
    raise exception 'لا يمكن نقل زيارة التنفيذ إلى % قبل إكمال مسار التنفيذ وتسجيل وقت الانتهاء',new.status;
  end if;

  if new.status='مؤكدة' and new.confirmed_at is null then
    raise exception 'لا يمكن اعتبار زيارة التنفيذ مؤكدة بدون تاريخ تأكيد';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_installation_execution_visit_timeline_integrity
on public.installation_execution_visits;

create trigger trg_guard_installation_execution_visit_timeline_integrity
before insert or update
on public.installation_execution_visits
for each row
execute function public.guard_installation_execution_visit_timeline_integrity();

create or replace function public.ensure_installation_execution_visit(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $function$
declare
  r public.installation_requests%rowtype;
  v_id uuid;
  v_no integer;
begin
  select * into r from public.installation_requests where id=p_request_id for update;
  if not found then raise exception 'طلب التركيب غير موجود'; end if;

  select id into v_id
  from public.installation_execution_visits
  where installation_request_id=p_request_id
    and status in ('مجدولة','قيد التنفيذ','بانتظار التأكيد')
  order by visit_no desc
  limit 1;

  if v_id is not null then return v_id; end if;

  if r.status='مكتمل' or r.completed_at is not null then
    raise exception 'لا توجد زيارة تنفيذ مكتملة فعليًا لهذا الطلب. يجب تنفيذ مراحل الزيارة من شاشة التنفيذ أولًا.';
  end if;

  if r.scheduled_date is null or r.scheduled_time is null
     or r.installation_team_id is null
     or nullif(trim(coalesce(r.assigned_technician_name,'')),'') is null
  then
    raise exception 'يجب جدولة الطلب وإسناده قبل إنشاء زيارة التنفيذ';
  end if;

  select coalesce(max(visit_no),0)+1 into v_no
  from public.installation_execution_visits
  where installation_request_id=p_request_id;

  insert into public.installation_execution_visits(
    installation_request_id,visit_no,scheduled_date,scheduled_time,
    installation_team_id,technician_name,status
  )
  values(
    p_request_id,v_no,r.scheduled_date,r.scheduled_time,
    r.installation_team_id,r.assigned_technician_name,'مجدولة'
  )
  returning id into v_id;

  insert into public.installation_execution_visit_services(
    visit_id,request_service_id,scheduled_quantity
  )
  select
    v_id,s.id,
    greatest(
      s.quantity-coalesce((
        select sum(coalesce(vs.executed_quantity,0))
        from public.installation_execution_visit_services vs
        join public.installation_execution_visits vv on vv.id=vs.visit_id
        where vv.installation_request_id=p_request_id
          and vv.status='مؤكدة'
          and vs.request_service_id=s.id
      ),0),0
    )
  from public.installation_request_services s
  where s.installation_request_id=p_request_id;

  return v_id;
end;
$function$;

-- Generic safe historical repair. This intentionally excludes any visit that has
-- execution quantity, confirmation audit, invoice, completion report, or completion files.
with safe_candidates as (
  select v.id
  from public.installation_execution_visits v
  where v.status in ('بانتظار التأكيد','مؤكدة')
    and v.on_route_at is null
    and v.map_opened_at is null
    and v.arrived_at is null
    and v.started_at is null
    and v.completed_at is null
    and v.confirmed_at is null
    and not exists (
      select 1 from public.installation_execution_visit_services vs
      where vs.visit_id=v.id and coalesce(vs.executed_quantity,0)>0
    )
    and not exists (
      select 1 from public.installation_execution_quantity_audit qa where qa.visit_id=v.id
    )
    and not exists (
      select 1 from public.sales_invoices si
      where si.status<>'ملغاة'
        and (si.installation_execution_visit_id=v.id
          or (si.installation_request_id=v.installation_request_id and si.installation_execution_visit_id is null))
    )
    and not exists (
      select 1 from public.installation_completion_reports cr
      where cr.installation_request_id=v.installation_request_id
    )
    and not exists (
      select 1 from public.installation_completion_files cf
      where cf.installation_request_id=v.installation_request_id
    )
)
update public.installation_execution_visits v
set status='مجدولة',
    confirmed_at=null,
    confirmed_by=null,
    confirmation_notes=null,
    selected_for_execution_at=null,
    selected_for_execution_by=null,
    last_status_changed_at=now(),
    last_status_changed_by=null,
    updated_at=now()
from safe_candidates c
where v.id=c.id;

commit;
