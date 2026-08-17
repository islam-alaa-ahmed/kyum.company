-- E1.5 verification — READ ONLY

select trigger_name,event_manipulation,action_timing
from information_schema.triggers
where trigger_schema='public'
  and event_object_table='installation_execution_visits'
  and trigger_name='trg_guard_installation_execution_visit_timeline_integrity'
order by event_manipulation;

select count(*) as safe_invalid_rows_remaining
from public.installation_execution_visits v
where v.status in ('بانتظار التأكيد','مؤكدة')
  and v.on_route_at is null and v.map_opened_at is null and v.arrived_at is null
  and v.started_at is null and v.completed_at is null and v.confirmed_at is null
  and not exists (select 1 from public.installation_execution_visit_services vs where vs.visit_id=v.id and coalesce(vs.executed_quantity,0)>0)
  and not exists (select 1 from public.installation_execution_quantity_audit qa where qa.visit_id=v.id)
  and not exists (select 1 from public.sales_invoices si where si.status<>'ملغاة' and (si.installation_execution_visit_id=v.id or (si.installation_request_id=v.installation_request_id and si.installation_execution_visit_id is null)));

select r.request_number,r.status as request_status,v.status as visit_status,
       v.on_route_at,v.map_opened_at,v.arrived_at,v.started_at,v.completed_at,v.confirmed_at
from public.installation_requests r
join public.installation_execution_visits v on v.installation_request_id=r.id
where r.request_number='INS-2026-000019';

select r.request_number,r.status as request_status,v.status as visit_status,
       v.completed_at,v.confirmed_at,
       coalesce(sum(coalesce(vs.executed_quantity,0)),0) as executed_quantity
from public.installation_requests r
join public.installation_execution_visits v on v.installation_request_id=r.id
left join public.installation_execution_visit_services vs on vs.visit_id=v.id
where r.request_number in ('INS-2026-000009','INS-2026-000010','INS-2026-000014','INS-2026-000024')
group by r.request_number,r.status,v.status,v.completed_at,v.confirmed_at
order by r.request_number;
