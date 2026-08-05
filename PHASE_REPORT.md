# Phase M14.9.8.16 — Cancel Scheduled Installation

## Root Cause
The daily details dialog still exposed the legacy **Open Request** action although request editing had already moved to dedicated inline workflows. Scheduling managers had no direct way to remove a scheduled request from the calendar and return it to the pending scheduling queue.

## Implemented
- Replaced **فتح الطلب** with **إلغاء الجدولة** in the daily appointment card.
- The action is rendered only when the user has `installationSchedule.edit` and operational access to the request.
- Added confirmation before cancellation.
- Added save-state feedback: `جاري الحفظ...`, `تم الحفظ`, and `تعذر الحفظ`.
- Added the protected RPC `cancel_installation_request_schedule(uuid)`.
- Cancels all unstarted visits for single-day and multi-day requests.
- Clears date, time, team, technician, assignment metadata, and returns the request to `بانتظار الجدولة`.
- Blocks cancellation after execution starts or any actual quantity is confirmed.

## Files Modified
- `assets/js/installation-scheduling.js`
- `assets/js/installations-service.js`
- `assets/js/installations-service-contract.js`
- `assets/css/installation-scheduling.css`
- `supabase/migrations/phase_m14_9_8_16_cancel_scheduled_installation.sql`
- `supabase/verification/phase_m14_9_8_16_cancel_scheduled_installation_verification.sql`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`

## Manual Regression
1. User with view-only permission does not see the cancellation button.
2. User with edit permission cancels a single-day request and it returns to the pending table.
3. Cancelling a multi-day request removes every planned visit.
4. A request with started execution or confirmed quantity cannot be cancelled.
5. Day locks, rescheduling, technician conflict checks, and multi-day scheduling remain operational.
