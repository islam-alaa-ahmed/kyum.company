-- Phase M15.25.2 verification — READ ONLY

-- 1) The target-user helper must exist.
select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'can_user_access_representative',
    'replenish_daily_customer_suggestions'
  )
order by p.proname;

-- 2) Verify selected scope: own representative + explicitly selected representatives.
-- Replace USER_ID below with the user you want to test.
-- select
--   up.id as user_id,
--   up.representative_id as own_representative_id,
--   dap.access_mode,
--   ar.representative_id as selected_representative_id
-- from public.user_profiles up
-- left join public.user_data_access_profiles dap on dap.user_id=up.id
-- left join public.user_data_access_representatives ar on ar.user_id=up.id
-- where up.id='USER_ID'::uuid;

-- 3) Verify every active suggestion is inside the target user's canonical scope.
-- Replace USER_ID below.
-- select
--   s.id as suggestion_id,
--   c.customer_number,
--   c.customer_name,
--   c.representative_id,
--   public.can_user_access_representative(s.user_id,c.representative_id) as allowed
-- from public.daily_customer_suggestions s
-- join public.customers c on c.id=s.customer_id
-- where s.user_id='USER_ID'::uuid
--   and s.suggestion_date=(now() at time zone 'Asia/Riyadh')::date
--   and s.status='active'
-- order by s.customer_type,s.sequence_no;

-- 4) Compare eligible customers by representative for the target user.
-- Replace USER_ID below.
-- select
--   r.full_name as representative_name,
--   c.customer_type,
--   count(*) as eligible_customer_count
-- from public.customers c
-- left join public.sales_representatives r on r.id=c.representative_id
-- where public.can_user_access_representative('USER_ID'::uuid,c.representative_id)
--   and c.phone is not null
--   and btrim(c.phone)<>''
-- group by r.full_name,c.customer_type
-- order by r.full_name,c.customer_type;
