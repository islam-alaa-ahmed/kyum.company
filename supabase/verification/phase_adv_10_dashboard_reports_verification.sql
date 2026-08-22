-- Phase ADV-10 — Dashboard & Reports Verification — READ ONLY
select p.proname,pg_get_function_identity_arguments(p.oid) arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('adv_dashboard_snapshot','adv_reports_snapshot')
order by p.proname;

select public.adv_dashboard_snapshot() -> 'kpis' as dashboard_kpis;

select
  jsonb_array_length(public.adv_reports_snapshot() -> 'projects') as projects_rows,
  jsonb_array_length(public.adv_reports_snapshot() -> 'inventory') as inventory_rows,
  jsonb_array_length(public.adv_reports_snapshot() -> 'custody') as custody_rows,
  jsonb_array_length(public.adv_reports_snapshot() -> 'purchases') as purchases_rows,
  jsonb_array_length(public.adv_reports_snapshot() -> 'expenses') as expense_rows,
  jsonb_array_length(public.adv_reports_snapshot() -> 'materials') as material_rows;
