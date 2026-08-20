-- Phase ADV-02 — Advertising Department Reference Data
begin;

create table if not exists public.adv_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  symbol text,
  allows_decimal boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_units_name_uq on public.adv_units(lower(trim(name)));

create table if not exists public.adv_item_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_item_categories_name_uq on public.adv_item_categories(lower(trim(name)));

create table if not exists public.adv_project_types (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_project_types_name_uq on public.adv_project_types(lower(trim(name)));
create unique index if not exists adv_project_types_code_uq on public.adv_project_types(lower(trim(code))) where nullif(trim(code),'') is not null;

create table if not exists public.adv_expense_types (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_expense_types_name_uq on public.adv_expense_types(lower(trim(name)));
create unique index if not exists adv_expense_types_code_uq on public.adv_expense_types(lower(trim(code))) where nullif(trim(code),'') is not null;

create table if not exists public.adv_payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_payment_methods_name_uq on public.adv_payment_methods(lower(trim(name)));
create unique index if not exists adv_payment_methods_code_uq on public.adv_payment_methods(lower(trim(code))) where nullif(trim(code),'') is not null;

create table if not exists public.adv_employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text,
  name text not null,
  job_title text,
  phone text,
  can_have_custody boolean not null default false,
  user_id uuid references public.user_profiles(id) on delete set null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_employees_code_uq on public.adv_employees(lower(trim(employee_code))) where nullif(trim(employee_code),'') is not null;
create index if not exists adv_employees_name_idx on public.adv_employees(lower(name));

create table if not exists public.adv_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text,
  name text not null,
  phone text,
  tax_number text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_suppliers_code_uq on public.adv_suppliers(lower(trim(supplier_code))) where nullif(trim(supplier_code),'') is not null;
create index if not exists adv_suppliers_name_idx on public.adv_suppliers(lower(name));

create table if not exists public.adv_items (
  id uuid primary key default gen_random_uuid(),
  item_code text,
  name text not null,
  category_id uuid references public.adv_item_categories(id) on delete restrict,
  unit_id uuid references public.adv_units(id) on delete restrict,
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index if not exists adv_items_name_uq on public.adv_items(lower(trim(name)));
create unique index if not exists adv_items_code_uq on public.adv_items(lower(trim(item_code))) where nullif(trim(item_code),'') is not null;
create index if not exists adv_items_category_idx on public.adv_items(category_id);
create index if not exists adv_items_unit_idx on public.adv_items(unit_id);

create or replace function public.adv_touch_updated_at()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'adv_units','adv_item_categories','adv_project_types','adv_expense_types',
    'adv_payment_methods','adv_employees','adv_suppliers','adv_items'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.adv_touch_updated_at()',t,t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'adv_units','adv_item_categories','adv_project_types','adv_expense_types',
    'adv_payment_methods','adv_employees','adv_suppliers','adv_items'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_select',t);
    execute format('drop policy if exists %I on public.%I',t||'_insert',t);
    execute format('drop policy if exists %I on public.%I',t||'_update',t);
    execute format('drop policy if exists %I on public.%I',t||'_delete',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_screen_permission(''advertisingReferenceData'',''view''))',t||'_select',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_screen_permission(''advertisingReferenceData'',''add''))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_screen_permission(''advertisingReferenceData'',''edit'')) with check (public.has_screen_permission(''advertisingReferenceData'',''edit''))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_screen_permission(''advertisingReferenceData'',''delete''))',t||'_delete',t);
  end loop;
end $$;

commit;
