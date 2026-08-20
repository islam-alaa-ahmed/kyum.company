-- Phase ADV-03 — Advertising Projects Core
begin;

create sequence if not exists public.adv_project_number_seq start 1;

create table if not exists public.adv_projects (
  id uuid primary key default gen_random_uuid(),
  project_number text not null unique,
  project_name text not null,
  project_type_id uuid references public.adv_project_types(id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  location_name text,
  mall_name text,
  selling_value numeric(14,2) not null default 0 check (selling_value >= 0),
  estimated_cost numeric(14,2) not null default 0 check (estimated_cost >= 0),
  start_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  responsible_employee_id uuid references public.adv_employees(id) on delete restrict,
  status text not null default 'جديد',
  notes text,
  financial_closed_at timestamptz,
  financial_closed_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  constraint adv_projects_status_ck check (
    status in ('جديد','جاري التجهيز','جاري التصنيع','جاهز للتركيب','جاري التركيب','مكتمل','مغلق ماليًا','متوقف','ملغي')
  ),
  constraint adv_projects_financial_close_ck check (
    (status='مغلق ماليًا' and financial_closed_at is not null)
    or (status<>'مغلق ماليًا')
  )
);

create index if not exists adv_projects_status_idx on public.adv_projects(status);
create index if not exists adv_projects_type_idx on public.adv_projects(project_type_id);
create index if not exists adv_projects_employee_idx on public.adv_projects(responsible_employee_id);
create index if not exists adv_projects_dates_idx on public.adv_projects(start_date,expected_delivery_date);

create table if not exists public.adv_project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.adv_projects(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid(),
  notes text
);
create index if not exists adv_project_status_history_project_idx
  on public.adv_project_status_history(project_id,changed_at desc);

create or replace function public.adv_generate_project_number()
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_year text := to_char((now() at time zone 'Asia/Riyadh'),'YYYY');
  v_seq bigint;
begin
  v_seq := nextval('public.adv_project_number_seq');
  return 'ADV-'||v_year||'-'||lpad(v_seq::text,6,'0');
end;
$$;

create or replace function public.adv_projects_before_write()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='INSERT' and nullif(trim(new.project_number),'') is null then
    new.project_number := public.adv_generate_project_number();
  end if;

  if tg_op='UPDATE' then
    if old.financial_closed_at is not null then
      if new.project_name is distinct from old.project_name
         or new.project_type_id is distinct from old.project_type_id
         or new.customer_name is distinct from old.customer_name
         or new.customer_phone is distinct from old.customer_phone
         or new.location_name is distinct from old.location_name
         or new.mall_name is distinct from old.mall_name
         or new.selling_value is distinct from old.selling_value
         or new.estimated_cost is distinct from old.estimated_cost
         or new.start_date is distinct from old.start_date
         or new.expected_delivery_date is distinct from old.expected_delivery_date
         or new.actual_delivery_date is distinct from old.actual_delivery_date
         or new.responsible_employee_id is distinct from old.responsible_employee_id
         or new.notes is distinct from old.notes then
        raise exception 'المشروع مغلق ماليًا ولا يمكن تعديل بياناته التشغيلية.';
      end if;
    end if;

    if new.status='مغلق ماليًا' and old.status is distinct from 'مغلق ماليًا' then
      raise exception 'الإغلاق المالي سيتم تفعيله في مرحلة الربحية والإغلاق المالي المخصصة.';
    end if;
  elsif tg_op='INSERT' and new.status='مغلق ماليًا' then
    raise exception 'لا يمكن إنشاء مشروع مغلق ماليًا.';
  end if;

  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_adv_projects_before_write on public.adv_projects;
create trigger trg_adv_projects_before_write
before insert or update on public.adv_projects
for each row execute function public.adv_projects_before_write();

create or replace function public.adv_projects_status_history_trigger()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.adv_project_status_history(project_id,old_status,new_status,changed_by)
    values(new.id,null,new.status,auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.adv_project_status_history(project_id,old_status,new_status,changed_by)
    values(new.id,old.status,new.status,auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_adv_projects_status_history on public.adv_projects;
create trigger trg_adv_projects_status_history
after insert or update of status on public.adv_projects
for each row execute function public.adv_projects_status_history_trigger();

alter table public.adv_projects enable row level security;
alter table public.adv_project_status_history enable row level security;

drop policy if exists adv_projects_select on public.adv_projects;
drop policy if exists adv_projects_insert on public.adv_projects;
drop policy if exists adv_projects_update on public.adv_projects;
drop policy if exists adv_projects_delete on public.adv_projects;
create policy adv_projects_select on public.adv_projects for select to authenticated
  using (public.has_screen_permission('advertisingProjects','view'));
create policy adv_projects_insert on public.adv_projects for insert to authenticated
  with check (public.has_screen_permission('advertisingProjects','add'));
create policy adv_projects_update on public.adv_projects for update to authenticated
  using (public.has_screen_permission('advertisingProjects','edit'))
  with check (public.has_screen_permission('advertisingProjects','edit'));
create policy adv_projects_delete on public.adv_projects for delete to authenticated
  using (public.has_screen_permission('advertisingProjects','delete'));

drop policy if exists adv_project_status_history_select on public.adv_project_status_history;
create policy adv_project_status_history_select on public.adv_project_status_history
for select to authenticated
using (public.has_screen_permission('advertisingProjects','view'));

grant select,insert,update,delete on public.adv_projects to authenticated;
grant select on public.adv_project_status_history to authenticated;
grant usage,select on sequence public.adv_project_number_seq to authenticated;
grant execute on function public.adv_generate_project_number() to authenticated;

commit;
