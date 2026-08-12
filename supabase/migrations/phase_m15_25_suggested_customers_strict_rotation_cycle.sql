-- KYUM CRM Phase M15.25 — Suggested Customers Strict Rotation Cycle
-- Customer identity is customers.id only. Quotations, invoices, requests and followups
-- are attributes/history of that customer and MUST NOT create extra rotation identities.
-- A customer cannot advance to the next exposure cycle while another eligible customer
-- for the same representative/type is still on a lower exposure count.

begin;

create or replace function public.replenish_daily_customer_suggestions(
  p_user_id uuid,
  p_suggestion_date date default ((now() at time zone 'Asia/Riyadh')::date)
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_linked_representative_id uuid;
  v_type text;
  v_missing integer;
  v_next_sequence integer;
  v_inserted integer := 0;
  v_rows integer;
  v_cycle_floor bigint;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

  select up.representative_id
    into v_linked_representative_id
  from public.user_profiles up
  where up.id = p_user_id
    and coalesce(up.is_active, true) = true;

  if not found then
    raise exception 'Target user was not found or is inactive';
  end if;

  if v_actor_id is not null
     and v_actor_id is distinct from p_user_id
     and public.current_user_role() not in ('super_admin','sales_manager') then
    raise exception 'Not allowed to generate suggestions for this user';
  end if;

  if v_linked_representative_id is null then
    return 0;
  end if;

  foreach v_type in array array['شركة'::text, 'فردي'::text]
  loop
    select greatest(10 - count(*), 0)::integer
      into v_missing
    from public.daily_customer_suggestions s
    join public.customers current_customer on current_customer.id = s.customer_id
    where s.user_id = p_user_id
      and s.suggestion_date = p_suggestion_date
      and s.customer_type = v_type
      and s.status = 'active'
      and current_customer.representative_id = v_linked_representative_id;

    while v_missing > 0 loop
      select coalesce(max(s.sequence_no), 0) + 1
        into v_next_sequence
      from public.daily_customer_suggestions s
      where s.user_id = p_user_id
        and s.suggestion_date = p_suggestion_date
        and s.customer_type = v_type;

      -- Find the oldest unfinished exposure cycle among customers that are still
      -- eligible for this representative/type and have not already appeared today.
      -- IMPORTANT: no quotation/invoice/request table participates in identity.
      with candidate_exposure as (
        select
          c.id as customer_id,
          count(hist.id)::bigint as exposure_count
        from public.customers c
        left join public.daily_customer_suggestions hist
          on hist.user_id = p_user_id
         and hist.customer_id = c.id
        where c.customer_type = v_type
          and c.representative_id = v_linked_representative_id
          and not exists (
            select 1
            from public.daily_customer_suggestions today
            where today.user_id = p_user_id
              and today.suggestion_date = p_suggestion_date
              and today.customer_id = c.id
          )
          and not exists (
            select 1
            from public.customer_followups f
            where f.customer_id = c.id
              and f.contact_date = p_suggestion_date
          )
        group by c.id
      )
      select min(exposure_count)
        into v_cycle_floor
      from candidate_exposure;

      exit when v_cycle_floor is null;

      -- Select ONLY from the current cycle floor. This is the hard guard that
      -- prevents a previously shown customer from entering a newer cycle while
      -- any eligible customer remains in the older cycle.
      with exposure as (
        select
          c.id as customer_id,
          count(hist.id)::bigint as exposure_count,
          max(hist.suggestion_date) as last_suggestion_date
        from public.customers c
        left join public.daily_customer_suggestions hist
          on hist.user_id = p_user_id
         and hist.customer_id = c.id
        where c.customer_type = v_type
          and c.representative_id = v_linked_representative_id
        group by c.id
      ), eligible as (
        select
          c.id,
          row_number() over (
            order by
              e.last_suggestion_date asc nulls first,
              case when c.last_contact_date is null then 0 else 1 end,
              c.last_contact_date asc nulls first,
              c.created_at asc,
              c.customer_number asc,
              c.id asc
          ) as rn
        from public.customers c
        join exposure e on e.customer_id = c.id
        where c.customer_type = v_type
          and c.representative_id = v_linked_representative_id
          and e.exposure_count = v_cycle_floor
          and not exists (
            select 1
            from public.daily_customer_suggestions today
            where today.user_id = p_user_id
              and today.suggestion_date = p_suggestion_date
              and today.customer_id = c.id
          )
          and not exists (
            select 1
            from public.customer_followups f
            where f.customer_id = c.id
              and f.contact_date = p_suggestion_date
          )
        order by
          e.last_suggestion_date asc nulls first,
          case when c.last_contact_date is null then 0 else 1 end,
          c.last_contact_date asc nulls first,
          c.created_at asc,
          c.customer_number asc,
          c.id asc
        limit v_missing
      )
      insert into public.daily_customer_suggestions (
        suggestion_date, user_id, customer_id, customer_type, sequence_no, status
      )
      select
        p_suggestion_date,
        p_user_id,
        e.id,
        v_type,
        v_next_sequence + e.rn - 1,
        'active'
      from eligible e
      on conflict do nothing;

      get diagnostics v_rows = row_count;
      exit when v_rows = 0;

      v_inserted := v_inserted + v_rows;
      v_missing := v_missing - v_rows;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.replenish_daily_customer_suggestions(uuid,date) to authenticated;

commit;
