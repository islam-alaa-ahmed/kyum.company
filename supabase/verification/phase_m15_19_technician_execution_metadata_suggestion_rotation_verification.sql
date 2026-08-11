-- Phase M15.19 verification (read-only)

select
  to_regprocedure('public.get_installation_execution_reference_labels(uuid[])') is not null as execution_reference_rpc_exists,
  to_regprocedure('public.replenish_daily_customer_suggestions(uuid,date)') is not null as suggestion_rotation_rpc_exists;

-- Confirm the latest function definition contains the round-robin exposure ranking.
select
  position('suggestion_count' in pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure)) > 0 as uses_suggestion_exposure_count,
  position('last_suggestion_date' in pg_get_functiondef('public.replenish_daily_customer_suggestions(uuid,date)'::regprocedure)) > 0 as uses_last_suggestion_tiebreaker;

-- The execution reference RPC must remain scoped to installationExecution permission and assignment scope.
select
  position('installationExecution' in pg_get_functiondef('public.get_installation_execution_reference_labels(uuid[])'::regprocedure)) > 0 as execution_permission_guard,
  position('can_access_installation_assignment' in pg_get_functiondef('public.get_installation_execution_reference_labels(uuid[])'::regprocedure)) > 0 as technician_assignment_guard;
