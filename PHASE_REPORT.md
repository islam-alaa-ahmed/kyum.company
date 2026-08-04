# Phase M14.9.8.8 — Scheduling Global Read-Only Visibility Exception

## Root Cause
The scheduling screen consumed `installation_requests` through the normal RLS-scoped table query. That correctly protected operational data, but it also prevented sales representatives from seeing the full company installation calendar for coordination purposes.

## Change
- Added a dedicated `SECURITY DEFINER` RPC requiring `installationSchedule.view`.
- The RPC returns the full scheduling calendar and pending queue for read-only coordination.
- Every row includes `can_operate`, calculated from the caller's existing installation representative scope.
- Open, reschedule and assign actions remain enabled only when the row is within that scope and the user has the required action permission.
- Out-of-scope rows are visibly marked as read-only.
- Other installation screens keep their existing RLS and representative/team scopes.

## Files Modified
- `assets/js/installations-service.js`
- `assets/js/installation-scheduling.js`
- `assets/css/installation-scheduling.css`
- `supabase/migrations/phase_m14_9_8_8_scheduling_global_readonly_visibility.sql`
- `supabase/verification/phase_m14_9_8_8_scheduling_global_readonly_visibility_verification.sql`
- version/cache files
- certification script

## Version
- Version: 18.46.7
- Build: 184607
- Cache: `kyum-crm-pwa-18-46-7-m14-9-8-8-scheduling-global-readonly-visibility`
