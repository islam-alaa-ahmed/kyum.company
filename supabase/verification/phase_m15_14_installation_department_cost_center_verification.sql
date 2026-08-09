-- Phase M15.14 verification (read-only)
select screen_key,screen_name,group_name,is_active from public.app_screens where screen_key='installationCosts';
select name,is_system,sort_order,is_active from public.installation_cost_categories order by sort_order,name;
select table_name from information_schema.tables where table_schema='public' and table_name in (
'installation_cost_categories','installation_technician_annual_costs','installation_technician_monthly_costs','installation_cost_team_assignments') order by table_name;
select public.has_screen_permission('installationCosts','view') as can_view_installation_costs;
