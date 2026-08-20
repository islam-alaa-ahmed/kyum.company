-- Phase ADV-04 — Inventory Foundation Verification — READ ONLY
select table_name from information_schema.tables where table_schema='public' and table_name in ('adv_inventory_balances','adv_inventory_transactions') order by table_name;
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='adv_inventory_transactions' order by ordinal_position;
select policyname,cmd from pg_policies where schemaname='public' and tablename in ('adv_inventory_balances','adv_inventory_transactions') order by tablename,policyname;
select p.proname,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('adv_inventory_post','adv_inventory_reverse','adv_inventory_next_number','adv_inventory_assert_permission') order by p.proname;
