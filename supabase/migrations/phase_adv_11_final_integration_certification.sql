-- Phase ADV-11 — Final Integration & Certification
-- Repairs cross-phase canonical integration gaps without changing the approved business model.
begin;

-- 1) Project Cost Ledger is an immutable delta ledger:
--    original entries remain for audit, reversal entries negate them.
--    Profitability must therefore SUM ALL DELTAS, not only rows where is_reversed=false.
create or replace view public.adv_project_profitability as
with costs as (
  select
    project_id,
    coalesce(sum(amount),0)::numeric(18,4) as actual_cost,
    coalesce(sum(amount) filter (where cost_type='material'),0)::numeric(18,4) as material_cost,
    coalesce(sum(amount) filter (where cost_type='direct_purchase'),0)::numeric(18,4) as direct_purchase_cost,
    coalesce(sum(amount) filter (where cost_type='expense'),0)::numeric(18,4) as expense_cost
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

-- 2) A direct-project purchase legitimately creates one cost entry PER purchase line.
--    Keep source uniqueness for one-to-one owners, but exclude multi-line purchase source.
drop index if exists public.adv_project_cost_source_uq;
create unique index adv_project_cost_source_uq
  on public.adv_project_cost_entries(source_type,source_id)
  where reversed_entry_id is null
    and source_type <> 'purchase';

-- 3) Make financial close/reopen possible ONLY through their canonical RPCs.
--    Direct project writes cannot forge or clear financial-close state.
create or replace function public.adv_projects_before_write()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_close_rpc boolean := coalesce(current_setting('app.adv_financial_close_rpc',true),'')='on';
  v_reopen_rpc boolean := coalesce(current_setting('app.adv_financial_reopen_rpc',true),'')='on';
begin
  if tg_op='INSERT' and nullif(trim(new.project_number),'') is null then
    new.project_number := public.adv_generate_project_number();
  end if;

  if tg_op='INSERT' then
    if new.status='مغلق ماليًا'
       or new.financial_closed_at is not null
       or new.financial_closed_by is not null
       or new.financial_closed_revenue is not null
       or new.financial_closed_cost is not null
       or new.financial_closed_profit is not null
       or new.financial_closed_margin_pct is not null then
      raise exception 'لا يمكن إنشاء مشروع في حالة إغلاق مالي أو تعبئة حقول الإغلاق يدويًا.';
    end if;
  else
    -- Closed projects are immutable operationally.
    if old.financial_closed_at is not null then
      if new.project_name is distinct from old.project_name
         or new.project_type_id is distinct from old.project_type_id
         or new.customer_name is distinct from old.customer_name
         or new.customer_phone is distinct from old.customer_phone
         or new.location_name is distinct from old.location_name
         or new.mall_name is distinct from old.mall_name
         or new.selling_value is distinct from old.selling_value
         or new.estimated_cost is distinct from old.estimated_cost
         or new.start_date is distinct from old.start_date
         or new.expected_delivery_date is distinct from old.expected_delivery_date
         or new.actual_delivery_date is distinct from old.actual_delivery_date
         or new.responsible_employee_id is distinct from old.responsible_employee_id
         or new.notes is distinct from old.notes then
        raise exception 'المشروع مغلق ماليًا ولا يمكن تعديل بياناته التشغيلية.';
      end if;

      if (
          new.status is distinct from old.status
          or new.financial_closed_at is distinct from old.financial_closed_at
          or new.financial_closed_by is distinct from old.financial_closed_by
          or new.financial_closed_revenue is distinct from old.financial_closed_revenue
          or new.financial_closed_cost is distinct from old.financial_closed_cost
          or new.financial_closed_profit is distinct from old.financial_closed_profit
          or new.financial_closed_margin_pct is distinct from old.financial_closed_margin_pct
         ) and not v_reopen_rpc then
        raise exception 'إعادة فتح المشروع ماليًا تتم فقط من الإجراء المالي المعتمد.';
      end if;
    else
      if new.status='مغلق ماليًا' and old.status is distinct from 'مغلق ماليًا' then
        if not v_close_rpc then
          raise exception 'الإغلاق المالي يتم فقط من الإجراء المالي المعتمد.';
        end if;
        if new.financial_closed_at is null
           or new.financial_closed_by is null
           or new.financial_closed_revenue is null
           or new.financial_closed_cost is null
           or new.financial_closed_profit is null then
          raise exception 'بيانات لقطة الإغلاق المالي غير مكتملة.';
        end if;
      elsif (
          new.financial_closed_at is distinct from old.financial_closed_at
          or new.financial_closed_by is distinct from old.financial_closed_by
          or new.financial_closed_revenue is distinct from old.financial_closed_revenue
          or new.financial_closed_cost is distinct from old.financial_closed_cost
          or new.financial_closed_profit is distinct from old.financial_closed_profit
          or new.financial_closed_margin_pct is distinct from old.financial_closed_margin_pct
        ) and not v_close_rpc then
        raise exception 'حقول الإغلاق المالي تُدار تلقائيًا ولا يمكن تعديلها يدويًا.';
      end if;
    end if;
  end if;

  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

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

  perform set_config('app.adv_financial_close_rpc','on',true);

  update public.adv_projects
  set status='مغلق ماليًا',
      financial_closed_at=now(),
      financial_closed_by=auth.uid(),
      financial_closed_revenue=v_profit.revenue,
      financial_closed_cost=v_profit.actual_cost,
      financial_closed_profit=v_profit.profit,
      financial_closed_margin_pct=v_profit.margin_pct
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
  if nullif(trim(p_reason),'') is null then
    raise exception 'سبب إعادة فتح المشروع ماليًا مطلوب.';
  end if;

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

  perform set_config('app.adv_financial_reopen_rpc','on',true);

  update public.adv_projects
  set status='مكتمل',
      financial_closed_at=null,
      financial_closed_by=null,
      financial_closed_revenue=null,
      financial_closed_cost=null,
      financial_closed_profit=null,
      financial_closed_margin_pct=null
  where id=p_project_id
  returning * into v_project;

  return v_project;
end $$;

grant select on public.adv_project_profitability to authenticated;
grant execute on function public.adv_close_project_financially(uuid,text) to authenticated;
grant execute on function public.adv_reopen_project_financially(uuid,text) to authenticated;

commit;
