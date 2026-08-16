-- Phase E1.2 verification — run after the migration in Supabase SQL Editor.

-- 1) Canonical helper functions exist.
select
  to_regprocedure('public.can_access_installation_visit_scope(uuid,uuid,text)') as visit_scope_function,
  to_regprocedure('public.can_access_installation_request_via_active_visit(uuid)') as request_via_visit_function;

-- 2) Read policies must use visit-aware scope and must never become USING(true).
select tablename,policyname,qual
from pg_policies
where schemaname='public'
  and (
    (tablename='installation_requests' and policyname='installation requests scoped select')
    or (tablename='installation_request_services' and policyname='installation request services scoped select')
    or (tablename='installation_execution_visits' and policyname='installation visits scoped read')
    or (tablename='installation_execution_visit_services' and policyname='installation visit services scoped read')
  )
order by tablename,policyname;

-- 3) The execution visit read policy must reference the visit scope helper.
select
  position('can_access_installation_visit_scope' in coalesce(qual,'')) > 0 as visit_policy_uses_canonical_visit_scope,
  position('installationSchedule' in coalesce(qual,'')) > 0 as scheduling_read_branch_preserved
from pg_policies
where schemaname='public'
  and tablename='installation_execution_visits'
  and policyname='installation visits scoped read';

-- 4) Parent request policy preserves the old branch and adds only active-visit recovery.
select
  position('can_access_installation_request_scope' in coalesce(qual,'')) > 0 as legacy_request_scope_preserved,
  position('can_access_installation_assignment' in coalesce(qual,'')) > 0 as legacy_assignment_scope_preserved,
  position('can_access_installation_request_via_active_visit' in coalesce(qual,'')) > 0 as active_visit_recovery_added
from pg_policies
where schemaname='public'
  and tablename='installation_requests'
  and policyname='installation requests scoped select';

-- 5) Direct writes remain revoked. Execution mutations must continue through RPCs.
select
  has_table_privilege('authenticated','public.installation_execution_visits','INSERT') as visits_insert,
  has_table_privilege('authenticated','public.installation_execution_visits','UPDATE') as visits_update,
  has_table_privilege('authenticated','public.installation_execution_visits','DELETE') as visits_delete,
  has_table_privilege('authenticated','public.installation_execution_visit_services','INSERT') as visit_services_insert,
  has_table_privilege('authenticated','public.installation_execution_visit_services','UPDATE') as visit_services_update,
  has_table_privilege('authenticated','public.installation_execution_visit_services','DELETE') as visit_services_delete;

-- Expected: all six values above are FALSE.

-- 6) Existing mutation RPCs still guard by actual visit team + technician assignment.
select
  position('can_access_installation_request_scope(r.representative_id,v.installation_team_id)' in pg_get_functiondef('public.advance_installation_execution_visit_stage(uuid,uuid,text,text)'::regprocedure)) > 0 as advance_uses_visit_team,
  position('can_access_installation_assignment(v.installation_team_id,v.technician_name)' in pg_get_functiondef('public.advance_installation_execution_visit_stage(uuid,uuid,text,text)'::regprocedure)) > 0 as advance_uses_visit_technician,
  position('can_access_installation_assignment(v.installation_team_id,v.technician_name)' in pg_get_functiondef('public.record_installation_visit_map_opened(uuid,uuid)'::regprocedure)) > 0 as map_open_uses_visit_assignment;

-- 7) Data-integrity diagnostics. These are diagnostics, not automatic data changes.
select count(*) as active_visits_missing_parent
from public.installation_execution_visits v
left join public.installation_requests r on r.id=v.installation_request_id
where v.status in ('مجدولة','قيد التنفيذ') and r.id is null;

select count(*) as active_visits_with_null_team
from public.installation_execution_visits
where status in ('مجدولة','قيد التنفيذ') and installation_team_id is null;

select count(*) as active_visits_with_null_technician
from public.installation_execution_visits
where status in ('مجدولة','قيد التنفيذ') and nullif(trim(coalesce(technician_name,'')),'') is null;

-- 8) Recovery candidates: active visits whose assignment differs from the parent request.
-- These rows are exactly the class E1.2 is designed to read safely from the visit assignment.
select
  r.request_number,
  r.status as request_status,
  r.installation_team_id as parent_team_id,
  r.assigned_technician_name as parent_technician,
  v.id as visit_id,
  v.visit_no,
  v.status as visit_status,
  v.scheduled_date,
  v.installation_team_id as visit_team_id,
  v.technician_name as visit_technician
from public.installation_execution_visits v
join public.installation_requests r on r.id=v.installation_request_id
where v.status in ('مجدولة','قيد التنفيذ')
  and (
    r.installation_team_id is distinct from v.installation_team_id
    or public.normalize_installation_technician_name(r.assigned_technician_name)
       is distinct from public.normalize_installation_technician_name(v.technician_name)
  )
order by v.scheduled_date,v.visit_no;
