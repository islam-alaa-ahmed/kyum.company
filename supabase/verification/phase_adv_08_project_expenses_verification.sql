-- Phase ADV-08 — Project Expenses Verification — READ ONLY

select table_name
from information_schema.tables
where table_schema='public' and table_name='adv_project_expenses';

select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='adv_project_expenses'
order by ordinal_position;

select p.proname,pg_get_function_identity_arguments(p.oid) arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('adv_post_project_expense','adv_reverse_project_expense','adv_reverse_custody_transaction')
order by p.proname;

select
  e.expense_number,e.expense_date,p.project_number,t.name expense_type,
  e.payment_source,em.name employee,e.amount,e.status,
  c.amount as project_cost_amount,ct.signed_amount as custody_effect
from public.adv_project_expenses e
join public.adv_projects p on p.id=e.project_id
join public.adv_expense_types t on t.id=e.expense_type_id
left join public.adv_employees em on em.id=e.employee_id
left join public.adv_project_cost_entries c on c.id=e.project_cost_entry_id
left join public.adv_custody_transactions ct on ct.id=e.custody_transaction_id
order by e.created_at desc
limit 100;
