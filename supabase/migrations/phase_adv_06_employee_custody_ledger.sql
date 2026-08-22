-- Phase ADV-06 — Employee Custody Ledger
begin;

create sequence if not exists public.adv_custody_transaction_seq start 1;

create table if not exists public.adv_custody_accounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.adv_employees(id) on delete restrict,
  current_balance numeric(16,2) not null default 0 check (current_balance >= 0),
  is_active boolean not null default true,
  last_transaction_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.adv_custody_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique,
  account_id uuid not null references public.adv_custody_accounts(id) on delete restrict,
  employee_id uuid not null references public.adv_employees(id) on delete restrict,
  transaction_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  transaction_type text not null check (
    transaction_type in (
      'custody_received','cash_return','settlement_increase','settlement_decrease',
      'project_direct_payment','reversal'
    )
  ),
  amount numeric(16,2) not null check (amount > 0),
  signed_amount numeric(16,2) not null check (signed_amount <> 0),
  balance_after numeric(16,2) not null check (balance_after >= 0),
  project_id uuid references public.adv_projects(id) on delete restrict,
  item_id uuid references public.adv_items(id) on delete restrict,
  description text,
  reference_number text,
  notes text,
  client_transaction_id uuid not null unique,
  reversed_transaction_id uuid references public.adv_custody_transactions(id) on delete restrict,
  is_reversed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists adv_custody_transactions_account_idx on public.adv_custody_transactions(account_id,created_at desc);
create index if not exists adv_custody_transactions_employee_idx on public.adv_custody_transactions(employee_id,created_at desc);
create index if not exists adv_custody_transactions_project_idx on public.adv_custody_transactions(project_id,created_at desc);
create unique index if not exists adv_custody_one_reversal_uq on public.adv_custody_transactions(reversed_transaction_id) where reversed_transaction_id is not null;

create or replace function public.adv_custody_next_number()
returns text language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
  v:=nextval('public.adv_custody_transaction_seq');
  return 'CUS-'||to_char((now() at time zone 'Asia/Riyadh'),'YYYY')||'-'||lpad(v::text,7,'0');
end $$;

create or replace function public.adv_custody_assert_permission(p_action text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('advertisingCustodyPurchases',p_action) then
    raise exception 'لا توجد صلاحية % على العهد والمشتريات.',p_action using errcode='42501';
  end if;
end $$;

create or replace function public.adv_custody_get_or_create_account(p_employee_id uuid)
returns public.adv_custody_accounts
language plpgsql security definer set search_path=public as $$
declare v_employee public.adv_employees; v_account public.adv_custody_accounts;
begin
  select * into v_employee from public.adv_employees where id=p_employee_id for share;
  if not found or not v_employee.is_active then raise exception 'الموظف غير موجود أو غير نشط.'; end if;
  if not v_employee.can_have_custody then raise exception 'الموظف غير مسموح له باستلام عهدة.'; end if;

  insert into public.adv_custody_accounts(employee_id)
  values(p_employee_id)
  on conflict(employee_id) do nothing;

  select * into v_account from public.adv_custody_accounts where employee_id=p_employee_id for update;
  if not v_account.is_active then raise exception 'حساب عهدة الموظف غير نشط.'; end if;
  return v_account;
end $$;

create or replace function public.adv_custody_post(
  p_employee_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_transaction_date date default null,
  p_project_id uuid default null,
  p_item_id uuid default null,
  p_description text default null,
  p_reference_number text default null,
  p_notes text default null,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_custody_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_custody_transactions;
  v_account public.adv_custody_accounts;
  v_project public.adv_projects;
  v_signed numeric(16,2);
  v_new_balance numeric(16,2);
  v_tx public.adv_custody_transactions;
begin
  perform public.adv_custody_assert_permission('add');

  select * into v_existing from public.adv_custody_transactions where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;

  if coalesce(p_amount,0)<=0 then raise exception 'قيمة الحركة يجب أن تكون أكبر من صفر.'; end if;
  if p_transaction_type not in ('custody_received','cash_return','settlement_increase','settlement_decrease','project_direct_payment') then
    raise exception 'نوع حركة العهدة غير صالح.';
  end if;

  v_account:=public.adv_custody_get_or_create_account(p_employee_id);

  if p_transaction_type in ('custody_received','settlement_increase') then
    v_signed:=round(p_amount,2);
  else
    v_signed:=-round(p_amount,2);
  end if;

  if p_transaction_type='project_direct_payment' then
    if p_project_id is null then raise exception 'المشروع مطلوب للصرف المباشر من العهدة.'; end if;
    select * into v_project from public.adv_projects where id=p_project_id for update;
    if not found then raise exception 'المشروع غير موجود.'; end if;
    if v_project.financial_closed_at is not null or v_project.status='مغلق ماليًا' then
      raise exception 'المشروع مغلق ماليًا ولا يمكن الصرف عليه.';
    end if;
  elsif p_project_id is not null then
    raise exception 'ربط المشروع مسموح فقط في الصرف المباشر من العهدة.';
  end if;

  v_new_balance:=v_account.current_balance+v_signed;
  if v_new_balance<0 then
    raise exception 'رصيد العهدة غير كافٍ. الرصيد الحالي %.',v_account.current_balance;
  end if;

  update public.adv_custody_accounts
  set current_balance=v_new_balance,last_transaction_at=now(),updated_at=now(),updated_by=auth.uid()
  where id=v_account.id;

  insert into public.adv_custody_transactions(
    transaction_number,account_id,employee_id,transaction_date,transaction_type,
    amount,signed_amount,balance_after,project_id,item_id,description,reference_number,notes,client_transaction_id
  ) values(
    public.adv_custody_next_number(),v_account.id,p_employee_id,
    coalesce(p_transaction_date,(now() at time zone 'Asia/Riyadh')::date),
    p_transaction_type,round(p_amount,2),v_signed,v_new_balance,p_project_id,p_item_id,
    nullif(trim(p_description),''),nullif(trim(p_reference_number),''),nullif(trim(p_notes),''),
    p_client_transaction_id
  ) returning * into v_tx;

  if p_transaction_type='project_direct_payment' then
    insert into public.adv_project_cost_entries(
      project_id,cost_date,cost_type,source_type,source_id,item_id,amount,description,client_transaction_id
    ) values(
      p_project_id,v_tx.transaction_date,'direct_purchase','custody_direct_payment',v_tx.id,p_item_id,
      round(p_amount,2),coalesce(nullif(trim(p_description),''),'صرف مباشر من عهدة الموظف'),
      p_client_transaction_id
    );
  end if;

  return v_tx;
end $$;

create or replace function public.adv_reverse_custody_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_custody_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_custody_transactions;
  v_original public.adv_custody_transactions;
  v_account public.adv_custody_accounts;
  v_cost public.adv_project_cost_entries;
  v_new_balance numeric(16,2);
  v_tx public.adv_custody_transactions;
begin
  perform public.adv_custody_assert_permission('delete');
  if nullif(trim(p_reason),'') is null then raise exception 'سبب عكس حركة العهدة مطلوب.'; end if;

  select * into v_existing from public.adv_custody_transactions where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;

  select * into v_original from public.adv_custody_transactions where id=p_transaction_id for update;
  if not found then raise exception 'حركة العهدة غير موجودة.'; end if;
  if v_original.is_reversed or v_original.transaction_type='reversal' then raise exception 'الحركة معكوسة بالفعل أو لا يمكن عكسها.'; end if;

  select * into v_account from public.adv_custody_accounts where id=v_original.account_id for update;
  v_new_balance:=v_account.current_balance-v_original.signed_amount;
  if v_new_balance<0 then
    raise exception 'لا يمكن عكس الحركة لأن رصيد العهدة الناتج سيكون سالبًا. اعكس الحركات اللاحقة أولًا.';
  end if;

  if v_original.project_id is not null then
    perform public.adv_material_assert_project_open(v_original.project_id);
  end if;

  update public.adv_custody_accounts
  set current_balance=v_new_balance,last_transaction_at=now(),updated_at=now(),updated_by=auth.uid()
  where id=v_account.id;

  update public.adv_custody_transactions set is_reversed=true where id=v_original.id;

  insert into public.adv_custody_transactions(
    transaction_number,account_id,employee_id,transaction_date,transaction_type,
    amount,signed_amount,balance_after,project_id,item_id,description,reference_number,notes,
    client_transaction_id,reversed_transaction_id
  ) values(
    public.adv_custody_next_number(),v_original.account_id,v_original.employee_id,
    (now() at time zone 'Asia/Riyadh')::date,'reversal',
    v_original.amount,-v_original.signed_amount,v_new_balance,v_original.project_id,v_original.item_id,
    'عكس '||v_original.transaction_number,v_original.reference_number,trim(p_reason),
    p_client_transaction_id,v_original.id
  ) returning * into v_tx;

  if v_original.transaction_type='project_direct_payment' then
    select * into v_cost
    from public.adv_project_cost_entries
    where source_type='custody_direct_payment' and source_id=v_original.id
    for update;
    if not found then raise exception 'قيد تكلفة المشروع المرتبط بحركة العهدة غير موجود.'; end if;

    update public.adv_project_cost_entries set is_reversed=true where id=v_cost.id;

    insert into public.adv_project_cost_entries(
      project_id,cost_date,cost_type,source_type,source_id,item_id,amount,description,
      client_transaction_id,reversed_entry_id
    ) values(
      v_original.project_id,v_tx.transaction_date,'direct_purchase','reversal',v_tx.id,v_original.item_id,
      -v_cost.amount,trim(p_reason),p_client_transaction_id,v_cost.id
    );
  end if;

  return v_tx;
end $$;

alter table public.adv_custody_accounts enable row level security;
alter table public.adv_custody_transactions enable row level security;

drop policy if exists adv_custody_accounts_select on public.adv_custody_accounts;
create policy adv_custody_accounts_select on public.adv_custody_accounts for select to authenticated
using(public.has_screen_permission('advertisingCustodyPurchases','view'));

drop policy if exists adv_custody_transactions_select on public.adv_custody_transactions;
create policy adv_custody_transactions_select on public.adv_custody_transactions for select to authenticated
using(public.has_screen_permission('advertisingCustodyPurchases','view'));

-- Custody screen can read active employees/items/projects needed for its own operation.
drop policy if exists adv_employees_select on public.adv_employees;
create policy adv_employees_select on public.adv_employees for select to authenticated
using(
  public.has_screen_permission('advertisingReferenceData','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
);

drop policy if exists adv_items_select on public.adv_items;
create policy adv_items_select on public.adv_items for select to authenticated
using(
  public.has_screen_permission('advertisingReferenceData','view')
  or public.has_screen_permission('advertisingInventory','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
);

drop policy if exists adv_units_select on public.adv_units;
create policy adv_units_select on public.adv_units for select to authenticated
using(
  public.has_screen_permission('advertisingReferenceData','view')
  or public.has_screen_permission('advertisingInventory','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
);

drop policy if exists adv_item_categories_select on public.adv_item_categories;
create policy adv_item_categories_select on public.adv_item_categories for select to authenticated
using(
  public.has_screen_permission('advertisingReferenceData','view')
  or public.has_screen_permission('advertisingInventory','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
);

drop policy if exists adv_projects_select on public.adv_projects;
create policy adv_projects_select on public.adv_projects for select to authenticated
using(
  public.has_screen_permission('advertisingProjects','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
);

revoke insert,update,delete on public.adv_custody_accounts from authenticated;
revoke insert,update,delete on public.adv_custody_transactions from authenticated;
grant select on public.adv_custody_accounts,public.adv_custody_transactions to authenticated;
grant execute on function public.adv_custody_post(uuid,text,numeric,date,uuid,uuid,text,text,text,uuid) to authenticated;
grant execute on function public.adv_reverse_custody_transaction(uuid,text,uuid) to authenticated;

commit;
