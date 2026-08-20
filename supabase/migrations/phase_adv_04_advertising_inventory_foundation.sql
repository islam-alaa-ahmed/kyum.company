-- Phase ADV-04 — Advertising Inventory Foundation
begin;

create sequence if not exists public.adv_inventory_transaction_seq start 1;

create table if not exists public.adv_inventory_balances (
  item_id uuid primary key references public.adv_items(id) on delete restrict,
  quantity_on_hand numeric(16,3) not null default 0 check (quantity_on_hand >= 0),
  average_cost numeric(16,4) not null default 0 check (average_cost >= 0),
  inventory_value numeric(18,4) generated always as (round(quantity_on_hand * average_cost,4)) stored,
  last_transaction_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.adv_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique,
  transaction_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  transaction_type text not null check (transaction_type in ('opening_balance','positive_adjustment','negative_adjustment','reversal')),
  item_id uuid not null references public.adv_items(id) on delete restrict,
  quantity numeric(16,3) not null check (quantity > 0),
  quantity_effect numeric(16,3) not null check (quantity_effect <> 0),
  unit_cost numeric(16,4) not null default 0 check (unit_cost >= 0),
  total_cost numeric(18,4) not null default 0,
  balance_quantity_after numeric(16,3) not null,
  average_cost_after numeric(16,4) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  client_transaction_id uuid not null unique,
  reversed_transaction_id uuid references public.adv_inventory_transactions(id) on delete restrict,
  is_reversed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists adv_inventory_transactions_item_idx on public.adv_inventory_transactions(item_id,created_at desc);
create index if not exists adv_inventory_transactions_date_idx on public.adv_inventory_transactions(transaction_date desc);
create unique index if not exists adv_inventory_one_reversal_uq on public.adv_inventory_transactions(reversed_transaction_id) where reversed_transaction_id is not null;

create or replace function public.adv_inventory_next_number()
returns text language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
  v:=nextval('public.adv_inventory_transaction_seq');
  return 'INV-'||to_char((now() at time zone 'Asia/Riyadh'),'YYYY')||'-'||lpad(v::text,7,'0');
end $$;

create or replace function public.adv_inventory_assert_permission(p_action text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('advertisingInventory',p_action) then
    raise exception 'لا توجد صلاحية % على المخزون.',p_action using errcode='42501';
  end if;
end $$;

create or replace function public.adv_inventory_post(
  p_transaction_type text,
  p_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_transaction_date date default null,
  p_notes text default null,
  p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_inventory_transactions
language plpgsql security definer set search_path=public as $$
declare
  v_existing public.adv_inventory_transactions;
  v_balance public.adv_inventory_balances;
  v_effect numeric(16,3);
  v_new_qty numeric(16,3);
  v_new_avg numeric(16,4);
  v_cost numeric(16,4);
  v_row public.adv_inventory_transactions;
begin
  perform public.adv_inventory_assert_permission('add');
  select * into v_existing from public.adv_inventory_transactions where client_transaction_id=p_client_transaction_id;
  if found then return v_existing; end if;
  if p_transaction_type not in ('opening_balance','positive_adjustment','negative_adjustment') then raise exception 'نوع حركة المخزون غير صالح.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'الكمية يجب أن تكون أكبر من صفر.'; end if;

  insert into public.adv_inventory_balances(item_id) values(p_item_id) on conflict(item_id) do nothing;
  select * into v_balance from public.adv_inventory_balances where item_id=p_item_id for update;

  if p_transaction_type='opening_balance' and (v_balance.quantity_on_hand<>0 or exists(select 1 from public.adv_inventory_transactions where item_id=p_item_id)) then
    raise exception 'الرصيد الافتتاحي مسموح فقط قبل وجود أي حركة للصنف.';
  end if;

  v_effect:=case when p_transaction_type='negative_adjustment' then -p_quantity else p_quantity end;
  v_new_qty:=v_balance.quantity_on_hand+v_effect;
  if v_new_qty<0 then raise exception 'الكمية المطلوبة أكبر من الرصيد المتاح.'; end if;

  if p_transaction_type in ('opening_balance','positive_adjustment') then
    if p_unit_cost is null or p_unit_cost<0 then raise exception 'تكلفة الوحدة مطلوبة للحركة الموجبة.'; end if;
    v_cost:=round(p_unit_cost,4);
    if v_new_qty=0 then v_new_avg:=0;
    else v_new_avg:=round(((v_balance.quantity_on_hand*v_balance.average_cost)+(p_quantity*v_cost))/v_new_qty,4); end if;
  else
    v_cost:=v_balance.average_cost;
    v_new_avg:=case when v_new_qty=0 then 0 else v_balance.average_cost end;
  end if;

  update public.adv_inventory_balances
  set quantity_on_hand=v_new_qty,average_cost=v_new_avg,last_transaction_at=now(),updated_at=now()
  where item_id=p_item_id;

  insert into public.adv_inventory_transactions(
    transaction_number,transaction_date,transaction_type,item_id,quantity,quantity_effect,unit_cost,total_cost,
    balance_quantity_after,average_cost_after,notes,client_transaction_id
  ) values(
    public.adv_inventory_next_number(),coalesce(p_transaction_date,(now() at time zone 'Asia/Riyadh')::date),
    p_transaction_type,p_item_id,p_quantity,v_effect,v_cost,round(p_quantity*v_cost,4),v_new_qty,v_new_avg,
    nullif(trim(p_notes),''),p_client_transaction_id
  ) returning * into v_row;
  return v_row;
end $$;

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
  if v_original.is_reversed or v_original.transaction_type='reversal' then raise exception 'الحركة معكوسة بالفعل أو لا يمكن عكسها.'; end if;

  select * into v_balance from public.adv_inventory_balances where item_id=v_original.item_id for update;
  v_new_qty:=v_balance.quantity_on_hand-v_original.quantity_effect;
  if v_new_qty<0 then raise exception 'لا يمكن عكس الحركة لأن الكمية الناتجة ستكون سالبة. اعكس الحركات اللاحقة المؤثرة أولًا.'; end if;

  -- Recalculate canonical average cost from surviving positive layers and current value effect.
  if v_new_qty=0 then v_new_avg:=0;
  elsif v_original.quantity_effect<0 then
    v_new_avg:=v_balance.average_cost;
  else
    if (v_balance.quantity_on_hand*v_balance.average_cost)-(v_original.quantity*v_original.unit_cost)<0 then
      raise exception 'لا يمكن عكس الحركة بأمان بسبب حركات لاحقة. اعكس الحركات اللاحقة أولًا.';
    end if;
    v_new_avg:=round(((v_balance.quantity_on_hand*v_balance.average_cost)-(v_original.quantity*v_original.unit_cost))/v_new_qty,4);
  end if;

  update public.adv_inventory_balances set quantity_on_hand=v_new_qty,average_cost=v_new_avg,last_transaction_at=now(),updated_at=now() where item_id=v_original.item_id;
  update public.adv_inventory_transactions set is_reversed=true where id=v_original.id;

  insert into public.adv_inventory_transactions(
    transaction_number,transaction_date,transaction_type,item_id,quantity,quantity_effect,unit_cost,total_cost,
    balance_quantity_after,average_cost_after,reference_type,reference_id,notes,client_transaction_id,reversed_transaction_id
  ) values(
    public.adv_inventory_next_number(),(now() at time zone 'Asia/Riyadh')::date,'reversal',v_original.item_id,
    v_original.quantity,-v_original.quantity_effect,v_original.unit_cost,-v_original.total_cost,v_new_qty,v_new_avg,
    'inventory_transaction',v_original.id,trim(p_reason),p_client_transaction_id,v_original.id
  ) returning * into v_row;
  return v_row;
end $$;

alter table public.adv_inventory_balances enable row level security;
alter table public.adv_inventory_transactions enable row level security;

drop policy if exists adv_inventory_balances_select on public.adv_inventory_balances;
create policy adv_inventory_balances_select on public.adv_inventory_balances for select to authenticated
using(public.has_screen_permission('advertisingInventory','view'));

drop policy if exists adv_inventory_transactions_select on public.adv_inventory_transactions;
create policy adv_inventory_transactions_select on public.adv_inventory_transactions for select to authenticated
using(public.has_screen_permission('advertisingInventory','view'));

-- No direct writes: all balance-affecting operations go through atomic RPCs.
revoke insert,update,delete on public.adv_inventory_balances from authenticated;
revoke insert,update,delete on public.adv_inventory_transactions from authenticated;
grant select on public.adv_inventory_balances,public.adv_inventory_transactions to authenticated;
grant execute on function public.adv_inventory_post(text,uuid,numeric,numeric,date,text,uuid) to authenticated;
grant execute on function public.adv_inventory_reverse(uuid,text,uuid) to authenticated;
grant execute on function public.adv_inventory_next_number() to authenticated;

commit;
