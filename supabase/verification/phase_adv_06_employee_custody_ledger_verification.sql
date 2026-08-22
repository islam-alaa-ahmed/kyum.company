-- Phase ADV-06 — Employee Custody Ledger Verification — READ ONLY

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('adv_custody_accounts','adv_custody_transactions')
order by table_name;

select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='adv_custody_transactions'
order by ordinal_position;

select policyname,tablename,cmd
from pg_policies
where schemaname='public'
  and tablename in ('adv_custody_accounts','adv_custody_transactions','adv_employees','adv_items','adv_projects')
order by tablename,policyname;

select p.proname,pg_get_functiondef(p.oid) definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('adv_custody_post','adv_reverse_custody_transaction','adv_custody_get_or_create_account')
order by p.proname;

select
  e.employee_code,e.name,a.current_balance,a.is_active,a.last_transaction_at
from public.adv_custody_accounts a
join public.adv_employees e on e.id=a.employee_id
order by e.name;

select
  t.transaction_number,t.transaction_date,t.transaction_type,e.name as employee_name,
  t.amount,t.signed_amount,t.balance_after,p.project_number,i.name as item_name,t.is_reversed
from public.adv_custody_transactions t
join public.adv_employees e on e.id=t.employee_id
left join public.adv_projects p on p.id=t.project_id
left join public.adv_items i on i.id=t.item_id
order by t.created_at desc
limit 100;
