# Phase M14.9.8.15.4.1 — Visit Service Write Permission Hotfix

## Root Cause
The Phase M14.9.8.15.4 replacement of `update_installation_request_with_services` was declared `SECURITY INVOKER`, while direct INSERT/UPDATE/DELETE privileges on `installation_execution_visit_services` are intentionally revoked from `authenticated`. When the RPC rebuilt visit-service allocations, PostgreSQL executed the INSERT as the logged-in user and returned `permission denied for table installation_execution_visit_services`.

## Fix
- Restored the canonical RPC to `SECURITY DEFINER`.
- Kept the protected visit-service table unavailable for direct client writes.
- Added explicit screen-permission, request-scope and representative-scope guards before privileged writes.
- No RLS broadening and no direct table grant was introduced.

## Apply
1. Run `supabase/migrations/phase_m14_9_8_15_4_1_visit_service_write_permission_hotfix.sql`.
2. Run `supabase/verification/phase_m14_9_8_15_4_1_visit_service_write_permission_hotfix_verification.sql`.

## Expected verification
- `is_security_definer = true`
- `has_scope_guard = true`
- `has_representative_guard = true`
- `authenticated_has_direct_write = false`
