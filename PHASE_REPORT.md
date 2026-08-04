# Phase M14.9.8.10 — Role-Agnostic Representative RLS Scope Recovery

## Root Cause
`public.can_access_representative(uuid)` still rejected every non-super-admin/non-manager/non-viewer role unless its role code was exactly `sales_representative`. Therefore a customer-service or custom-role user could have screen permission, a linked representative, and `own` scope, while Supabase RLS silently returned zero customer/follow-up/quotation rows.

## Fix
- Removed ordinary role-name authorization from the canonical representative scope function.
- `own` now means the linked representative for any active role.
- `selected` means linked representative plus explicitly selected representatives.
- `all` works only when explicitly stored, except for the immutable `super_admin` override.
- Missing configurations now use restrictive defaults.
- No table data, customer data, or business records are modified.

## Impact
Every RLS policy/RPC that calls `can_access_representative(uuid)` receives the corrected behavior, including customers, follow-ups, quotations, daily operations, installation requests, completion records and related reports.

## Apply
1. Run `supabase/migrations/phase_m14_9_8_10_role_agnostic_representative_rls_scope_recovery.sql` as postgres.
2. Run the verification file.
3. Sign out and sign in with the affected customer-service account.
4. Verify customers, follow-ups, quotations and scoped reports.

## Regression constraints
- No permission is granted merely by role name.
- Screen action permissions remain enforced independently by `has_screen_permission`.
- Installation-specific representative/team scopes remain independent.
- `all` is never inferred for ordinary roles.
