begin;

-- Phase D1.10.2 — Friday is a default locked scheduling day.
-- An explicit row in installation_schedule_day_locks always wins, so an authorized user
-- can open a specific Friday by saving is_locked = false.
create or replace function public.is_installation_schedule_day_locked(p_schedule_date date)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (select is_locked
       from public.installation_schedule_day_locks
      where schedule_date=p_schedule_date),
    extract(isodow from p_schedule_date)=5
  )
$$;

grant execute on function public.is_installation_schedule_day_locked(date) to authenticated;

commit;
