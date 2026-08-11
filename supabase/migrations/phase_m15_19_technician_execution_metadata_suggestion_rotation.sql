-- KYUM CRM Phase M15.19
-- 1) Execution technicians receive the representative/team labels for requests they are already allowed to execute.
-- 2) Daily suggested customers rotate fairly: a customer cannot repeat before lower-exposure customers for the same user/type catch up.

begin;

create or replace function public.get_installation_execution_reference_labels(
  p_request_ids uuid[]
)
returns table(
  request_id uuid,
  representative_name text,
  team_name text
)
language sql
stable
security definer
set search_path=public
as $$
  select
    r.id as request_id,
    sr.full_name as representative_name,
    it.name as team_name
  from public.installation_requests r
  left join public.sales_representatives sr on sr.id=r.representative_id
  left join public.installation_teams it on it.id=r.installation_team_id
  where auth.uid() is not null
    and public.has_screen_permission('installationExecution','view')
    and r.id = any(coalesce(p_request_ids, array[]::uuid[]))
    and public.can_access_installation_request_scope(r.representative_id,r.installation_team_id)
    and public.can_access_installation_assignment(r.installation_team_id,r.assigned_technician_name)
$$;

grant execute on function public.get_installation_execution_reference_labels(uuid[]) to authenticated;

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

    if v_missing = 0 then
      continue;
    end if;

    select coalesce(max(s.sequence_no), 0) + 1
      into v_next_sequence
    from public.daily_customer_suggestions s
    where s.user_id = p_user_id
      and s.suggestion_date = p_suggestion_date
      and s.customer_type = v_type;

    -- Round-robin exposure rule:
    -- customers with the fewest historical suggestions for this user are always selected first.
    -- Therefore a previously-contacted customer cannot be suggested again until every other
    -- eligible customer for the same representative/type has reached the same exposure count.
    with eligible as (
      select
        c.id,
        row_number() over (
          order by
            coalesce(hist.suggestion_count,0) asc,
            hist.last_suggestion_date asc nulls first,
            case when c.last_contact_date is null then 0 else 1 end,
            c.last_contact_date asc nulls first,
            c.created_at asc,
            c.customer_number asc,
            c.id asc
        ) as rn
      from public.customers c
      left join lateral (
        select
          count(*)::bigint as suggestion_count,
          max(s.suggestion_date) as last_suggestion_date
        from public.daily_customer_suggestions s
        where s.user_id = p_user_id
          and s.customer_id = c.id
      ) hist on true
      where c.customer_type = v_type
        and c.representative_id = v_linked_representative_id
        and not exists (
          select 1
          from public.daily_customer_suggestions existing
          where existing.user_id = p_user_id
            and existing.suggestion_date = p_suggestion_date
            and existing.customer_id = c.id
        )
        and not exists (
          select 1
          from public.customer_followups f
          where f.customer_id = c.id
            and f.contact_date = p_suggestion_date
        )
      order by
        coalesce(hist.suggestion_count,0) asc,
        hist.last_suggestion_date asc nulls first,
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
    v_inserted := v_inserted + v_rows;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.replenish_daily_customer_suggestions(uuid,date) to authenticated;

commit;
