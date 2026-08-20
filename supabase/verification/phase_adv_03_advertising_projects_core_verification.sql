-- Phase ADV-03 — Projects Core Verification — READ ONLY
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('adv_projects','adv_project_status_history')
order by table_name;

select
  column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='adv_projects'
order by ordinal_position;

select
  trigger_name,event_manipulation,action_timing
from information_schema.triggers
where trigger_schema='public' and event_object_table='adv_projects'
order by trigger_name,event_manipulation;

select
  policyname,cmd
from pg_policies
where schemaname='public'
  and tablename in ('adv_projects','adv_project_status_history')
order by tablename,policyname;

select
  p.proname,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('adv_generate_project_number','adv_projects_before_write','adv_projects_status_history_trigger')
order by p.proname;
