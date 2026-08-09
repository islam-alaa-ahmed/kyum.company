-- Phase M15.14.1 — Independent Cost Technicians & Teams + Annual/Monthly Tabs
begin;

create table if not exists public.installation_cost_technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installation_cost_technicians_name_not_blank check (btrim(name) <> '')
);
create unique index if not exists ux_installation_cost_technicians_name_ci on public.installation_cost_technicians(lower(btrim(name)));
drop trigger if exists trg_installation_cost_technicians_updated_at on public.installation_cost_technicians;
create trigger trg_installation_cost_technicians_updated_at before update on public.installation_cost_technicians for each row execute function public.set_updated_at();

create table if not exists public.installation_cost_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installation_cost_teams_name_not_blank check (btrim(name) <> '')
);
create unique index if not exists ux_installation_cost_teams_name_ci on public.installation_cost_teams(lower(btrim(name)));
drop trigger if exists trg_installation_cost_teams_updated_at on public.installation_cost_teams;
create trigger trg_installation_cost_teams_updated_at before update on public.installation_cost_teams for each row execute function public.set_updated_at();

create table if not exists public.installation_cost_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.installation_cost_teams(id) on delete cascade,
  technician_id uuid not null references public.installation_cost_technicians(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(technician_id)
);
create index if not exists idx_installation_cost_team_members_team on public.installation_cost_team_members(team_id);
drop trigger if exists trg_installation_cost_team_members_updated_at on public.installation_cost_team_members;
create trigger trg_installation_cost_team_members_updated_at before update on public.installation_cost_team_members for each row execute function public.set_updated_at();

-- Seed the new independent roster once from any names already used by M15.14, preserving entered cost data.
insert into public.installation_cost_technicians(name)
select distinct x.name from (
  select nullif(btrim(technician_name),'') name from public.installation_technician_annual_costs
  union select nullif(btrim(technician_name),'') from public.installation_technician_monthly_costs
  union select nullif(btrim(technician_name),'') from public.installation_cost_team_assignments
  union select nullif(btrim(name),'') from public.installation_technician_name_suggestions where coalesce(is_active,true)=true
) x where x.name is not null
on conflict do nothing;

-- Add stable technician IDs to cost facts. Keep legacy name columns only for backward compatibility/history.
alter table public.installation_technician_annual_costs add column if not exists technician_id uuid references public.installation_cost_technicians(id) on delete cascade;
alter table public.installation_technician_monthly_costs add column if not exists technician_id uuid references public.installation_cost_technicians(id) on delete cascade;

update public.installation_technician_annual_costs a set technician_id=t.id
from public.installation_cost_technicians t where a.technician_id is null and lower(btrim(a.technician_name))=lower(btrim(t.name));
update public.installation_technician_monthly_costs m set technician_id=t.id
from public.installation_cost_technicians t where m.technician_id is null and lower(btrim(m.technician_name))=lower(btrim(t.name));

alter table public.installation_technician_annual_costs alter column technician_name drop not null;
alter table public.installation_technician_monthly_costs alter column technician_name drop not null;
create unique index if not exists ux_installation_annual_costs_tech_id on public.installation_technician_annual_costs(fiscal_year,technician_id,category_id) where technician_id is not null;
create unique index if not exists ux_installation_monthly_costs_tech_id on public.installation_technician_monthly_costs(cost_month,technician_id,category_id) where technician_id is not null;

-- Preserve any existing M15.14 team distribution by copying referenced operational team names into independent cost teams.
insert into public.installation_cost_teams(name)
select distinct it.name
from public.installation_cost_team_assignments a
join public.installation_teams it on it.id=a.installation_team_id
where a.installation_team_id is not null and nullif(btrim(it.name),'') is not null
on conflict do nothing;

insert into public.installation_cost_team_members(team_id,technician_id)
select distinct on (t.id) ct.id,t.id
from public.installation_cost_team_assignments a
join public.installation_cost_technicians t on lower(btrim(t.name))=lower(btrim(a.technician_name))
join public.installation_teams it on it.id=a.installation_team_id
join public.installation_cost_teams ct on lower(btrim(ct.name))=lower(btrim(it.name))
where a.installation_team_id is not null
order by t.id,a.cost_month desc
on conflict(technician_id) do nothing;

alter table public.installation_cost_technicians enable row level security;
alter table public.installation_cost_teams enable row level security;
alter table public.installation_cost_team_members enable row level security;

do $$
declare t text;
begin
  foreach t in array array['installation_cost_technicians','installation_cost_teams','installation_cost_team_members'] loop
    execute format('drop policy if exists %I on public.%I',t||'_view',t);
    execute format('drop policy if exists %I on public.%I',t||'_add',t);
    execute format('drop policy if exists %I on public.%I',t||'_edit',t);
    execute format('drop policy if exists %I on public.%I',t||'_delete',t);
    execute format('create policy %I on public.%I for select to authenticated using(public.has_screen_permission(''installationCosts'',''view''))',t||'_view',t);
    execute format('create policy %I on public.%I for insert to authenticated with check(public.has_screen_permission(''installationCosts'',''add'') or public.has_screen_permission(''installationCosts'',''edit''))',t||'_add',t);
    execute format('create policy %I on public.%I for update to authenticated using(public.has_screen_permission(''installationCosts'',''edit'')) with check(public.has_screen_permission(''installationCosts'',''edit''))',t||'_edit',t);
    execute format('create policy %I on public.%I for delete to authenticated using(public.has_screen_permission(''installationCosts'',''delete''))',t||'_delete',t);
  end loop;
end $$;

grant select,insert,update,delete on public.installation_cost_technicians,public.installation_cost_teams,public.installation_cost_team_members to authenticated;

-- Transactional employee create/rename. Cost facts remain linked by stable technician_id.
create or replace function public.save_installation_cost_technician(p_id uuid default null,p_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text:=btrim(coalesce(p_name,''));
begin
  if v_name='' then raise exception 'اكتب اسم الموظف'; end if;
  if p_id is null then
    if not (public.has_screen_permission('installationCosts','add') or public.has_screen_permission('installationCosts','edit')) then raise exception 'ليس لديك صلاحية إضافة موظف'; end if;
    insert into public.installation_cost_technicians(name) values(v_name) returning id into v_id;
  else
    if not public.has_screen_permission('installationCosts','edit') then raise exception 'ليس لديك صلاحية تعديل الموظف'; end if;
    update public.installation_cost_technicians set name=v_name,updated_at=now() where id=p_id returning id into v_id;
    if v_id is null then raise exception 'الموظف غير موجود'; end if;
  end if;
  return v_id;
end $$;
grant execute on function public.save_installation_cost_technician(uuid,text) to authenticated;

create or replace function public.delete_installation_cost_technician(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('installationCosts','delete') then raise exception 'ليس لديك صلاحية حذف الموظف'; end if;
  delete from public.installation_cost_technicians where id=p_id;
end $$;
grant execute on function public.delete_installation_cost_technician(uuid) to authenticated;

-- Ensure the new ID-based uniqueness can be targeted by PostgREST upsert.
alter table public.installation_technician_annual_costs drop constraint if exists installation_technician_annual_costs_tech_category_key;
alter table public.installation_technician_monthly_costs drop constraint if exists installation_technician_monthly_costs_tech_category_key;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='installation_technician_annual_costs_year_tid_category_key') then
    alter table public.installation_technician_annual_costs add constraint installation_technician_annual_costs_year_tid_category_key unique(fiscal_year,technician_id,category_id);
  end if;
  if not exists(select 1 from pg_constraint where conname='installation_technician_monthly_costs_month_tid_category_key') then
    alter table public.installation_technician_monthly_costs add constraint installation_technician_monthly_costs_month_tid_category_key unique(cost_month,technician_id,category_id);
  end if;
end $$;

commit;
