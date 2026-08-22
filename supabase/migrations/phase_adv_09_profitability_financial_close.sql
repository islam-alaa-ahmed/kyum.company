-- Phase ADV-09 — Profitability & Financial Close
begin;

alter table public.adv_projects
  add column if not exists financial_closed_revenue numeric(18,4),
  add column if not exists financial_closed_cost numeric(18,4),
  add column if not exists financial_closed_profit numeric(18,4),
  add column if not exists financial_closed_margin_pct numeric(12,4);

create table if not exists public.adv_project_financial_close_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.adv_projects(id) on delete restrict,
  action text not null check(action in ('close','reopen')),
  revenue numeric(18,4) not null,
  actual_cost numeric(18,4) not null,
  profit numeric(18,4) not null,
  margin_pct numeric(12,4),
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists adv_project_financial_close_history_project_idx
  on public.adv_project_financial_close_history(project_id,created_at desc);

create or replace view public.adv_project_profitability as
with costs as (
  select
    project_id,
    coalesce(sum(amount) filter (where not is_reversed),0)::numeric(18,4) as actual_cost,
    coalesce(sum(amount) filter (where not is_reversed and cost_type='material'),0)::numeric(18,4) as material_cost,
    coalesce(sum(amount) filter (where not is_reversed and cost_type='direct_purchase'),0)::numeric(18,4) as direct_purchase_cost,
    coalesce(sum(amount) filter (where not is_reversed and cost_type='expense'),0)::numeric(18,4) as expense_cost
  from public.adv_project_cost_entries
  group by project_id
)
select
  p.id as project_id,p.project_number,p.project_name,p.customer_name,p.status,
  p.project_type_id,p.responsible_employee_id,p.start_date,p.actual_delivery_date,
  p.selling_value::numeric(18,4) as revenue,
  p.estimated_cost::numeric(18,4) as estimated_cost,
  coalesce(c.material_cost,0)::numeric(18,4) as material_cost,
  coalesce(c.direct_purchase_cost,0)::numeric(18,4) as direct_purchase_cost,
  coalesce(c.expense_cost,0)::numeric(18,4) as expense_cost,
  coalesce(c.actual_cost,0)::numeric(18,4) as actual_cost,
  (p.selling_value-coalesce(c.actual_cost,0))::numeric(18,4) as profit,
  case when p.selling_value=0 then null
       else round(((p.selling_value-coalesce(c.actual_cost,0))/p.selling_value)*100,4)
  end::numeric(12,4) as margin_pct,
  (coalesce(c.actual_cost,0)-p.estimated_cost)::numeric(18,4) as cost_variance,
  p.financial_closed_at,p.financial_closed_by,
  p.financial_closed_revenue,p.financial_closed_cost,p.financial_closed_profit,p.financial_closed_margin_pct
from public.adv_projects p
left join costs c on c.project_id=p.id;

create or replace function public.adv_project_financial_assert_permission(p_action text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_screen_permission('advertisingProjectCosts',p_action) then
    raise exception 'لا توجد صلاحية % على تكلفة وربحية المشاريع.',p_action using errcode='42501';
  end if;
end $$;

create or replace function public.adv_close_project_financially(
  p_project_id uuid,
  p_reason text default null
) returns public.adv_projects
language plpgsql security definer set search_path=public as $$
declare
  v_project public.adv_projects;
  v_profit public.adv_project_profitability;
begin
  perform public.adv_project_financial_assert_permission('edit');

  select * into v_project from public.adv_projects where id=p_project_id for update;
  if not found then raise exception 'المشروع غير موجود.'; end if;
  if v_project.financial_closed_at is not null or v_project.status='مغلق ماليًا' then return v_project; end if;
  if v_project.status<>'مكتمل' then
    raise exception 'لا يمكن الإغلاق المالي إلا بعد وصول المشروع إلى حالة مكتمل.';
  end if;

  select * into v_profit from public.adv_project_profitability where project_id=p_project_id;

  update public.adv_projects
  set status='مغلق ماليًا',
      financial_closed_at=now(),
      financial_closed_by=auth.uid(),
      financial_closed_revenue=v_profit.revenue,
      financial_closed_cost=v_profit.actual_cost,
      financial_closed_profit=v_profit.profit,
      financial_closed_margin_pct=v_profit.margin_pct,
      updated_at=now(),updated_by=auth.uid()
  where id=p_project_id
  returning * into v_project;

  insert into public.adv_project_financial_close_history(
    project_id,action,revenue,actual_cost,profit,margin_pct,reason
  ) values(
    p_project_id,'close',v_profit.revenue,v_profit.actual_cost,v_profit.profit,v_profit.margin_pct,
    nullif(trim(p_reason),'')
  );

  return v_project;
end $$;

create or replace function public.adv_reopen_project_financially(
  p_project_id uuid,
  p_reason text
) returns public.adv_projects
language plpgsql security definer set search_path=public as $$
declare
  v_project public.adv_projects;
begin
  perform public.adv_project_financial_assert_permission('edit');
  if nullif(trim(p_reason),'') is null then raise exception 'سبب إعادة فتح المشروع ماليًا مطلوب.'; end if;

  select * into v_project from public.adv_projects where id=p_project_id for update;
  if not found then raise exception 'المشروع غير موجود.'; end if;
  if v_project.financial_closed_at is null or v_project.status<>'مغلق ماليًا' then
    raise exception 'المشروع غير مغلق ماليًا.';
  end if;

  insert into public.adv_project_financial_close_history(
    project_id,action,revenue,actual_cost,profit,margin_pct,reason
  ) values(
    p_project_id,'reopen',
    coalesce(v_project.financial_closed_revenue,v_project.selling_value),
    coalesce(v_project.financial_closed_cost,0),
    coalesce(v_project.financial_closed_profit,v_project.selling_value),
    v_project.financial_closed_margin_pct,trim(p_reason)
  );

  update public.adv_projects
  set status='مكتمل',
      financial_closed_at=null,financial_closed_by=null,
      financial_closed_revenue=null,financial_closed_cost=null,
      financial_closed_profit=null,financial_closed_margin_pct=null,
      updated_at=now(),updated_by=auth.uid()
  where id=p_project_id
  returning * into v_project;

  return v_project;
end $$;

alter table public.adv_project_financial_close_history enable row level security;
drop policy if exists adv_project_financial_close_history_select on public.adv_project_financial_close_history;
create policy adv_project_financial_close_history_select
on public.adv_project_financial_close_history for select to authenticated
using(public.has_screen_permission('advertisingProjectCosts','view'));

grant select on public.adv_project_profitability to authenticated;
grant select on public.adv_project_financial_close_history to authenticated;
revoke insert,update,delete on public.adv_project_financial_close_history from authenticated;
grant execute on function public.adv_close_project_financially(uuid,text) to authenticated;
grant execute on function public.adv_reopen_project_financially(uuid,text) to authenticated;

commit;
