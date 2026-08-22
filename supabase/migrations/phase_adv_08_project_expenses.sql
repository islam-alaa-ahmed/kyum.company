-- Phase ADV-08 — Project Expenses
begin;

create sequence if not exists public.adv_project_expense_seq start 1;

create table if not exists public.adv_project_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number text not null unique,
  project_id uuid not null references public.adv_projects(id) on delete restrict,
  expense_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  expense_type_id uuid not null references public.adv_expense_types(id) on delete restrict,
  payment_source text not null check(payment_source in ('custody','external')),
  employee_id uuid references public.adv_employees(id) on delete restrict,
  amount numeric(16,2) not null check(amount>0),
  description text,
  reference_number text,
  notes text,
  status text not null default 'posted' check(status in ('posted','reversed')),
  project_cost_entry_id uuid unique references public.adv_project_cost_entries(id) on delete restrict,
  custody_transaction_id uuid unique references public.adv_custody_transactions(id) on delete restrict,
  client_transaction_id uuid not null unique,
  reversed_at timestamptz,
  reversed_by uuid,
  reversal_reason text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists adv_project_expenses_project_idx on public.adv_project_expenses(project_id,expense_date desc);
create index if not exists adv_project_expenses_type_idx on public.adv_project_expenses(expense_type_id,expense_date desc);
create index if not exists adv_project_expenses_employee_idx on public.adv_project_expenses(employee_id,expense_date desc);

alter table public.adv_custody_transactions
  drop constraint if exists adv_custody_transactions_transaction_type_check;
alter table public.adv_custody_transactions
  add constraint adv_custody_transactions_transaction_type_check check (
    transaction_type in (
      'custody_received','cash_return','settlement_increase','settlement_decrease',
      'project_direct_payment','project_expense_payment','reversal'
    )
  );

create or replace function public.adv_project_expense_next_number()
returns text language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
  v:=nextval('public.adv_project_expense_seq');
  return 'EXP-'||to_char((now() at time zone 'Asia/Riyadh'),'YYYY')||'-'||lpad(v::text,7,'0');
end $$;

create or replace function public.adv_project_expense_assert_permission(p_action text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('advertisingProjectCosts',p_action) then
    raise exception 'لا توجد صلاحية % على تكلفة وربحية المشاريع.',p_action using errcode='42501';
  end if;
end $$;

create or replace function public.adv_post_project_expense(
  p_project_id uuid,
  p_expense_date date,
  p_expense_type_id uuid,
  p_payment_source text,
  p_employee_id uuid,
  p_amount numeric,
  p_description text default null,
  p_reference_number text default null,
  p_notes text default null,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_project_expenses
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_project_expenses;
  v_project public.adv_projects;
  v_type public.adv_expense_types;
  v_employee public.adv_employees;
  v_account public.adv_custody_accounts;
  v_custody public.adv_custody_transactions;
  v_cost public.adv_project_cost_entries;
  v_expense public.adv_project_expenses;
begin
  perform public.adv_project_expense_assert_permission('add');

  select * into v_existing from public.adv_project_expenses where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;

  if coalesce(p_amount,0)<=0 then raise exception 'قيمة المصروف يجب أن تكون أكبر من صفر.'; end if;
  if p_payment_source not in ('custody','external') then raise exception 'مصدر دفع المصروف غير صالح.'; end if;

  select * into v_project from public.adv_projects where id=p_project_id for update;
  if not found then raise exception 'المشروع غير موجود.'; end if;
  if v_project.financial_closed_at is not null or v_project.status='مغلق ماليًا' then
    raise exception 'المشروع مغلق ماليًا ولا يمكن إضافة مصروفات عليه.';
  end if;

  select * into v_type from public.adv_expense_types where id=p_expense_type_id and is_active=true;
  if not found then raise exception 'نوع المصروف غير موجود أو غير نشط.'; end if;

  if p_payment_source='custody' then
    if p_employee_id is null then raise exception 'موظف العهدة مطلوب عند الدفع من العهدة.'; end if;
    select * into v_employee from public.adv_employees where id=p_employee_id for share;
    if not found or not v_employee.is_active or not v_employee.can_have_custody then
      raise exception 'موظف العهدة غير صالح.';
    end if;
    v_account:=public.adv_custody_get_or_create_account(p_employee_id);
    if v_account.current_balance < round(p_amount,2) then
      raise exception 'رصيد العهدة غير كافٍ. الرصيد الحالي %.',v_account.current_balance;
    end if;
  end if;

  insert into public.adv_project_expenses(
    expense_number,project_id,expense_date,expense_type_id,payment_source,employee_id,
    amount,description,reference_number,notes,client_transaction_id
  ) values(
    public.adv_project_expense_next_number(),p_project_id,
    coalesce(p_expense_date,(now() at time zone 'Asia/Riyadh')::date),
    p_expense_type_id,p_payment_source,case when p_payment_source='custody' then p_employee_id else null end,
    round(p_amount,2),nullif(trim(p_description),''),nullif(trim(p_reference_number),''),
    nullif(trim(p_notes),''),p_client_transaction_id
  ) returning * into v_expense;

  insert into public.adv_project_cost_entries(
    project_id,cost_date,cost_type,source_type,source_id,amount,description,client_transaction_id
  ) values(
    p_project_id,v_expense.expense_date,'expense','project_expense',v_expense.id,
    v_expense.amount,
    coalesce(nullif(trim(p_description),''),v_type.name),
    gen_random_uuid()
  ) returning * into v_cost;

  if p_payment_source='custody' then
    update public.adv_custody_accounts
    set current_balance=current_balance-v_expense.amount,last_transaction_at=now(),updated_at=now(),updated_by=auth.uid()
    where id=v_account.id
    returning * into v_account;

    insert into public.adv_custody_transactions(
      transaction_number,account_id,employee_id,transaction_date,transaction_type,
      amount,signed_amount,balance_after,project_id,description,reference_number,notes,client_transaction_id
    ) values(
      public.adv_custody_next_number(),v_account.id,p_employee_id,v_expense.expense_date,
      'project_expense_payment',v_expense.amount,-v_expense.amount,v_account.current_balance,p_project_id,
      'مصروف مشروع '||v_expense.expense_number,
      v_expense.expense_number,nullif(trim(p_notes),''),gen_random_uuid()
    ) returning * into v_custody;
  end if;

  update public.adv_project_expenses
  set project_cost_entry_id=v_cost.id,
      custody_transaction_id=case when p_payment_source='custody' then v_custody.id else null end
  where id=v_expense.id
  returning * into v_expense;

  return v_expense;
end $$;

create or replace function public.adv_reverse_project_expense(
  p_expense_id uuid,
  p_reason text,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_project_expenses
language plpgsql security definer set search_path=public as $$
declare
  v_expense public.adv_project_expenses;
  v_cost public.adv_project_cost_entries;
  v_custody public.adv_custody_transactions;
  v_account public.adv_custody_accounts;
begin
  perform public.adv_project_expense_assert_permission('delete');
  if nullif(trim(p_reason),'') is null then raise exception 'سبب عكس المصروف مطلوب.'; end if;

  select * into v_expense from public.adv_project_expenses where id=p_expense_id for update;
  if not found then raise exception 'المصروف غير موجود.'; end if;
  if v_expense.status='reversed' then return v_expense; end if;

  perform public.adv_material_assert_project_open(v_expense.project_id);

  select * into v_cost from public.adv_project_cost_entries where id=v_expense.project_cost_entry_id for update;
  if not found or v_cost.is_reversed then raise exception 'قيد تكلفة المشروع غير موجود أو معكوس بالفعل.'; end if;

  update public.adv_project_cost_entries set is_reversed=true where id=v_cost.id;
  insert into public.adv_project_cost_entries(
    project_id,cost_date,cost_type,source_type,source_id,amount,description,
    client_transaction_id,reversed_entry_id
  ) values(
    v_expense.project_id,(now() at time zone 'Asia/Riyadh')::date,'expense',
    'project_expense_reversal',v_expense.id,-v_cost.amount,trim(p_reason),
    gen_random_uuid(),v_cost.id
  );

  if v_expense.custody_transaction_id is not null then
    select * into v_custody from public.adv_custody_transactions where id=v_expense.custody_transaction_id for update;
    if not found or v_custody.is_reversed then raise exception 'حركة العهدة المرتبطة بالمصروف غير موجودة أو معكوسة.'; end if;

    select * into v_account from public.adv_custody_accounts where id=v_custody.account_id for update;
    update public.adv_custody_accounts
    set current_balance=current_balance+v_expense.amount,last_transaction_at=now(),updated_at=now(),updated_by=auth.uid()
    where id=v_account.id
    returning * into v_account;

    update public.adv_custody_transactions set is_reversed=true where id=v_custody.id;

    insert into public.adv_custody_transactions(
      transaction_number,account_id,employee_id,transaction_date,transaction_type,
      amount,signed_amount,balance_after,project_id,description,reference_number,notes,
      client_transaction_id,reversed_transaction_id
    ) values(
      public.adv_custody_next_number(),v_account.id,v_custody.employee_id,
      (now() at time zone 'Asia/Riyadh')::date,'reversal',
      v_expense.amount,v_expense.amount,v_account.current_balance,v_expense.project_id,
      'عكس مصروف مشروع '||v_expense.expense_number,v_expense.expense_number,
      trim(p_reason),gen_random_uuid(),v_custody.id
    );
  end if;

  update public.adv_project_expenses
  set status='reversed',reversed_at=now(),reversed_by=auth.uid(),reversal_reason=trim(p_reason)
  where id=v_expense.id
  returning * into v_expense;

  return v_expense;
end $$;

-- Protect expense-owned custody movements from being reversed outside their canonical owner.
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
  if v_original.transaction_type='project_expense_payment' then
    raise exception 'حركة العهدة مرتبطة بمصروف مشروع ويتم عكسها من شاشة مصروفات المشروع فقط.';
  end if;
  if v_original.is_reversed or v_original.transaction_type='reversal' then raise exception 'الحركة معكوسة بالفعل أو لا يمكن عكسها.'; end if;

  select * into v_account from public.adv_custody_accounts where id=v_original.account_id for update;
  v_new_balance:=v_account.current_balance-v_original.signed_amount;
  if v_new_balance<0 then raise exception 'لا يمكن عكس الحركة لأن رصيد العهدة الناتج سيكون سالبًا. اعكس الحركات اللاحقة أولًا.'; end if;

  if v_original.project_id is not null then perform public.adv_material_assert_project_open(v_original.project_id); end if;

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
    select * into v_cost from public.adv_project_cost_entries
    where source_type='custody_direct_payment' and source_id=v_original.id for update;
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

alter table public.adv_project_expenses enable row level security;
drop policy if exists adv_project_expenses_select on public.adv_project_expenses;
create policy adv_project_expenses_select on public.adv_project_expenses for select to authenticated
using(public.has_screen_permission('advertisingProjectCosts','view'));

drop policy if exists adv_expense_types_select on public.adv_expense_types;
create policy adv_expense_types_select on public.adv_expense_types for select to authenticated
using(
  public.has_screen_permission('advertisingReferenceData','view')
  or public.has_screen_permission('advertisingProjectCosts','view')
);

drop policy if exists adv_employees_select on public.adv_employees;
create policy adv_employees_select on public.adv_employees for select to authenticated
using(
  public.has_screen_permission('advertisingReferenceData','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
  or public.has_screen_permission('advertisingProjectCosts','view')
);

drop policy if exists adv_projects_select on public.adv_projects;
create policy adv_projects_select on public.adv_projects for select to authenticated
using(
  public.has_screen_permission('advertisingProjects','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
  or public.has_screen_permission('advertisingCustodyPurchases','view')
  or public.has_screen_permission('advertisingProjectCosts','view')
);

revoke insert,update,delete on public.adv_project_expenses from authenticated;
grant select on public.adv_project_expenses to authenticated;
grant execute on function public.adv_post_project_expense(uuid,date,uuid,text,uuid,numeric,text,text,text,uuid) to authenticated;
grant execute on function public.adv_reverse_project_expense(uuid,text,uuid) to authenticated;

commit;
