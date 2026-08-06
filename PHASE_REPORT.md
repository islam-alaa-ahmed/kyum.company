# Phase M14.9.8.16.9.2 — Scheduling Audit Customer Name Hotfix

## Root Cause

The scheduling button and frontend save path were working. The database transaction failed only after the scheduling RPC updated `installation_requests`.

That update fired `capture_business_activity_event()`, introduced by the employee activity timeline phase. The trigger queried:

```sql
select name from public.customers
```

The canonical customer field in the current database is `customer_name`, not `name`. PostgreSQL therefore raised:

```text
column "name" does not exist
```

Because the audit trigger executes in the same transaction, PostgreSQL rolled back the complete schedule operation. This affected single-day scheduling, multi-day scheduling, rescheduling, and editing an existing schedule.

## Fix

- Replaced all direct customer lookups inside `capture_business_activity_event()` with `customers.customer_name`.
- Kept a JSON fallback for legacy payloads without requiring a physical `name` column.
- Preserved all audit triggers and audit event data.
- Did not modify scheduling business logic, permissions, conflict detection, day locks, quantities, or frontend layout.

## Files Modified

- `supabase/migrations/phase_m14_9_8_16_9_2_scheduling_audit_customer_name_hotfix.sql`
- `supabase/verification/phase_m14_9_8_16_9_2_scheduling_audit_customer_name_hotfix_verification.sql`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Manual Regression Tests

1. Schedule one request for one day.
2. Schedule one request across two days.
3. Edit and save an existing schedule.
4. Reschedule an existing request.
5. Confirm technician conflict still blocks a different request at the same time.
6. Confirm audit timeline records the scheduling change with the customer name in Arabic.
