-- Phase M15.15 verification (read-only)
select
  position('Google Maps location is required for installation requests' in pg_get_functiondef(
    'public.create_installation_request_with_services(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb)'::regprocedure
  )) > 0 as create_rpc_requires_map,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='installation_requests' and column_name='customer_map_url'
  ) as map_column_exists;

-- Historical rows are allowed to remain without a map URL by design.
select count(*) as historical_requests_without_map
from public.installation_requests
where nullif(btrim(coalesce(customer_map_url,'')),'') is null;
