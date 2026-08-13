-- KYUM CRM Phase M15.25.1 verification — read only.

select
  to_regprocedure('public.replenish_daily_customer_suggestions(uuid,date)') is not null
    as replenish_rpc_exists,
  position('filter (where hist.status = ''completed'')' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) > 0
    as cycle_uses_completed_contacts_only,
  position('cs.completed_count = v_cycle_floor' in pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure)) > 0
    as blocks_completed_customer_until_floor_advances,
  position('including customers already active today' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) > 0
    as floor_includes_active_today_guard,
  position('quotation' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) = 0
    as quotation_not_rotation_identity,
  position('invoice' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) = 0
    as invoice_not_rotation_identity,
  position('customer_requests' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) = 0
    as request_not_rotation_identity,
  position('c.phone is not null' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) > 0
    as no_phone_customers_excluded;

-- Audit: any customer that has reached a higher completed-contact count than the
-- minimum for their user's current representative/type. This is historical data
-- only; after this migration such a customer is blocked from new suggestions until
-- the lower-count customers catch up.
with linked as (
  select up.id as user_id, up.representative_id
  from public.user_profiles up
  where coalesce(up.is_active, true) = true
    and up.representative_id is not null
), completion_counts as (
  select
    l.user_id,
    c.customer_type,
    c.id as customer_id,
    count(s.id) filter (where s.status = 'completed')::bigint as completed_count
  from linked l
  join public.customers c
    on c.representative_id = l.representative_id
  left join public.daily_customer_suggestions s
    on s.user_id = l.user_id
   and s.customer_id = c.id
  where c.phone is not null
    and btrim(c.phone) <> ''
  group by l.user_id, c.customer_type, c.id
), floors as (
  select user_id, customer_type, min(completed_count) as cycle_floor
  from completion_counts
  group by user_id, customer_type
)
select
  cc.user_id,
  cc.customer_type,
  f.cycle_floor,
  count(*) filter (where cc.completed_count = f.cycle_floor) as customers_on_current_cycle,
  count(*) filter (where cc.completed_count > f.cycle_floor) as customers_already_ahead
from completion_counts cc
join floors f using (user_id, customer_type)
group by cc.user_id, cc.customer_type, f.cycle_floor
order by cc.user_id, cc.customer_type;
