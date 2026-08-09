-- Phase M15.14.1 verification (read only)
select to_regclass('public.installation_cost_technicians') is not null as technicians_table,
       to_regclass('public.installation_cost_teams') is not null as teams_table,
       to_regclass('public.installation_cost_team_members') is not null as members_table;
select count(*) as independent_cost_technicians from public.installation_cost_technicians;
select count(*) as independent_cost_teams from public.installation_cost_teams;
select count(*) as annual_rows_without_technician_id from public.installation_technician_annual_costs where technician_id is null;
select count(*) as monthly_rows_without_technician_id from public.installation_technician_monthly_costs where technician_id is null;
select technician_id,count(*) from public.installation_cost_team_members group by technician_id having count(*)>1;
select conname,pg_get_constraintdef(oid) from pg_constraint where conname in ('installation_technician_annual_costs_year_tid_category_key','installation_technician_monthly_costs_month_tid_category_key');
