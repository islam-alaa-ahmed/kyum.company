-- Phase M15.14.2 — Cost Center Reporting + Team Matrix + Employee Lifecycle
begin;

alter table public.installation_cost_technicians add column if not exists inactive_at date;

-- A cost employee may belong to multiple cost teams (administrative/shared staff).
alter table public.installation_cost_team_members drop constraint if exists installation_cost_team_members_technician_id_key;
drop index if exists public.installation_cost_team_members_technician_id_key;
create unique index if not exists ux_installation_cost_team_members_pair on public.installation_cost_team_members(team_id,technician_id);

create or replace function public.save_installation_cost_technician(p_id uuid default null,p_name text default null,p_inactive_at date default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text:=btrim(coalesce(p_name,''));
begin
  if v_name='' then raise exception 'اكتب اسم الموظف'; end if;
  if p_id is null then
    if not (public.has_screen_permission('installationCosts','add') or public.has_screen_permission('installationCosts','edit')) then raise exception 'ليس لديك صلاحية إضافة موظف'; end if;
    insert into public.installation_cost_technicians(name,is_active,inactive_at) values(v_name,true,null) returning id into v_id;
  else
    if not public.has_screen_permission('installationCosts','edit') then raise exception 'ليس لديك صلاحية تعديل الموظف'; end if;
    update public.installation_cost_technicians set name=v_name,inactive_at=case when is_active then null else coalesce(p_inactive_at,inactive_at) end,updated_at=now() where id=p_id returning id into v_id;
    if v_id is null then raise exception 'الموظف غير موجود'; end if;
  end if;
  return v_id;
end $$;
grant execute on function public.save_installation_cost_technician(uuid,text,date) to authenticated;

create or replace function public.toggle_installation_cost_technician(p_id uuid,p_is_active boolean,p_inactive_at date default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('installationCosts','edit') then raise exception 'ليس لديك صلاحية تعديل الموظف'; end if;
  if not coalesce(p_is_active,false) and p_inactive_at is null then raise exception 'حدد تاريخ آخر يوم عمل للموظف'; end if;
  update public.installation_cost_technicians
     set is_active=coalesce(p_is_active,false),
         inactive_at=case when coalesce(p_is_active,false) then null else p_inactive_at end,
         updated_at=now()
   where id=p_id;
  if not found then raise exception 'الموظف غير موجود'; end if;
end $$;
grant execute on function public.toggle_installation_cost_technician(uuid,boolean,date) to authenticated;

commit;
