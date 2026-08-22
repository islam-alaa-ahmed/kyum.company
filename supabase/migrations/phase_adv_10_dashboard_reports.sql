-- Phase ADV-10 — Advertising Dashboard & Reports
begin;

create or replace function public.adv_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_result jsonb;
begin
  if not public.has_screen_permission('advertisingDashboard','view') then
    raise exception 'لا توجد صلاحية عرض لوحة متابعة قسم الدعاية والإعلان.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at',now(),
    'kpis',jsonb_build_object(
      'projects_total',(select count(*) from public.adv_projects),
      'projects_open',(select count(*) from public.adv_projects where financial_closed_at is null),
      'projects_closed',(select count(*) from public.adv_projects where financial_closed_at is not null),
      'projects_completed',(select count(*) from public.adv_projects where status in ('مكتمل','مغلق ماليًا')),
      'revenue_total',(select coalesce(sum(revenue),0) from public.adv_project_profitability),
      'actual_cost_total',(select coalesce(sum(actual_cost),0) from public.adv_project_profitability),
      'profit_total',(select coalesce(sum(profit),0) from public.adv_project_profitability),
      'profit_projects',(select count(*) from public.adv_project_profitability where profit>0),
      'loss_projects',(select count(*) from public.adv_project_profitability where profit<0),
      'inventory_value',(select coalesce(sum(inventory_value),0) from public.adv_inventory_balances),
      'custody_balance',(select coalesce(sum(current_balance),0) from public.adv_custody_accounts where is_active),
      'purchase_total',(select coalesce(sum(total_amount),0) from public.adv_purchases where status='posted'),
      'expense_total',(select coalesce(sum(amount),0) from public.adv_project_expenses where status='posted')
    ),
    'status_counts',coalesce((
      select jsonb_agg(jsonb_build_object('status',x.status,'count',x.cnt) order by x.status)
      from (select status,count(*) cnt from public.adv_projects group by status) x
    ),'[]'::jsonb),
    'top_profit',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select project_id,project_number,project_name,revenue,actual_cost,profit,margin_pct
        from public.adv_project_profitability
        order by profit desc,project_number
        limit 5
      ) x
    ),'[]'::jsonb),
    'top_loss',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select project_id,project_number,project_name,revenue,actual_cost,profit,margin_pct
        from public.adv_project_profitability
        where profit<0
        order by profit asc,project_number
        limit 5
      ) x
    ),'[]'::jsonb),
    'low_stock',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select i.id item_id,i.item_code,i.name,b.quantity_on_hand,b.average_cost,b.inventory_value,i.reorder_level
        from public.adv_inventory_balances b
        join public.adv_items i on i.id=b.item_id
        where b.quantity_on_hand<=i.reorder_level
        order by b.quantity_on_hand asc,i.name
        limit 10
      ) x
    ),'[]'::jsonb),
    'custody_top',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select a.employee_id,e.employee_code,e.name,a.current_balance,a.last_transaction_at
        from public.adv_custody_accounts a
        join public.adv_employees e on e.id=a.employee_id
        where a.is_active and a.current_balance>0
        order by a.current_balance desc
        limit 10
      ) x
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

create or replace function public.adv_reports_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_result jsonb;
begin
  if not public.has_screen_permission('advertisingReports','view') then
    raise exception 'لا توجد صلاحية عرض تقارير قسم الدعاية والإعلان.' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at',now(),
    'project_types',coalesce((
      select jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name) order by name)
      from public.adv_project_types where is_active
    ),'[]'::jsonb),
    'projects',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select
          pr.project_id,pr.project_number,pr.project_name,pr.customer_name,pr.status,
          pr.project_type_id,pt.name project_type_name,pr.start_date,pr.actual_delivery_date,
          pr.revenue,pr.estimated_cost,pr.material_cost,pr.direct_purchase_cost,pr.expense_cost,
          pr.actual_cost,pr.profit,pr.margin_pct,pr.cost_variance,pr.financial_closed_at
        from public.adv_project_profitability pr
        left join public.adv_project_types pt on pt.id=pr.project_type_id
        order by pr.project_number desc
      ) x
    ),'[]'::jsonb),
    'inventory',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select i.id item_id,i.item_code,i.name item_name,c.name category_name,u.name unit_name,u.symbol,
               b.quantity_on_hand,b.average_cost,b.inventory_value,i.reorder_level,b.last_transaction_at
        from public.adv_inventory_balances b
        join public.adv_items i on i.id=b.item_id
        left join public.adv_item_categories c on c.id=i.category_id
        left join public.adv_units u on u.id=i.unit_id
        order by i.name
      ) x
    ),'[]'::jsonb),
    'custody',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select t.id,t.transaction_number,t.transaction_date,t.transaction_type,t.amount,t.signed_amount,t.balance_after,
               t.project_id,t.item_id,t.reference_number,t.description,t.is_reversed,
               e.employee_code,e.name employee_name,p.project_number,p.project_name,i.name item_name
        from public.adv_custody_transactions t
        join public.adv_employees e on e.id=t.employee_id
        left join public.adv_projects p on p.id=t.project_id
        left join public.adv_items i on i.id=t.item_id
        order by t.created_at desc
        limit 3000
      ) x
    ),'[]'::jsonb),
    'purchases',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select p.id,p.purchase_number,p.purchase_date,p.destination_type,p.project_id,p.payment_source,
               p.invoice_number,p.reference_number,p.total_amount,p.status,
               s.name supplier_name,e.name employee_name,pr.project_number,pr.project_name
        from public.adv_purchases p
        left join public.adv_suppliers s on s.id=p.supplier_id
        left join public.adv_employees e on e.id=p.employee_id
        left join public.adv_projects pr on pr.id=p.project_id
        order by p.created_at desc
        limit 3000
      ) x
    ),'[]'::jsonb),
    'expenses',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select e.id,e.expense_number,e.expense_date,e.project_id,e.payment_source,e.amount,
               e.reference_number,e.description,e.status,t.name expense_type_name,
               em.name employee_name,p.project_number,p.project_name
        from public.adv_project_expenses e
        join public.adv_expense_types t on t.id=e.expense_type_id
        left join public.adv_employees em on em.id=e.employee_id
        join public.adv_projects p on p.id=e.project_id
        order by e.created_at desc
        limit 3000
      ) x
    ),'[]'::jsonb),
    'materials',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select t.id,t.transaction_number,t.transaction_date,t.transaction_type,t.project_id,t.item_id,
               t.quantity,t.quantity_effect,t.unit_cost,t.total_cost,t.is_reversed,
               p.project_number,p.project_name,i.item_code,i.name item_name
        from public.adv_inventory_transactions t
        join public.adv_projects p on p.id=t.project_id
        join public.adv_items i on i.id=t.item_id
        where t.transaction_type in ('project_issue','project_return','reversal')
          and t.project_id is not null
        order by t.created_at desc
        limit 3000
      ) x
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

grant execute on function public.adv_dashboard_snapshot() to authenticated;
grant execute on function public.adv_reports_snapshot() to authenticated;

commit;
