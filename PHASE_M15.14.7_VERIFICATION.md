# Phase M15.14.7 — Super Admin Execution Full Control

## Root Cause
Phase M15.14.6 correctly allowed Super Admin to see an active execution visit selected by another technician, but the database mutation RPCs still enforced `selected_for_execution_by = auth.uid()`. The result was an inconsistent state: Super Admin could observe the current request but received `الزيارة ليست التنفيذ الحالي لهذا المستخدم` when advancing it.

## Fix
- `record_installation_visit_map_opened` now treats `super_admin` as an execution override while preserving all existing stage prerequisites.
- `advance_installation_execution_visit_stage` now lets `super_admin` advance an already-active visit regardless of which technician owns `selected_for_execution_by`.
- The visit must still be active (`selected_for_execution_at` is not null).
- Super Admin does **not** replace `selected_for_execution_by`; technician ownership remains intact.
- Every non-Super-Admin role keeps the original representative/team/technician and current-user ownership checks.
- Stage ordering and the mandatory map-open-before-arrival rule are unchanged.

## Impact / Regression Audit
- No scheduling, quantity, invoice, cost-center, customer, quotation, or reporting logic changed.
- No JavaScript/UI behavior changed.
- Technician execution isolation remains enforced.
- Super Admin override is evaluated server-side using the canonical `public.current_user_role()` source.

## Deployment
Run `supabase/migrations/phase_m15_14_7_super_admin_execution_full_control.sql` in Supabase SQL Editor (or through the normal migration pipeline) before testing.

## Manual Verification
1. Technician starts a visit and advances at least to `فتح موقع العميل`.
2. Log in as Super Admin and open the same current visit.
3. Advance to `وصلت إلى الموقع`; the ownership error must not appear.
4. Continue to `بدء التركيب` and verify stage timestamps update normally.
5. Re-test with a different normal technician account; it must still be blocked from controlling another technician's visit.
