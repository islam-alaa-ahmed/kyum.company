# Phase M14.9.8.15.4 — Scheduled Request Service Value Sync & Global Save State UX

## Root Cause
`update_installation_request_with_services` deleted and recreated request-service rows. Visit allocations reference those row UUIDs with `ON DELETE CASCADE`, so editing a scheduled request removed the visit allocations. The calendar then rendered the visit with zero services and SAR 0.00.

## Fix
- Preserve allocations by visit and service type before replacing request-service rows.
- Rebuild allocations against the new row IDs after save.
- Single-day requests receive the complete updated quantity.
- Multi-day requests preserve visit order and distribution; quantity changes are reconciled on the last active visit.
- Prevent reducing a service below already executed quantity.
- Removed duplicate client-side visit-line collection.
- Added save-state feedback to request-service editing, request creation/editing, and scheduling/multi-day scheduling.

## Database
Run migration then verification:
- `supabase/migrations/phase_m14_9_8_15_4_scheduled_request_service_value_sync.sql`
- `supabase/verification/phase_m14_9_8_15_4_scheduled_request_service_value_sync_verification.sql`

The last two verification queries should return 0 rows.

## Version
- Version: 18.50.5
- Build: 185005
