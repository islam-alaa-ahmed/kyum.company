-- Phase M15.16 verification (read-only)
select
  p.proname,
  pg_get_functiondef(p.oid) ilike '%p_quotation_id is null%' as rejects_missing_quotation,
  pg_get_functiondef(p.oid) ilike '%v_quotation.status <> ''مقبول''%' as enforces_accepted,
  pg_get_functiondef(p.oid) ilike '%installation_request_id = v_request_id%' as links_quotation
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_installation_request_with_services';

select
  tgname,
  not tgisinternal as enabled
from pg_trigger
where tgrelid = 'public.installation_requests'::regclass
  and tgname = 'trg_require_accepted_quotation_for_new_installation_request';

select count(*) as duplicate_linked_quotations
from (
  select quotation_id
  from public.installation_requests
  where quotation_id is not null
  group by quotation_id
  having count(*) > 1
) d;
