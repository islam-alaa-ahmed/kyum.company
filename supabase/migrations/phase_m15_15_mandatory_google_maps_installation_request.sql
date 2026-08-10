begin;

-- Phase M15.15 — Mandatory Google Maps location for new installation requests.
-- Existing rows are intentionally not changed and customer_map_url stays nullable
-- at table level to preserve historical/legacy records.

create or replace function public.create_installation_request_with_services(
  p_customer_id uuid,
  p_quotation_id uuid,
  p_representative_id uuid,
  p_neighborhood_id uuid,
  p_priority text,
  p_installation_address text,
  p_customer_order_number text,
  p_customer_map_url text,
  p_notes text,
  p_services jsonb
)
returns table(id uuid, request_number text)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_request_id uuid;
  v_request_number text;
  v_representative_id uuid;
  v_map_url text := nullif(btrim(coalesce(p_customer_map_url, '')), '');
  v_customer_order_number text := nullif(btrim(coalesce(p_customer_order_number, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.has_screen_permission('installationRequestNew', 'add') then
    raise exception 'You do not have permission to create installation requests'
      using errcode = '42501';
  end if;

  v_representative_id := public.resolve_installation_request_representative(
    p_customer_id,
    p_representative_id
  );

  if p_neighborhood_id is null
     or not exists (
       select 1
       from public.installation_neighborhoods n
       where n.id = p_neighborhood_id
         and coalesce(n.is_active, true) = true
     ) then
    raise exception 'Select an active installation neighborhood'
      using errcode = '23514';
  end if;

  if p_quotation_id is not null and not exists (
    select 1
    from public.quotations q
    where q.id = p_quotation_id
      and q.customer_id = p_customer_id
  ) then
    raise exception 'Quotation does not belong to the selected customer'
      using errcode = '23514';
  end if;

  if v_customer_order_number is not null
     and char_length(v_customer_order_number) > 120 then
    raise exception 'Customer order number is too long' using errcode = '23514';
  end if;

  if v_map_url is null then
    raise exception 'Google Maps location is required for installation requests'
      using errcode = '23514';
  end if;

  if v_map_url !~* '^https://(maps\.app\.goo\.gl/|maps\.google\.com/|((www\.)?google\.com)/maps/|goo\.gl/maps/)' then
    raise exception 'Invalid Google Maps URL' using errcode = '23514';
  end if;

  if p_services is null
     or jsonb_typeof(p_services) <> 'array'
     or jsonb_array_length(p_services) = 0 then
    raise exception 'At least one service is required' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_services)
      as x(service_type_id uuid, quantity integer, unit_price numeric)
    where x.service_type_id is null
       or x.quantity is null
       or x.quantity < 1
       or x.unit_price is null
       or x.unit_price < 0
       or not exists (
         select 1
         from public.installation_service_types st
         where st.id = x.service_type_id
           and coalesce(st.is_active, true) = true
       )
  ) then
    raise exception 'One or more installation service rows are invalid'
      using errcode = '23514';
  end if;

  insert into public.installation_requests (
    customer_id,
    quotation_id,
    representative_id,
    neighborhood_id,
    status,
    priority,
    installation_address,
    customer_order_number,
    customer_map_url,
    notes,
    scheduled_date,
    time_slot,
    installation_team_id,
    created_by
  ) values (
    p_customer_id,
    p_quotation_id,
    v_representative_id,
    p_neighborhood_id,
    'بانتظار المراجعة',
    coalesce(nullif(btrim(coalesce(p_priority, '')), ''), 'عادية'),
    nullif(btrim(coalesce(p_installation_address, '')), ''),
    v_customer_order_number,
    v_map_url,
    nullif(btrim(coalesce(p_notes, '')), ''),
    null,
    null,
    null,
    auth.uid()
  )
  returning installation_requests.id, installation_requests.request_number
    into v_request_id, v_request_number;

  insert into public.installation_request_services (
    installation_request_id,
    service_type_id,
    quantity,
    unit_price
  )
  select
    v_request_id,
    x.service_type_id,
    x.quantity,
    x.unit_price
  from jsonb_to_recordset(p_services)
    as x(service_type_id uuid, quantity integer, unit_price numeric);

  perform public.refresh_installation_request_totals(v_request_id);

  return query select v_request_id, v_request_number;
end;
$$;

revoke all on function public.create_installation_request_with_services(
  uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) from public;

grant execute on function public.create_installation_request_with_services(
  uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) to authenticated;


commit;
