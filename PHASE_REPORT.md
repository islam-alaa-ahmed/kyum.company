# Phase M14.9.8.8.1 — Scheduling Cross-Representative Customer Privacy Masking

## Root Cause
The global scheduling RPC intentionally returned every appointment for coordination, but it also returned customer name and phone for rows outside the caller representative scope. Disabling the open action did not prevent sensitive identity data from reaching the browser.

## Fix
- The RPC now computes `can_operate` once per request.
- Customer name and phone are blanked server-side when `can_operate = false`.
- A `customer_masked` flag tells the UI to display `بيانات العميل محجوبة`.
- Appointment, representative, team, technician, services, totals and general location remain visible for coordination.
- Open/reschedule restrictions remain unchanged.

## Modified Files
- assets/js/installations-service.js
- assets/js/installation-scheduling.js
- assets/js/pwa.js
- index.html
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_8_8_1_scheduling_cross_representative_customer_privacy_masking.sql
- supabase/verification/phase_m14_9_8_8_1_scheduling_cross_representative_customer_privacy_masking_verification.sql

## Regression Scope
No change to representative scopes, installation RLS, scheduling edit permissions, teams, execution, completion reports, quotations or customer records.
