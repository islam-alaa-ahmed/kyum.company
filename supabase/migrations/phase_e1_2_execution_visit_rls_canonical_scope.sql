-- Phase E1.2 — Execution Visit RLS Canonical Scope Fix
-- Purpose:
--   1) Keep all existing installation read/write rules intact.
--   2) Add a narrow execution-only read path based on the actual execution visit team/technician.
--   3) Never widen direct INSERT/UPDATE/DELETE privileges.
--   4) Preserve legacy request-based access as a fallback.

begin;

create or replace function public.can_access_installation_visit_scope(
  p_request_id uuid,
  p_installation_team_id uuid,
  p_technician_name text
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when auth.uid() is null then false
    else exists (
      select 1
      from public.installation_requests r
      where r.id=p_request_id
        and public.can_access_installation_request_scope(r.representative_id,p_installation_team_id)
        and public.can_access_installation_assignment(p_installation_team_id,p_technician_name)
    )
  end
$$;

grant execute on function public.can_access_installation_visit_scope(uuid,uuid,text) to authenticated;

create or replace function public.can_access_installation_request_via_active_visit(
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when auth.uid() is null then false
    when not public.has_screen_permission('installationExecution','view') then false
    else exists (
      select 1
      from public.installation_execution_visits v
      where v.installation_request_id=p_request_id
        and v.status in ('مجدولة','قيد التنفيذ')
        and public.can_access_installation_visit_scope(
          v.installation_request_id,
          v.installation_team_id,
          v.technician_name
        )
    )
  end
$$;

grant execute on function public.can_access_installation_request_via_active_visit(uuid) to authenticated;

-- Parent request: preserve the entire existing canonical branch and add only
-- an execution-specific fallback when an accessible active visit exists.
drop policy if exists "installation requests scoped select" on public.installation_requests;
create policy "installation requests scoped select" on public.installation_requests
for select to authenticated using(
  (
    (
      public.has_screen_permission('installationRequests','view')
      or public.has_screen_permission('installationSchedule','view')
      or public.has_screen_permission('installationExecution','view')
      or public.has_screen_permission('installationCompletion','view')
      or public.has_screen_permission('installationExceptions','view')
      or public.has_screen_permission('installationReports','view')
      or public.has_screen_permission('installationsOverview','view')
    )
    and public.can_access_installation_request_scope(representative_id,installation_team_id)
    and public.can_access_installation_assignment(installation_team_id,assigned_technician_name)
  )
  or public.can_access_installation_request_via_active_visit(id)
);

-- Request service rows: preserve parent-scope behavior and add the exact same
-- execution-only fallback so the visible execution request never loses its services.
drop policy if exists "installation request services scoped select" on public.installation_request_services;
create policy "installation request services scoped select" on public.installation_request_services
for select to authenticated using(
  exists(
    select 1
    from public.installation_requests r
    where r.id=installation_request_id
      and public.can_access_installation_request_scope(r.representative_id,r.installation_team_id)
  )
  or public.can_access_installation_request_via_active_visit(installation_request_id)
);

-- Execution visits: actual visit assignment is canonical for execution visibility.
-- Scheduling readers retain the prior broad scheduling read branch.
drop policy if exists "installation visits scoped read" on public.installation_execution_visits;
create policy "installation visits scoped read" on public.installation_execution_visits
for select to authenticated using (
  public.has_screen_permission('installationSchedule','view')
  or public.can_access_installation_visit_scope(
    installation_request_id,
    installation_team_id,
    technician_name
  )
);

-- Visit service rows inherit the corrected visit assignment scope.
drop policy if exists "installation visit services scoped read" on public.installation_execution_visit_services;
create policy "installation visit services scoped read" on public.installation_execution_visit_services
for select to authenticated using (
  exists (
    select 1
    from public.installation_execution_visits v
    where v.id=visit_id
      and (
        public.has_screen_permission('installationSchedule','view')
        or public.can_access_installation_visit_scope(
          v.installation_request_id,
          v.installation_team_id,
          v.technician_name
        )
      )
  )
);

-- Execution metadata labels must use an accessible active visit when the parent
-- request assignment is stale. Legacy requests with no visit keep the old path.
create or replace function public.get_installation_execution_reference_labels(
  p_request_ids uuid[]
)
returns table(
  request_id uuid,
  representative_name text,
  team_name text
)
language sql
stable
security definer
set search_path=public
as $$
  select
    r.id as request_id,
    sr.full_name as representative_name,
    coalesce(active_team.name,request_team.name) as team_name
  from public.installation_requests r
  left join public.sales_representatives sr on sr.id=r.representative_id
  left join public.installation_teams request_team on request_team.id=r.installation_team_id
  left join lateral (
    select v.installation_team_id
    from public.installation_execution_visits v
    where v.installation_request_id=r.id
      and v.status in ('مجدولة','قيد التنفيذ')
      and public.can_access_installation_visit_scope(
        v.installation_request_id,
        v.installation_team_id,
        v.technician_name
      )
    order by
      case when v.status='قيد التنفيذ' then 0 else 1 end,
      v.scheduled_date nulls last,
      v.scheduled_time nulls last,
      v.visit_no
    limit 1
  ) accessible_visit on true
  left join public.installation_teams active_team on active_team.id=accessible_visit.installation_team_id
  where auth.uid() is not null
    and public.has_screen_permission('installationExecution','view')
    and r.id = any(coalesce(p_request_ids,array[]::uuid[]))
    and (
      accessible_visit.installation_team_id is not null
      or (
        not exists (
          select 1
          from public.installation_execution_visits any_visit
          where any_visit.installation_request_id=r.id
        )
        and public.can_access_installation_request_scope(r.representative_id,r.installation_team_id)
        and public.can_access_installation_assignment(r.installation_team_id,r.assigned_technician_name)
      )
    )
$$;

grant execute on function public.get_installation_execution_reference_labels(uuid[]) to authenticated;

-- Explicitly preserve the RPC-only write model.
revoke insert,update,delete on public.installation_execution_visits from authenticated;
revoke insert,update,delete on public.installation_execution_visit_services from authenticated;
grant select on public.installation_execution_visits,public.installation_execution_visit_services to authenticated;

commit;
