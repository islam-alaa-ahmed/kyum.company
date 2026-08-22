-- Phase ADV-07 Purchases Verification — READ ONLY
select table_name from information_schema.tables where table_schema='public' and table_name in ('adv_purchases','adv_purchase_lines') order by table_name;
select p.proname,pg_get_function_identity_arguments(p.oid) arguments from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('adv_post_purchase','adv_reverse_purchase') order by p.proname;
select p.purchase_number,p.purchase_date,s.name supplier,e.name employee,p.destination_type,pr.project_number,p.payment_source,p.total_amount,p.status,count(l.id) lines
from public.adv_purchases p left join public.adv_suppliers s on s.id=p.supplier_id left join public.adv_employees e on e.id=p.employee_id left join public.adv_projects pr on pr.id=p.project_id left join public.adv_purchase_lines l on l.purchase_id=p.id group by p.id,s.name,e.name,pr.project_number order by p.created_at desc limit 100;
