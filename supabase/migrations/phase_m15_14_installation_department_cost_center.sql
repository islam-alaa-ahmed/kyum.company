-- Phase M15.14 — Installation Department Cost Center
begin;

insert into public.app_screens(screen_key,screen_name,group_name,display_order,is_active)
values ('installationCosts','تكلفة قسم التركيبات','إدارة التركيبات',79,true)
on conflict(screen_key) do update set
  screen_name=excluded.screen_name,
  group_name=excluded.group_name,
  display_order=excluded.display_order,
  is_active=true;

insert into public.role_screen_permissions(role,screen_key,can_view,can_add,can_edit,can_delete,can_export)
values ('super_admin'::public.app_role,'installationCosts',true,true,true,true,true)
on conflict(role,screen_key) do update set
  can_view=true,can_add=true,can_edit=true,can_delete=true,can_export=true,updated_at=now();

create table if not exists public.installation_cost_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_system boolean not null default false,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installation_cost_categories_name_not_blank check (btrim(name) <> '')
);
create unique index if not exists ux_installation_cost_categories_name_ci
  on public.installation_cost_categories(lower(btrim(name)));

drop trigger if exists trg_installation_cost_categories_updated_at on public.installation_cost_categories;
create trigger trg_installation_cost_categories_updated_at before update on public.installation_cost_categories
for each row execute function public.set_updated_at();

insert into public.installation_cost_categories(name,is_system,sort_order)
values
  ('الراتب',true,10),
  ('رسوم الإقامة',true,20),
  ('التأمين الطبي',true,30),
  ('التأمين الاجتماعي',true,40),
  ('الإيجار',true,50)
on conflict do nothing;

create table if not exists public.installation_technician_annual_costs (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null check (fiscal_year between 2020 and 2100),
  technician_name text not null,
  category_id uuid not null references public.installation_cost_categories(id) on delete cascade,
  annual_total numeric(14,2) not null default 0 check (annual_total >= 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installation_technician_annual_costs_name_not_blank check (btrim(technician_name) <> ''),
  unique(fiscal_year,technician_name,category_id)
);
create index if not exists idx_installation_annual_costs_year_name on public.installation_technician_annual_costs(fiscal_year,technician_name);
drop trigger if exists trg_installation_technician_annual_costs_updated_at on public.installation_technician_annual_costs;
create trigger trg_installation_technician_annual_costs_updated_at before update on public.installation_technician_annual_costs
for each row execute function public.set_updated_at();

create table if not exists public.installation_technician_monthly_costs (
  id uuid primary key default gen_random_uuid(),
  cost_month date not null,
  technician_name text not null,
  category_id uuid not null references public.installation_cost_categories(id) on delete cascade,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  is_override boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installation_monthly_costs_first_day check (extract(day from cost_month)=1),
  constraint installation_monthly_costs_name_not_blank check (btrim(technician_name) <> ''),
  unique(cost_month,technician_name,category_id)
);
create index if not exists idx_installation_monthly_costs_month_name on public.installation_technician_monthly_costs(cost_month,technician_name);
drop trigger if exists trg_installation_technician_monthly_costs_updated_at on public.installation_technician_monthly_costs;
create trigger trg_installation_technician_monthly_costs_updated_at before update on public.installation_technician_monthly_costs
for each row execute function public.set_updated_at();

create table if not exists public.installation_cost_team_assignments (
  id uuid primary key default gen_random_uuid(),
  cost_month date not null,
  technician_name text not null,
  installation_team_id uuid references public.installation_teams(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installation_cost_team_assignments_first_day check (extract(day from cost_month)=1),
  constraint installation_cost_team_assignments_name_not_blank check (btrim(technician_name) <> ''),
  unique(cost_month,technician_name)
);
create index if not exists idx_installation_cost_team_assignments_month_team on public.installation_cost_team_assignments(cost_month,installation_team_id);
drop trigger if exists trg_installation_cost_team_assignments_updated_at on public.installation_cost_team_assignments;
create trigger trg_installation_cost_team_assignments_updated_at before update on public.installation_cost_team_assignments
for each row execute function public.set_updated_at();

alter table public.installation_cost_categories enable row level security;
alter table public.installation_technician_annual_costs enable row level security;
alter table public.installation_technician_monthly_costs enable row level security;
alter table public.installation_cost_team_assignments enable row level security;

-- Cost center policies are permission-driven, never role-name hardcoded.
do $$
declare t text;
begin
  foreach t in array array['installation_cost_categories','installation_technician_annual_costs','installation_technician_monthly_costs','installation_cost_team_assignments'] loop
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

grant select,insert,update,delete on public.installation_cost_categories,public.installation_technician_annual_costs,public.installation_technician_monthly_costs,public.installation_cost_team_assignments to authenticated;

-- The cost screen must be able to read team names independently from scheduling permissions.
drop policy if exists "installation teams cost center view" on public.installation_teams;
create policy "installation teams cost center view" on public.installation_teams
for select to authenticated using(public.has_screen_permission('installationCosts','view'));

create or replace function public.get_installation_cost_technicians()
returns table(name text)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.has_screen_permission('installationCosts','view') then
    raise exception 'ليس لديك صلاحية عرض تكلفة قسم التركيبات';
  end if;
  return query
  select distinct x.name
  from (
    select nullif(btrim(s.name),'') as name
      from public.installation_technician_name_suggestions s
      where coalesce(s.is_active,true)=true
    union
    select nullif(btrim(a.technician_name),'') from public.installation_technician_annual_costs a
    union
    select nullif(btrim(m.technician_name),'') from public.installation_technician_monthly_costs m
    union
    select nullif(btrim(t.technician_name),'') from public.installation_cost_team_assignments t
  ) x
  where x.name is not null
  order by x.name;
end;
$$;
grant execute on function public.get_installation_cost_technicians() to authenticated;

commit;
