-- Phase E1.3 verification — READ ONLY

-- 1) Synchronizer and trigger must exist.
select p.proname
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('sync_installation_request_execution_state','trg_sync_installation_request_execution_state','advance_installation_execution_visit_stage')
order by p.proname;

select tgname,tgenabled
from pg_trigger
where tgrelid='public.installation_execution_visits'::regclass
  and not tgisinternal
  and tgname='trg_installation_execution_visit_parent_state_sync';

-- 2) A request with a waiting-confirmation visit and no genuinely running visit
-- must not remain parent status 'قيد التنفيذ'. Expected: 0 rows.
select r.request_number,r.status as request_status,v.id as visit_id,v.status as visit_status,v.completed_at
from public.installation_requests r
join public.installation_execution_visits v on v.installation_request_id=r.id
where v.status='بانتظار التأكيد'
  and r.status='قيد التنفيذ'
  and not exists(
    select 1 from public.installation_execution_visits x
    where x.installation_request_id=r.id
      and x.status='قيد التنفيذ'
      and x.completed_at is null
  )
order by r.request_number;

-- 3) Parent execution state must match the canonical aggregate visit state.
-- Expected: 0 rows.
with expected as (
  select
    r.id,
    r.request_number,
    r.status as request_status,
    case
      when bool_or(v.status='قيد التنفيذ' and v.completed_at is null) then 'قيد التنفيذ'
      when bool_or(v.status='بانتظار التأكيد') then 'مكتمل'
      when bool_or(v.status='مجدولة') then 'مسند'
      when bool_or(v.status='بانتظار الجدولة') then 'بانتظار الجدولة'
      when bool_or(v.status='مؤكدة') then 'مكتمل'
      else null
    end as expected_status
  from public.installation_requests r
  join public.installation_execution_visits v on v.installation_request_id=r.id and v.status<>'ملغاة'
  where r.status not in ('مؤجل','متعذر','ملغي')
  group by r.id,r.request_number,r.status
)
select * from expected
where expected_status is not null
  and request_status is distinct from expected_status
order by request_number;

-- 4) The originally reported stale category should now be empty.
select count(*) as stale_waiting_confirmation_parents
from public.installation_requests r
where r.status='قيد التنفيذ'
  and exists(select 1 from public.installation_execution_visits v where v.installation_request_id=r.id and v.status='بانتظار التأكيد')
  and not exists(select 1 from public.installation_execution_visits v where v.installation_request_id=r.id and v.status='قيد التنفيذ' and v.completed_at is null);

-- 5) Informational view of waiting-confirmation handoff after repair.
select r.request_number,r.status as request_status,v.visit_no,v.status as visit_status,v.scheduled_date,v.completed_at
from public.installation_requests r
join public.installation_execution_visits v on v.installation_request_id=r.id
where v.status='بانتظار التأكيد'
order by v.scheduled_date,v.visit_no;
