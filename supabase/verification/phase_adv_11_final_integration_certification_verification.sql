-- Phase ADV-11 — Final Integration & Certification Verification — READ ONLY

-- A. Canonical functions/views must exist.
select
  to_regclass('public.adv_project_profitability') as profitability_view,
  to_regprocedure('public.adv_close_project_financially(uuid,text)') as close_rpc,
  to_regprocedure('public.adv_reopen_project_financially(uuid,text)') as reopen_rpc;

-- B. Profitability must equal the immutable Project Cost delta ledger.
select
  p.project_number,
  p.actual_cost as profitability_actual_cost,
  coalesce(sum(c.amount),0)::numeric(18,4) as ledger_net_cost,
  (p.actual_cost-coalesce(sum(c.amount),0))::numeric(18,4) as difference
from public.adv_project_profitability p
left join public.adv_project_cost_entries c on c.project_id=p.project_id
group by p.project_id,p.project_number,p.actual_cost
having abs(p.actual_cost-coalesce(sum(c.amount),0)) > 0.01
order by p.project_number;

-- Expected: zero rows.

-- C. Reversal pairs must net to zero.
select
  r.id as reversal_entry_id,
  o.id as original_entry_id,
  r.source_type,
  o.amount as original_amount,
  r.amount as reversal_amount,
  (o.amount+r.amount)::numeric(18,4) as pair_net
from public.adv_project_cost_entries r
join public.adv_project_cost_entries o on o.id=r.reversed_entry_id
where abs(o.amount+r.amount) > 0.01
order by r.created_at desc;

-- Expected: zero rows.

-- D. Closed projects must have a complete close snapshot.
select project_number,status,financial_closed_at,
       financial_closed_revenue,financial_closed_cost,financial_closed_profit
from public.adv_projects
where status='مغلق ماليًا'
  and (
    financial_closed_at is null
    or financial_closed_revenue is null
    or financial_closed_cost is null
    or financial_closed_profit is null
  );

-- Expected: zero rows.

-- E. Multi-line direct-project purchases must be allowed by the source index.
select indexname,indexdef
from pg_indexes
where schemaname='public' and indexname='adv_project_cost_source_uq';

-- Expected WHERE clause excludes source_type='purchase'.

-- F. Orphan integration checks.
select 'purchase_line_without_effect' as issue,count(*) as rows
from public.adv_purchase_lines l
join public.adv_purchases p on p.id=l.purchase_id
where p.status='posted'
  and (
    (p.destination_type='inventory' and l.inventory_transaction_id is null)
    or (p.destination_type='project' and l.project_cost_entry_id is null)
  )
union all
select 'expense_without_cost',count(*)
from public.adv_project_expenses e
where e.status='posted' and e.project_cost_entry_id is null
union all
select 'custody_expense_without_custody_tx',count(*)
from public.adv_project_expenses e
where e.status='posted' and e.payment_source='custody' and e.custody_transaction_id is null;
