begin;

-- Phase M15.25.2
-- Align daily suggested customers with the exact same representative scope used
-- by the rest of the CRM: own / selected / all.
-- No suggestion rotation, completion-cycle, or contact-history rules are changed.

create or replace function public.can_user_access_representative(
  p_user_id uuid,
  p_representative_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with target_user as (
    select
      up.id,
      up.role::text as role_name,
      up.representative_id as own_representative_id,
      case
        when up.role::text = 'super_admin' then 'all'
        when dap.access_mode in ('own','selected','all') then dap.access_mode
        when up.representative_id is not null then 'own'
        else 'selected'
      end as access_mode
    from public.user_profiles up
    left join public.user_data_access_profiles dap
      on dap.user_id = up.id
    where up.id = p_user_id
      and coalesce(up.is_active,true)
  )
  select coalesce((
    select case
      when tu.role_name = 'super_admin' then true
      when tu.access_mode = 'all' then true
      when p_representative_id is null then false
      when p_representative_id = tu.own_representative_id then true
      when tu.access_mode = 'selected' then exists (
        select 1
        from public.user_data_access_representatives ar
        where ar.user_id = tu.id
          and ar.representative_id = p_representative_id
      )
      else false
    end
    from target_user tu
  ),false);
$$;

grant execute on function public.can_user_access_representative(uuid,uuid) to authenticated;

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

  if not exists (
    select 1
    from public.user_profiles up
    where up.id = p_user_id
      and coalesce(up.is_active,true)
  ) then
    raise exception 'Target user was not found or is inactive';
  end if;

  if v_actor_id is not null
     and v_actor_id is distinct from p_user_id
     and public.current_user_role() not in ('super_admin','sales_manager') then
    raise exception 'Not allowed to generate suggestions for this user';
  end if;

  foreach v_type in array array['شركة'::text,'فردي'::text]
  loop
    -- Count only active suggestions that still belong to the target user's
    -- current canonical representative scope.
    select greatest(10-count(*),0)::integer
      into v_missing
    from public.daily_customer_suggestions s
    join public.customers c on c.id=s.customer_id
    where s.user_id=p_user_id
      and s.suggestion_date=p_suggestion_date
      and s.customer_type=v_type
      and s.status='active'
      and public.can_user_access_representative(p_user_id,c.representative_id);

    while v_missing > 0 loop
      select coalesce(max(s.sequence_no),0)+1
        into v_next_sequence
      from public.daily_customer_suggestions s
      where s.user_id=p_user_id
        and s.suggestion_date=p_suggestion_date
        and s.customer_type=v_type;

      with completion_state as (
        select
          c.id as customer_id,
          count(hist.id) filter (where hist.status='completed')::bigint as completed_count
        from public.customers c
        left join public.daily_customer_suggestions hist
          on hist.user_id=p_user_id
         and hist.customer_id=c.id
        where c.customer_type=v_type
          and public.can_user_access_representative(p_user_id,c.representative_id)
          and c.phone is not null
          and btrim(c.phone)<>''
        group by c.id
      )
      select min(completed_count)
        into v_cycle_floor
      from completion_state;

      exit when v_cycle_floor is null;

      with completion_state as (
        select
          c.id as customer_id,
          count(hist.id) filter (where hist.status='completed')::bigint as completed_count,
          max(hist.completed_at) filter (where hist.status='completed') as last_completed_contact_at
        from public.customers c
        left join public.daily_customer_suggestions hist
          on hist.user_id=p_user_id
         and hist.customer_id=c.id
        where c.customer_type=v_type
          and public.can_user_access_representative(p_user_id,c.representative_id)
          and c.phone is not null
          and btrim(c.phone)<>''
        group by c.id
      ),
      eligible as (
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
        join completion_state cs on cs.customer_id=c.id
        where c.customer_type=v_type
          and public.can_user_access_representative(p_user_id,c.representative_id)
          and c.phone is not null
          and btrim(c.phone)<>''
          and cs.completed_count=v_cycle_floor
          and not exists (
            select 1
            from public.daily_customer_suggestions today
            where today.user_id=p_user_id
              and today.suggestion_date=p_suggestion_date
              and today.customer_id=c.id
          )
          and not exists (
            select 1
            from public.customer_followups f
            where f.customer_id=c.id
              and f.contact_date=p_suggestion_date
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
      insert into public.daily_customer_suggestions(
        suggestion_date,user_id,customer_id,customer_type,sequence_no,status
      )
      select
        p_suggestion_date,p_user_id,e.id,v_type,
        v_next_sequence+e.rn-1,'active'
      from eligible e
      on conflict do nothing;

      get diagnostics v_rows=row_count;
      exit when v_rows=0;

      v_inserted:=v_inserted+v_rows;
      v_missing:=v_missing-v_rows;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.replenish_daily_customer_suggestions(uuid,date) to authenticated;

commit;
