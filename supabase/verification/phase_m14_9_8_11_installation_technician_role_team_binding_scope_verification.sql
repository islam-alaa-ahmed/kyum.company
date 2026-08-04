-- Phase M14.9.8.11 verification

-- 1) Technician-role users without a binding. Expected: 0 rows after configuration.
select u.id,u.full_name,u.email
from public.user_profiles u
left join public.installation_user_technician_bindings b on b.user_id=u.id
where u.role::text='viewer' and u.is_active=true and b.user_id is null;

-- 2) Binding and team access mismatch. Expected: 0 rows.
select b.*
from public.installation_user_technician_bindings b
where not exists(
  select 1 from public.installation_team_access a
  where a.user_id=b.user_id and a.installation_team_id=b.installation_team_id
);

-- 3) More than one accessible team for a bound technician. Expected: 0 rows.
select b.user_id,count(a.installation_team_id)
from public.installation_user_technician_bindings b
join public.installation_team_access a on a.user_id=b.user_id
group by b.user_id
having count(a.installation_team_id)>1;

-- 4) Review configured technician bindings.
select u.full_name,u.email,t.name as team_name,b.technician_name
from public.installation_user_technician_bindings b
join public.user_profiles u on u.id=b.user_id
join public.installation_teams t on t.id=b.installation_team_id
order by u.full_name;

-- 5) Requests whose technician text cannot match any configured technician binding.
-- Informational only.
select r.id,r.request_number,t.name as team_name,r.assigned_technician_name
from public.installation_requests r
left join public.installation_teams t on t.id=r.installation_team_id
where r.installation_team_id is not null
  and nullif(trim(r.assigned_technician_name),'') is not null
  and not exists(
    select 1 from public.installation_user_technician_bindings b
    where b.installation_team_id=r.installation_team_id
      and b.normalized_technician_name=public.normalize_installation_technician_name(r.assigned_technician_name)
  )
order by r.scheduled_date desc nulls last;
