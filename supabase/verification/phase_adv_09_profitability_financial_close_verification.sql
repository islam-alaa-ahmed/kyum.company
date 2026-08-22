-- Phase ADV-09 — Profitability & Financial Close Verification — READ ONLY
select column_name,data_type
from information_schema.columns
where table_schema='public' and table_name='adv_projects'
  and column_name like 'financial_closed_%'
order by ordinal_position;

select table_name from information_schema.views
where table_schema='public' and table_name='adv_project_profitability';

select p.proname,pg_get_function_identity_arguments(p.oid) arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('adv_close_project_financially','adv_reopen_project_financially')
order by p.proname;

select project_number,project_name,status,revenue,estimated_cost,material_cost,
direct_purchase_cost,expense_cost,actual_cost,profit,margin_pct,cost_variance,financial_closed_at
from public.adv_project_profitability order by project_number;

select h.created_at,p.project_number,h.action,h.revenue,h.actual_cost,h.profit,h.margin_pct,h.reason
from public.adv_project_financial_close_history h
join public.adv_projects p on p.id=h.project_id
order by h.created_at desc limit 100;
