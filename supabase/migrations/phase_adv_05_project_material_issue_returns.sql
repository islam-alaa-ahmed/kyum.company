-- Phase ADV-05 — Project Material Issue & Returns
begin;

-- Extend the canonical inventory ledger with project-linked movements.
alter table public.adv_inventory_transactions
  add column if not exists project_id uuid references public.adv_projects(id) on delete restrict;

create index if not exists adv_inventory_transactions_project_idx
  on public.adv_inventory_transactions(project_id,created_at desc);

alter table public.adv_inventory_transactions
  drop constraint if exists adv_inventory_transactions_transaction_type_check;
alter table public.adv_inventory_transactions
  drop constraint if exists adv_inventory_transactions_type_ck;
alter table public.adv_inventory_transactions
  add constraint adv_inventory_transactions_type_ck check (
    transaction_type in (
      'opening_balance','positive_adjustment','negative_adjustment',
      'project_issue','project_return','reversal'
    )
  );

-- Canonical project-cost ledger. Future purchase/expense phases will append to the same owner.
create table if not exists public.adv_project_cost_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.adv_projects(id) on delete restrict,
  cost_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  cost_type text not null default 'material',
  source_type text not null,
  source_id uuid not null,
  inventory_transaction_id uuid unique references public.adv_inventory_transactions(id) on delete restrict,
  item_id uuid references public.adv_items(id) on delete restrict,
  quantity numeric(16,3),
  unit_cost numeric(16,4),
  amount numeric(18,4) not null,
  description text,
  client_transaction_id uuid not null unique,
  reversed_entry_id uuid references public.adv_project_cost_entries(id) on delete restrict,
  is_reversed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists adv_project_cost_entries_project_idx
  on public.adv_project_cost_entries(project_id,cost_date,created_at);
create index if not exists adv_project_cost_entries_item_idx
  on public.adv_project_cost_entries(item_id,created_at);
create unique index if not exists adv_project_cost_source_uq
  on public.adv_project_cost_entries(source_type,source_id)
  where reversed_entry_id is null;

create or replace function public.adv_material_assert_permission(p_action text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('advertisingMaterialIssue',p_action) then
    raise exception 'لا توجد صلاحية % على صرف المواد.',p_action using errcode='42501';
  end if;
end $$;

create or replace function public.adv_material_assert_project_open(p_project_id uuid)
returns public.adv_projects
language plpgsql security definer set search_path=public as $$
declare v_project public.adv_projects;
begin
  select * into v_project
  from public.adv_projects
  where id=p_project_id
  for update;
  if not found then raise exception 'المشروع غير موجود.'; end if;
  if v_project.financial_closed_at is not null or v_project.status='مغلق ماليًا' then
    raise exception 'المشروع مغلق ماليًا ولا يمكن تنفيذ حركات مواد عليه.';
  end if;
  return v_project;
end $$;

-- ISSUE: stock decreases at the current server-authoritative weighted average cost.
create or replace function public.adv_post_project_material_issue(
  p_project_id uuid,
  p_item_id uuid,
  p_quantity numeric,
  p_transaction_date date default null,
  p_notes text default null,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_inventory_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_inventory_transactions;
  v_project public.adv_projects;
  v_balance public.adv_inventory_balances;
  v_new_qty numeric(16,3);
  v_cost numeric(16,4);
  v_total numeric(18,4);
  v_tx public.adv_inventory_transactions;
begin
  perform public.adv_material_assert_permission('add');

  select * into v_existing
  from public.adv_inventory_transactions
  where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;

  if coalesce(p_quantity,0)<=0 then raise exception 'كمية الصرف يجب أن تكون أكبر من صفر.'; end if;
  v_project:=public.adv_material_assert_project_open(p_project_id);

  select * into v_balance
  from public.adv_inventory_balances
  where item_id=p_item_id
  for update;
  if not found or v_balance.quantity_on_hand < p_quantity then
    raise exception 'الكمية المطلوبة أكبر من الرصيد المتاح.';
  end if;

  v_cost:=round(v_balance.average_cost,4);
  v_total:=round(p_quantity*v_cost,4);
  v_new_qty:=v_balance.quantity_on_hand-p_quantity;

  update public.adv_inventory_balances
  set quantity_on_hand=v_new_qty,
      average_cost=case when v_new_qty=0 then 0 else v_balance.average_cost end,
      last_transaction_at=now(),
      updated_at=now()
  where item_id=p_item_id;

  insert into public.adv_inventory_transactions(
    transaction_number,transaction_date,transaction_type,item_id,project_id,
    quantity,quantity_effect,unit_cost,total_cost,balance_quantity_after,average_cost_after,
    reference_type,reference_id,notes,client_transaction_id
  ) values(
    public.adv_inventory_next_number(),
    coalesce(p_transaction_date,(now() at time zone 'Asia/Riyadh')::date),
    'project_issue',p_item_id,p_project_id,
    p_quantity,-p_quantity,v_cost,v_total,v_new_qty,
    case when v_new_qty=0 then 0 else v_balance.average_cost end,
    'project',p_project_id,nullif(trim(p_notes),''),p_client_transaction_id
  ) returning * into v_tx;

  insert into public.adv_project_cost_entries(
    project_id,cost_date,cost_type,source_type,source_id,inventory_transaction_id,
    item_id,quantity,unit_cost,amount,description,client_transaction_id
  ) values(
    p_project_id,v_tx.transaction_date,'material','inventory_issue',v_tx.id,v_tx.id,
    p_item_id,p_quantity,v_cost,v_total,
    coalesce(nullif(trim(p_notes),''),'صرف مواد من المخزون'),p_client_transaction_id
  );

  return v_tx;
end $$;

-- RETURN: only against an original project issue, valued at the ORIGINAL issue cost.
create or replace function public.adv_post_project_material_return(
  p_issue_transaction_id uuid,
  p_quantity numeric,
  p_transaction_date date default null,
  p_notes text default null,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_inventory_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_inventory_transactions;
  v_issue public.adv_inventory_transactions;
  v_project public.adv_projects;
  v_balance public.adv_inventory_balances;
  v_already_returned numeric(16,3);
  v_returnable numeric(16,3);
  v_new_qty numeric(16,3);
  v_new_avg numeric(16,4);
  v_total numeric(18,4);
  v_tx public.adv_inventory_transactions;
begin
  perform public.adv_material_assert_permission('add');

  select * into v_existing
  from public.adv_inventory_transactions
  where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;

  if coalesce(p_quantity,0)<=0 then raise exception 'كمية المرتجع يجب أن تكون أكبر من صفر.'; end if;

  select * into v_issue
  from public.adv_inventory_transactions
  where id=p_issue_transaction_id
  for update;
  if not found or v_issue.transaction_type<>'project_issue' then raise exception 'حركة الصرف الأصلية غير صالحة للمرتجع.'; end if;
  if v_issue.is_reversed then raise exception 'حركة الصرف الأصلية معكوسة ولا يمكن الإرجاع عليها.'; end if;

  v_project:=public.adv_material_assert_project_open(v_issue.project_id);

  select coalesce(sum(t.quantity),0)
    into v_already_returned
  from public.adv_inventory_transactions t
  where t.transaction_type='project_return'
    and t.reference_type='project_issue'
    and t.reference_id=v_issue.id
    and not t.is_reversed;

  v_returnable:=v_issue.quantity-v_already_returned;
  if p_quantity>v_returnable then
    raise exception 'كمية المرتجع أكبر من الكمية المتاحة للرجوع (المتاح %).',v_returnable;
  end if;

  insert into public.adv_inventory_balances(item_id)
  values(v_issue.item_id)
  on conflict(item_id) do nothing;

  select * into v_balance
  from public.adv_inventory_balances
  where item_id=v_issue.item_id
  for update;

  v_new_qty:=v_balance.quantity_on_hand+p_quantity;
  v_total:=round(p_quantity*v_issue.unit_cost,4);
  v_new_avg:=case
    when v_new_qty=0 then 0
    else round(((v_balance.quantity_on_hand*v_balance.average_cost)+v_total)/v_new_qty,4)
  end;

  update public.adv_inventory_balances
  set quantity_on_hand=v_new_qty,
      average_cost=v_new_avg,
      last_transaction_at=now(),
      updated_at=now()
  where item_id=v_issue.item_id;

  insert into public.adv_inventory_transactions(
    transaction_number,transaction_date,transaction_type,item_id,project_id,
    quantity,quantity_effect,unit_cost,total_cost,balance_quantity_after,average_cost_after,
    reference_type,reference_id,notes,client_transaction_id
  ) values(
    public.adv_inventory_next_number(),
    coalesce(p_transaction_date,(now() at time zone 'Asia/Riyadh')::date),
    'project_return',v_issue.item_id,v_issue.project_id,
    p_quantity,p_quantity,v_issue.unit_cost,v_total,v_new_qty,v_new_avg,
    'project_issue',v_issue.id,nullif(trim(p_notes),''),p_client_transaction_id
  ) returning * into v_tx;

  insert into public.adv_project_cost_entries(
    project_id,cost_date,cost_type,source_type,source_id,inventory_transaction_id,
    item_id,quantity,unit_cost,amount,description,client_transaction_id
  ) values(
    v_issue.project_id,v_tx.transaction_date,'material','inventory_return',v_tx.id,v_tx.id,
    v_issue.item_id,p_quantity,v_issue.unit_cost,-v_total,
    coalesce(nullif(trim(p_notes),''),'مرتجع مواد إلى المخزون'),p_client_transaction_id
  );

  return v_tx;
end $$;

-- Controlled delete = reversal. It rolls back BOTH inventory and project cost atomically.
create or replace function public.adv_reverse_project_material_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_inventory_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_inventory_transactions;
  v_original public.adv_inventory_transactions;
  v_project public.adv_projects;
  v_balance public.adv_inventory_balances;
  v_cost_entry public.adv_project_cost_entries;
  v_active_returns numeric(16,3);
  v_new_qty numeric(16,3);
  v_value_after numeric(18,4);
  v_new_avg numeric(16,4);
  v_tx public.adv_inventory_transactions;
begin
  perform public.adv_material_assert_permission('delete');
  if nullif(trim(p_reason),'') is null then raise exception 'سبب عكس الحركة مطلوب.'; end if;

  select * into v_existing
  from public.adv_inventory_transactions
  where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;

  select * into v_original
  from public.adv_inventory_transactions
  where id=p_transaction_id
  for update;
  if not found or v_original.transaction_type not in ('project_issue','project_return') then
    raise exception 'هذه الحركة لا تخص صرف مواد المشاريع.';
  end if;
  if v_original.is_reversed then raise exception 'الحركة معكوسة بالفعل.'; end if;

  v_project:=public.adv_material_assert_project_open(v_original.project_id);

  if v_original.transaction_type='project_issue' then
    select coalesce(sum(t.quantity),0)
      into v_active_returns
    from public.adv_inventory_transactions t
    where t.transaction_type='project_return'
      and t.reference_type='project_issue'
      and t.reference_id=v_original.id
      and not t.is_reversed;
    if v_active_returns>0 then
      raise exception 'لا يمكن عكس حركة الصرف قبل عكس المرتجعات المرتبطة بها.';
    end if;
  end if;

  select * into v_balance
  from public.adv_inventory_balances
  where item_id=v_original.item_id
  for update;
  if not found then raise exception 'رصيد الصنف غير موجود.'; end if;

  if v_original.transaction_type='project_issue' then
    -- Restore issued stock at its historical issue value.
    v_new_qty:=v_balance.quantity_on_hand+v_original.quantity;
    v_new_avg:=case when v_new_qty=0 then 0
      else round(((v_balance.quantity_on_hand*v_balance.average_cost)+v_original.total_cost)/v_new_qty,4) end;
  else
    -- Undo a return: remove exactly the quantity/value that the return restored.
    if v_balance.quantity_on_hand<v_original.quantity then
      raise exception 'لا يمكن عكس المرتجع لأن الرصيد الحالي أقل من كمية المرتجع.';
    end if;
    v_new_qty:=v_balance.quantity_on_hand-v_original.quantity;
    v_value_after:=round((v_balance.quantity_on_hand*v_balance.average_cost)-v_original.total_cost,4);
    if v_value_after < -0.01 then
      raise exception 'لا يمكن عكس المرتجع بأمان بسبب حركات مخزون لاحقة.';
    end if;
    if v_new_qty=0 then
      if abs(v_value_after)>0.01 then raise exception 'لا يمكن عكس المرتجع بأمان بسبب اختلاف قيمة المخزون الحالية.'; end if;
      v_new_avg:=0;
    else
      v_new_avg:=round(greatest(v_value_after,0)/v_new_qty,4);
    end if;
  end if;

  update public.adv_inventory_balances
  set quantity_on_hand=v_new_qty,average_cost=v_new_avg,last_transaction_at=now(),updated_at=now()
  where item_id=v_original.item_id;

  update public.adv_inventory_transactions
  set is_reversed=true
  where id=v_original.id;

  select * into v_cost_entry
  from public.adv_project_cost_entries
  where inventory_transaction_id=v_original.id
  for update;
  if not found then raise exception 'قيد تكلفة المشروع المرتبط بالحركة غير موجود.'; end if;

  update public.adv_project_cost_entries set is_reversed=true where id=v_cost_entry.id;

  insert into public.adv_inventory_transactions(
    transaction_number,transaction_date,transaction_type,item_id,project_id,
    quantity,quantity_effect,unit_cost,total_cost,balance_quantity_after,average_cost_after,
    reference_type,reference_id,notes,client_transaction_id,reversed_transaction_id
  ) values(
    public.adv_inventory_next_number(),(now() at time zone 'Asia/Riyadh')::date,'reversal',
    v_original.item_id,v_original.project_id,v_original.quantity,-v_original.quantity_effect,
    v_original.unit_cost,-v_original.total_cost,v_new_qty,v_new_avg,
    'material_transaction',v_original.id,trim(p_reason),p_client_transaction_id,v_original.id
  ) returning * into v_tx;

  insert into public.adv_project_cost_entries(
    project_id,cost_date,cost_type,source_type,source_id,inventory_transaction_id,
    item_id,quantity,unit_cost,amount,description,client_transaction_id,reversed_entry_id
  ) values(
    v_original.project_id,v_tx.transaction_date,'material','reversal',v_tx.id,v_tx.id,
    v_original.item_id,v_original.quantity,v_original.unit_cost,-v_cost_entry.amount,
    trim(p_reason),p_client_transaction_id,v_cost_entry.id
  );

  return v_tx;
end $$;

-- Prevent the generic inventory screen from reversing project-linked movements,
-- because it does not own the Project Cost Ledger.
create or replace function public.adv_inventory_reverse(
  p_transaction_id uuid,
  p_reason text,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_inventory_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_inventory_transactions;
  v_original public.adv_inventory_transactions;
  v_balance public.adv_inventory_balances;
  v_new_qty numeric(16,3);
  v_new_avg numeric(16,4);
  v_row public.adv_inventory_transactions;
begin
  perform public.adv_inventory_assert_permission('delete');
  if nullif(trim(p_reason),'') is null then raise exception 'سبب عكس الحركة مطلوب.'; end if;
  select * into v_existing from public.adv_inventory_transactions where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;
  select * into v_original from public.adv_inventory_transactions where id=p_transaction_id for update;
  if not found then raise exception 'حركة المخزون غير موجودة.'; end if;
  if v_original.transaction_type in ('project_issue','project_return') or v_original.project_id is not null then
    raise exception 'حركات مواد المشاريع يتم عكسها من شاشة صرف المواد فقط.';
  end if;
  if v_original.is_reversed or v_original.transaction_type='reversal' then raise exception 'الحركة معكوسة بالفعل أو لا يمكن عكسها.'; end if;

  select * into v_balance from public.adv_inventory_balances where item_id=v_original.item_id for update;
  v_new_qty:=v_balance.quantity_on_hand-v_original.quantity_effect;
  if v_new_qty<0 then raise exception 'لا يمكن عكس الحركة لأن الكمية الناتجة ستكون سالبة. اعكس الحركات اللاحقة المؤثرة أولًا.'; end if;

  if v_new_qty=0 then v_new_avg:=0;
  elsif v_original.quantity_effect<0 then
    v_new_avg:=v_balance.average_cost;
  else
    if (v_balance.quantity_on_hand*v_balance.average_cost)-(v_original.quantity*v_original.unit_cost)<0 then
      raise exception 'لا يمكن عكس الحركة بأمان بسبب حركات لاحقة. اعكس الحركات اللاحقة أولًا.';
    end if;
    v_new_avg:=round(((v_balance.quantity_on_hand*v_balance.average_cost)-(v_original.quantity*v_original.unit_cost))/v_new_qty,4);
  end if;

  update public.adv_inventory_balances
  set quantity_on_hand=v_new_qty,average_cost=v_new_avg,last_transaction_at=now(),updated_at=now()
  where item_id=v_original.item_id;
  update public.adv_inventory_transactions set is_reversed=true where id=v_original.id;

  insert into public.adv_inventory_transactions(
    transaction_number,transaction_date,transaction_type,item_id,project_id,
    quantity,quantity_effect,unit_cost,total_cost,balance_quantity_after,average_cost_after,
    reference_type,reference_id,notes,client_transaction_id,reversed_transaction_id
  ) values(
    public.adv_inventory_next_number(),(now() at time zone 'Asia/Riyadh')::date,'reversal',
    v_original.item_id,null,v_original.quantity,-v_original.quantity_effect,
    v_original.unit_cost,-v_original.total_cost,v_new_qty,v_new_avg,
    'inventory_transaction',v_original.id,trim(p_reason),p_client_transaction_id,v_original.id
  ) returning * into v_row;
  return v_row;
end $$;

-- Read permissions needed by the material-issue screen, without granting writes.
drop policy if exists adv_projects_select on public.adv_projects;
create policy adv_projects_select on public.adv_projects for select to authenticated
using(
  public.has_screen_permission('advertisingProjects','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
);

do $$
declare t text;
begin
  foreach t in array array['adv_items','adv_units','adv_item_categories'] loop
    execute format('drop policy if exists %I on public.%I',t||'_select',t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        public.has_screen_permission(''advertisingReferenceData'',''view'')
        or public.has_screen_permission(''advertisingInventory'',''view'')
        or public.has_screen_permission(''advertisingMaterialIssue'',''view'')
      )',t||'_select',t
    );
  end loop;
end $$;

drop policy if exists adv_inventory_balances_select on public.adv_inventory_balances;
create policy adv_inventory_balances_select on public.adv_inventory_balances for select to authenticated
using(
  public.has_screen_permission('advertisingInventory','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
);

drop policy if exists adv_inventory_transactions_select on public.adv_inventory_transactions;
create policy adv_inventory_transactions_select on public.adv_inventory_transactions for select to authenticated
using(
  public.has_screen_permission('advertisingInventory','view')
  or public.has_screen_permission('advertisingMaterialIssue','view')
);

alter table public.adv_project_cost_entries enable row level security;
drop policy if exists adv_project_cost_entries_select on public.adv_project_cost_entries;
create policy adv_project_cost_entries_select on public.adv_project_cost_entries for select to authenticated
using(
  public.has_screen_permission('advertisingMaterialIssue','view')
  or public.has_screen_permission('advertisingProjectCosts','view')
  or public.has_screen_permission('advertisingReports','view')
);
revoke insert,update,delete on public.adv_project_cost_entries from authenticated;
grant select on public.adv_project_cost_entries to authenticated;

grant execute on function public.adv_post_project_material_issue(uuid,uuid,numeric,date,text,uuid) to authenticated;
grant execute on function public.adv_post_project_material_return(uuid,numeric,date,text,uuid) to authenticated;
grant execute on function public.adv_reverse_project_material_transaction(uuid,text,uuid) to authenticated;

commit;
