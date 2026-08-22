-- Phase ADV-07 — Purchases
begin;

create sequence if not exists public.adv_purchase_seq start 1;

create table if not exists public.adv_purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  purchase_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  supplier_id uuid references public.adv_suppliers(id) on delete restrict,
  employee_id uuid references public.adv_employees(id) on delete restrict,
  destination_type text not null check(destination_type in ('inventory','project')),
  project_id uuid references public.adv_projects(id) on delete restrict,
  payment_source text not null check(payment_source in ('custody','external')),
  invoice_number text,
  reference_number text,
  notes text,
  total_amount numeric(18,4) not null default 0 check(total_amount>=0),
  status text not null default 'posted' check(status in ('posted','reversed')),
  client_transaction_id uuid not null unique,
  reversed_at timestamptz,
  reversed_by uuid,
  reversal_reason text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table if not exists public.adv_purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.adv_purchases(id) on delete restrict,
  line_no integer not null,
  item_id uuid not null references public.adv_items(id) on delete restrict,
  quantity numeric(16,3) not null check(quantity>0),
  unit_cost numeric(16,4) not null check(unit_cost>=0),
  line_total numeric(18,4) generated always as (round(quantity*unit_cost,4)) stored,
  inventory_transaction_id uuid references public.adv_inventory_transactions(id) on delete restrict,
  project_cost_entry_id uuid references public.adv_project_cost_entries(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(purchase_id,line_no)
);
create index if not exists adv_purchases_date_idx on public.adv_purchases(purchase_date desc);
create index if not exists adv_purchases_supplier_idx on public.adv_purchases(supplier_id);
create index if not exists adv_purchases_employee_idx on public.adv_purchases(employee_id);
create index if not exists adv_purchase_lines_purchase_idx on public.adv_purchase_lines(purchase_id);

create or replace function public.adv_purchase_next_number()
returns text language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
 v:=nextval('public.adv_purchase_seq');
 return 'PUR-'||to_char((now() at time zone 'Asia/Riyadh'),'YYYY')||'-'||lpad(v::text,7,'0');
end $$;

create or replace function public.adv_post_purchase(
 p_purchase_date date,
 p_supplier_id uuid,
 p_employee_id uuid,
 p_destination_type text,
 p_project_id uuid,
 p_payment_source text,
 p_invoice_number text,
 p_reference_number text,
 p_notes text,
 p_lines jsonb,
 p_client_transaction_id uuid default gen_random_uuid()
) returns public.adv_purchases
language plpgsql security definer set search_path=public as $$
declare
 v_existing public.adv_purchases; v_project public.adv_projects; v_employee public.adv_employees;
 v_purchase public.adv_purchases; v_line jsonb; v_item public.adv_items;
 v_qty numeric(16,3); v_cost numeric(16,4); v_total numeric(18,4):=0; v_no int:=0;
 v_balance public.adv_inventory_balances; v_new_qty numeric(16,3); v_new_avg numeric(16,4);
 v_inv public.adv_inventory_transactions; v_costrow public.adv_project_cost_entries;
 v_account public.adv_custody_accounts; v_custody public.adv_custody_transactions;
begin
 perform public.adv_custody_assert_permission('add');
 select * into v_existing from public.adv_purchases where client_transaction_id=p_client_transaction_id;
 if found then return v_existing; end if;
 if p_destination_type not in ('inventory','project') then raise exception 'وجهة الشراء غير صالحة.'; end if;
 if p_payment_source not in ('custody','external') then raise exception 'مصدر الدفع غير صالح.'; end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'يجب إضافة صنف واحد على الأقل.'; end if;
 if p_payment_source='custody' and p_employee_id is null then raise exception 'موظف العهدة مطلوب عند الدفع من العهدة.'; end if;
 if p_destination_type='project' then
   if p_project_id is null then raise exception 'المشروع مطلوب للشراء المباشر.'; end if;
   select * into v_project from public.adv_projects where id=p_project_id for update;
   if not found then raise exception 'المشروع غير موجود.'; end if;
   if v_project.financial_closed_at is not null or v_project.status='مغلق ماليًا' then raise exception 'المشروع مغلق ماليًا ولا يمكن الشراء عليه.'; end if;
 elsif p_project_id is not null then
   raise exception 'المشروع غير مسموح عند الشراء للمخزون.';
 end if;

 for v_line in select value from jsonb_array_elements(p_lines) loop
   v_qty:=nullif(v_line->>'quantity','')::numeric; v_cost:=nullif(v_line->>'unit_cost','')::numeric;
   if coalesce(v_qty,0)<=0 or coalesce(v_cost,-1)<0 then raise exception 'كمية أو تكلفة أحد الأصناف غير صالحة.'; end if;
   select * into v_item from public.adv_items where id=(v_line->>'item_id')::uuid and is_active=true;
   if not found then raise exception 'أحد الأصناف غير موجود أو غير نشط.'; end if;
   v_total:=v_total+round(v_qty*v_cost,4);
 end loop;

 if p_payment_source='custody' then
   select * into v_employee from public.adv_employees where id=p_employee_id for share;
   if not found or not v_employee.is_active or not v_employee.can_have_custody then raise exception 'موظف العهدة غير صالح.'; end if;
   v_account:=public.adv_custody_get_or_create_account(p_employee_id);
   if v_account.current_balance<v_total then raise exception 'رصيد العهدة غير كافٍ لإتمام المشتريات.'; end if;
 end if;

 insert into public.adv_purchases(purchase_number,purchase_date,supplier_id,employee_id,destination_type,project_id,payment_source,invoice_number,reference_number,notes,total_amount,client_transaction_id)
 values(public.adv_purchase_next_number(),coalesce(p_purchase_date,(now() at time zone 'Asia/Riyadh')::date),p_supplier_id,p_employee_id,p_destination_type,p_project_id,p_payment_source,nullif(trim(p_invoice_number),''),nullif(trim(p_reference_number),''),nullif(trim(p_notes),''),v_total,p_client_transaction_id)
 returning * into v_purchase;

 for v_line in select value from jsonb_array_elements(p_lines) loop
   v_no:=v_no+1; v_qty:=(v_line->>'quantity')::numeric; v_cost:=(v_line->>'unit_cost')::numeric;
   if p_destination_type='inventory' then
     insert into public.adv_inventory_balances(item_id) values((v_line->>'item_id')::uuid) on conflict(item_id) do nothing;
     select * into v_balance from public.adv_inventory_balances where item_id=(v_line->>'item_id')::uuid for update;
     v_new_qty:=v_balance.quantity_on_hand+v_qty;
     v_new_avg:=case when v_new_qty=0 then 0 else round(((v_balance.quantity_on_hand*v_balance.average_cost)+(v_qty*v_cost))/v_new_qty,4) end;
     update public.adv_inventory_balances set quantity_on_hand=v_new_qty,average_cost=v_new_avg,last_transaction_at=now(),updated_at=now() where item_id=v_balance.item_id;
     insert into public.adv_inventory_transactions(transaction_number,transaction_date,transaction_type,item_id,quantity,quantity_effect,unit_cost,total_cost,balance_quantity_after,average_cost_after,reference_type,reference_id,notes,client_transaction_id)
     values(public.adv_inventory_next_number(),v_purchase.purchase_date,'positive_adjustment',v_balance.item_id,v_qty,v_qty,v_cost,round(v_qty*v_cost,4),v_new_qty,v_new_avg,'purchase',v_purchase.id,'شراء '||v_purchase.purchase_number,gen_random_uuid())
     returning * into v_inv;
     insert into public.adv_purchase_lines(purchase_id,line_no,item_id,quantity,unit_cost,inventory_transaction_id)
     values(v_purchase.id,v_no,v_balance.item_id,v_qty,v_cost,v_inv.id);
   else
     insert into public.adv_project_cost_entries(project_id,cost_date,cost_type,source_type,source_id,item_id,quantity,unit_cost,amount,description,client_transaction_id)
     values(v_purchase.project_id,v_purchase.purchase_date,'direct_purchase','purchase',v_purchase.id,(v_line->>'item_id')::uuid,v_qty,v_cost,round(v_qty*v_cost,4),'شراء مباشر '||v_purchase.purchase_number,gen_random_uuid())
     returning * into v_costrow;
     insert into public.adv_purchase_lines(purchase_id,line_no,item_id,quantity,unit_cost,project_cost_entry_id)
     values(v_purchase.id,v_no,(v_line->>'item_id')::uuid,v_qty,v_cost,v_costrow.id);
   end if;
 end loop;

 if p_payment_source='custody' then
   update public.adv_custody_accounts set current_balance=current_balance-v_total,last_transaction_at=now(),updated_at=now(),updated_by=auth.uid() where id=v_account.id
   returning * into v_account;
   insert into public.adv_custody_transactions(transaction_number,account_id,employee_id,transaction_date,transaction_type,amount,signed_amount,balance_after,project_id,description,reference_number,notes,client_transaction_id)
   values(public.adv_custody_next_number(),v_account.id,p_employee_id,v_purchase.purchase_date,'settlement_decrease',v_total,-v_total,v_account.current_balance,case when p_destination_type='project' then p_project_id else null end,'مشتريات '||v_purchase.purchase_number,v_purchase.purchase_number,p_notes,gen_random_uuid())
   returning * into v_custody;
 end if;
 return v_purchase;
end $$;

create or replace function public.adv_reverse_purchase(p_purchase_id uuid,p_reason text,p_client_transaction_id uuid default gen_random_uuid())
returns public.adv_purchases
language plpgsql security definer set search_path=public as $$
declare v_p public.adv_purchases; v_l public.adv_purchase_lines; v_inv public.adv_inventory_transactions; v_bal public.adv_inventory_balances; v_cost public.adv_project_cost_entries; v_acc public.adv_custody_accounts; v_ct public.adv_custody_transactions;
begin
 perform public.adv_custody_assert_permission('delete');
 if nullif(trim(p_reason),'') is null then raise exception 'سبب عكس المشتريات مطلوب.'; end if;
 select * into v_p from public.adv_purchases where id=p_purchase_id for update;
 if not found then raise exception 'مستند المشتريات غير موجود.'; end if;
 if v_p.status='reversed' then return v_p; end if;
 if v_p.destination_type='project' then perform public.adv_material_assert_project_open(v_p.project_id); end if;

 for v_l in select * from public.adv_purchase_lines where purchase_id=v_p.id order by line_no desc loop
   if v_l.inventory_transaction_id is not null then
     select * into v_inv from public.adv_inventory_transactions where id=v_l.inventory_transaction_id for update;
     select * into v_bal from public.adv_inventory_balances where item_id=v_l.item_id for update;
     if v_bal.quantity_on_hand<v_l.quantity then raise exception 'لا يمكن عكس الشراء لأن جزءًا من الكمية تم صرفه. عالج الحركات اللاحقة أولًا.'; end if;
     update public.adv_inventory_balances set quantity_on_hand=quantity_on_hand-v_l.quantity,average_cost=case when quantity_on_hand-v_l.quantity=0 then 0 else round(((quantity_on_hand*average_cost)-(v_l.quantity*v_l.unit_cost))/(quantity_on_hand-v_l.quantity),4) end,last_transaction_at=now(),updated_at=now() where item_id=v_l.item_id;
     update public.adv_inventory_transactions set is_reversed=true where id=v_inv.id;
   end if;
   if v_l.project_cost_entry_id is not null then
     select * into v_cost from public.adv_project_cost_entries where id=v_l.project_cost_entry_id for update;
     update public.adv_project_cost_entries set is_reversed=true where id=v_cost.id;
     insert into public.adv_project_cost_entries(project_id,cost_date,cost_type,source_type,source_id,item_id,quantity,unit_cost,amount,description,client_transaction_id,reversed_entry_id)
     values(v_p.project_id,(now() at time zone 'Asia/Riyadh')::date,'direct_purchase','purchase_reversal',v_p.id,v_l.item_id,v_l.quantity,v_l.unit_cost,-v_l.line_total,trim(p_reason),gen_random_uuid(),v_cost.id);
   end if;
 end loop;

 if v_p.payment_source='custody' then
   select * into v_ct from public.adv_custody_transactions where reference_number=v_p.purchase_number and transaction_type='settlement_decrease' and not is_reversed for update;
   if not found then raise exception 'حركة العهدة المرتبطة بالمشتريات غير موجودة.'; end if;
   select * into v_acc from public.adv_custody_accounts where id=v_ct.account_id for update;
   update public.adv_custody_accounts set current_balance=current_balance+v_p.total_amount,last_transaction_at=now(),updated_at=now(),updated_by=auth.uid() where id=v_acc.id returning * into v_acc;
   update public.adv_custody_transactions set is_reversed=true where id=v_ct.id;
   insert into public.adv_custody_transactions(transaction_number,account_id,employee_id,transaction_date,transaction_type,amount,signed_amount,balance_after,project_id,description,reference_number,notes,client_transaction_id,reversed_transaction_id)
   values(public.adv_custody_next_number(),v_acc.id,v_ct.employee_id,(now() at time zone 'Asia/Riyadh')::date,'reversal',v_p.total_amount,v_p.total_amount,v_acc.current_balance,v_ct.project_id,'عكس مشتريات '||v_p.purchase_number,v_p.purchase_number,trim(p_reason),gen_random_uuid(),v_ct.id);
 end if;

 update public.adv_purchases set status='reversed',reversed_at=now(),reversed_by=auth.uid(),reversal_reason=trim(p_reason) where id=v_p.id returning * into v_p;
 return v_p;
end $$;

alter table public.adv_purchases enable row level security;
alter table public.adv_purchase_lines enable row level security;
drop policy if exists adv_purchases_select on public.adv_purchases;
create policy adv_purchases_select on public.adv_purchases for select to authenticated using(public.has_screen_permission('advertisingCustodyPurchases','view'));
drop policy if exists adv_purchase_lines_select on public.adv_purchase_lines;
create policy adv_purchase_lines_select on public.adv_purchase_lines for select to authenticated using(public.has_screen_permission('advertisingCustodyPurchases','view'));
revoke insert,update,delete on public.adv_purchases,public.adv_purchase_lines from authenticated;
grant select on public.adv_purchases,public.adv_purchase_lines to authenticated;
grant execute on function public.adv_post_purchase(date,uuid,uuid,text,uuid,text,text,text,text,jsonb,uuid) to authenticated;
grant execute on function public.adv_reverse_purchase(uuid,text,uuid) to authenticated;
commit;
