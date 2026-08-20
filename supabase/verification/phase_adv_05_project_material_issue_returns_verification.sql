-- Phase ADV-05 — Project Material Issue & Returns Verification — READ ONLY

select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='adv_inventory_transactions'
  and column_name in ('project_id','transaction_type')
order by column_name;

select table_name
from information_schema.tables
where table_schema='public' and table_name='adv_project_cost_entries';

select policyname,tablename,cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'adv_projects','adv_items','adv_units','adv_item_categories',
    'adv_inventory_balances','adv_inventory_transactions','adv_project_cost_entries'
  )
order by tablename,policyname;

select p.proname,pg_get_functiondef(p.oid) definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'adv_post_project_material_issue',
    'adv_post_project_material_return',
    'adv_reverse_project_material_transaction',
    'adv_inventory_reverse'
  )
order by p.proname;

-- Operational integrity after test postings:
select
  p.project_number,
  p.project_name,
  sum(e.amount) as material_actual_cost
from public.adv_project_cost_entries e
join public.adv_projects p on p.id=e.project_id
where e.cost_type='material'
group by p.id,p.project_number,p.project_name
order by p.project_number;

select
  t.transaction_number,t.transaction_type,t.project_id,t.quantity,t.unit_cost,t.total_cost,
  t.is_reversed,t.reference_type,t.reference_id,
  e.amount as project_cost_amount
from public.adv_inventory_transactions t
left join public.adv_project_cost_entries e on e.inventory_transaction_id=t.id
where t.project_id is not null
order by t.created_at desc
limit 100;
