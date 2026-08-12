-- Phase M15.25 verification
select
  position('v_cycle_floor' in pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure)) > 0 as strict_cycle_floor_enabled,
  position('e.exposure_count = v_cycle_floor' in pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure)) > 0 as blocks_next_cycle_early,
  position('quotation' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) = 0 as quotation_not_customer_identity,
  position('invoice' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) = 0 as invoice_not_customer_identity,
  position('customer_requests' in lower(pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure))) = 0 as request_not_customer_identity;

-- Data audit: these rows, if any, are separate customer master records with the same
-- normalized non-empty phone and should be impossible because of the unique index.
select normalized_phone, count(*) as customer_master_rows, array_agg(customer_number order by customer_number) as customer_numbers
from public.customers
where nullif(btrim(normalized_phone),'') is not null
group by normalized_phone
having count(*) > 1;

-- Review no-phone same-name records separately; they are NOT auto-merged because two
-- real customers may legitimately share a name and no safe unique identity exists.
select lower(btrim(customer_name)) as normalized_name, representative_id, count(*) as rows_count,
       array_agg(customer_number order by customer_number) as customer_numbers
from public.customers
where nullif(btrim(normalized_phone),'') is null
group by lower(btrim(customer_name)), representative_id
having count(*) > 1
order by rows_count desc, normalized_name;
