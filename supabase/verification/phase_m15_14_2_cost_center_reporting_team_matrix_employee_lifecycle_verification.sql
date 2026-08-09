select column_name,data_type from information_schema.columns where table_schema='public' and table_name='installation_cost_technicians' and column_name='inactive_at';
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='installation_cost_team_members' and indexname='ux_installation_cost_team_members_pair';
select routine_name from information_schema.routines where routine_schema='public' and routine_name in ('save_installation_cost_technician','toggle_installation_cost_technician') order by routine_name;
