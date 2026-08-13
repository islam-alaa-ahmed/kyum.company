-- KYUM CRM Phase M15.25.1 — Strict Completed Contact Rotation Fix
--
-- Root cause fixed:
-- Phase M15.25 advanced the rotation by counting every suggestion exposure, including
-- rows that were merely shown. The business rule is stricter: a customer advances
-- only after the representative actually completes contact (status = 'completed').
--
-- Canonical rotation identity remains customers.id only. Quotations, invoices,
-- customer requests, follow-ups and other transaction rows MUST NOT create extra
-- rotation identities.
--
-- Rotation rule per user / linked representative / customer type:
--   1) completed_count = number of completed suggestion rows for that customer.
--   2) cycle_floor = minimum completed_count across ALL currently eligible customers.
--   3) only customers whose completed_count = cycle_floor may be suggested.
--   4) customers already shown today are not duplicated today.
--   5) the next cycle cannot start while ANY eligible customer remains on a lower
--      completed_count, even if that customer is already active in today's list.
--
-- This is intentionally a cumulative migration. Do not edit M15.25 in place.

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

      -- IMPORTANT: calculate the cycle floor across ALL eligible customers,
      -- including customers already active today. Otherwise an active-but-not-yet-
      -- completed customer could be skipped and a previous customer could advance
      -- to the next cycle early.
      with completion_state as (
        select
          c.id as customer_id,
          count(hist.id) filter (where hist.status = 'completed')::bigint as completed_count
        from public.customers c
        left join public.daily_customer_suggestions hist
          on hist.user_id = p_user_id
         and hist.customer_id = c.id
        where c.customer_type = v_type
          and c.representative_id = v_linked_representative_id
          -- A suggested-contact customer must have an actual mobile number.
          and c.phone is not null
          and btrim(c.phone) <> ''
        group by c.id
      )
      select min(completed_count)
        into v_cycle_floor
      from completion_state;

      exit when v_cycle_floor is null;

      -- Pick only from the current completed-contact cycle. Transaction/history
      -- tables do not participate in customer identity or cycle advancement.
      with completion_state as (
        select
          c.id as customer_id,
          count(hist.id) filter (where hist.status = 'completed')::bigint as completed_count,
          max(hist.completed_at) filter (where hist.status = 'completed') as last_completed_contact_at
        from public.customers c
        left join public.daily_customer_suggestions hist
          on hist.user_id = p_user_id
         and hist.customer_id = c.id
        where c.customer_type = v_type
          and c.representative_id = v_linked_representative_id
          and c.phone is not null
          and btrim(c.phone) <> ''
        group by c.id
      ), eligible as (
        select
          c.id,
          row_number() over (
            order by
              cs.last_completed_contact_at asc nulls first,
              case when c.last_contact_date is null then 0 else 1 end,
              c.last_contact_date asc nulls first,
              c.created_at asc,
              c.customer_number asc,
              c.id asc
          ) as rn
        from public.customers c
        join completion_state cs on cs.customer_id = c.id
        where c.customer_type = v_type
          and c.representative_id = v_linked_representative_id
          and c.phone is not null
          and btrim(c.phone) <> ''
          and cs.completed_count = v_cycle_floor
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
          cs.last_completed_contact_at asc nulls first,
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

      -- If the current cycle floor has no additional customer available today,
      -- STOP. Never advance to a higher completed_count merely to fill 10 rows.
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
