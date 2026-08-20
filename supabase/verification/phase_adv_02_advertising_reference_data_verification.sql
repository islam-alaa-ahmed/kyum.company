-- Phase ADV-02 verification — READ ONLY
select table_name
from information_schema.tables
where table_schema='public' and table_name in ('adv_items','adv_item_categories','adv_units','adv_employees','adv_suppliers','adv_project_types','adv_expense_types','adv_payment_methods')
order by table_name;

select tablename,policyname,cmd
from pg_policies
where schemaname='public' and tablename like 'adv_%'
  and tablename in ('adv_items','adv_item_categories','adv_units','adv_employees','adv_suppliers','adv_project_types','adv_expense_types','adv_payment_methods')
order by tablename,cmd;

select
  (select count(*) from public.adv_items) as items,
  (select count(*) from public.adv_item_categories) as item_categories,
  (select count(*) from public.adv_units) as units,
  (select count(*) from public.adv_employees) as employees,
  (select count(*) from public.adv_suppliers) as suppliers,
  (select count(*) from public.adv_project_types) as project_types,
  (select count(*) from public.adv_expense_types) as expense_types,
  (select count(*) from public.adv_payment_methods) as payment_methods;
