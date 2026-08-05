# Phase M14.9.8.15.3 — Multi-Day Scheduling Workflow Recovery

## Root Cause
The earlier quantity-confirmation phase added visit tables and dynamic re-scheduling after execution, but the active scheduling dialog still used the legacy single-date `assign()` path. No initial multi-day UI, quantity allocation payload, or calendar visit expansion was connected. Therefore the re-schedule dialog could only display one date even though visit infrastructure existed.

## Implemented
- Added `تقسيم تنفيذ الطلب على أكثر من يوم` to the scheduling and re-scheduling dialog.
- Added two or more visit rows with independent date, time, team and technician.
- Added per-service quantity allocation for every visit.
- Enforced exact allocation totals for every service before save.
- Added Supabase RPC `schedule_installation_request_multi_day`.
- Preserved one installation request number while creating child visits.
- Expanded the scheduling feed client-side so each planned visit appears on its own calendar day.
- Applied day-lock and technician-slot conflict validation to every visit.
- Existing plans reopen with their saved visit distribution.

## Regression Boundaries
- Single-day scheduling remains on the existing path.
- Actual quantity confirmation and dynamic remaining-quantity re-scheduling remain unchanged.
- Request services, invoices, permissions and customer data were not refactored.

## Apply
Run:
1. `supabase/migrations/phase_m14_9_8_15_3_multi_day_scheduling_workflow_recovery.sql`
2. `supabase/verification/phase_m14_9_8_15_3_multi_day_scheduling_workflow_recovery_verification.sql`

The last verification queries should return 0 rows.
