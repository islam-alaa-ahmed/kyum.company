# Phase M14.9.8.14 — Actual Execution Confirmation & Dynamic Re-Scheduling

## Baseline
`kyum.company-main(11).zip`

## Root Cause
The existing workflow treated pressing “completed” as full completion of the entire installation request. It had no persisted distinction between requested, scheduled, actually executed, and remaining quantities. Consequently a partially completed one-day request could be invoiced as complete, and remaining work could not return safely to scheduling under the same request number.

## Implemented workflow
- Every completed visit now requires **Actual Executed Quantity Confirmation** before invoice conversion.
- The confirmation form shows requested, current scheduled, previously executed, current executed, and remaining quantity for every service.
- Confirmed quantities may be lower or higher than the current visit schedule, but cumulative execution can never exceed the original request quantity.
- Remaining work can be:
  - rescheduled immediately with date, time, team, and technician; or
  - returned to **Requests Requiring Scheduling or Assignment** for later scheduling.
- The original installation request number is preserved. Follow-up work is stored as sequential execution visits.
- Invoice conversion remains unavailable until every requested service quantity is confirmed and no remainder exists.

## Database additions
- `installation_execution_visits`
- `installation_execution_visit_services`
- `installation_execution_quantity_audit`
- RPCs for visit creation, quantity summary, visit scheduling, and actual quantity confirmation.

## Affected screens
- Scheduling and assignment: remaining quantities replace original quantities for follow-up scheduling.
- Execution: technicians see the quantity allocated to the active visit.
- Installation completion confirmation: quantity confirmation precedes invoice conversion.
- Installation reports: requested, executed, remaining quantities, execution rate, executed value, and remaining value are available; the financial report and CSV include the new quantity metrics.

## Permissions and security
- Confirmation requires `installationCompletion.edit`.
- Scheduling requires `installationSchedule.edit`.
- Existing representative/team RLS remains in force.
- Writes to the new visit and audit tables occur only through SECURITY DEFINER RPCs with explicit permission and scope checks.

## Version
- Version: `18.50.0`
- Build: `185000`
- Cache token: `kyum-crm-pwa-18-50-0-m14-9-8-14-actual-execution-dynamic-rescheduling`

## Validation
- JavaScript syntax: PASS
- Service Worker syntax: PASS
- Duplicate HTML IDs: 0
- Phase static checks: 6/6 PASS
- ZIP root folder structure: PASS

## Manual verification
1. Complete a one-day request partially and choose “schedule later”; verify it disappears from completion and appears in pending scheduling with only the remainder.
2. Complete a request partially and choose “reschedule now”; verify a new visit is scheduled under the same request number.
3. Confirm a quantity greater than the current visit schedule but not greater than total remaining; verify future remainder is reduced.
4. Attempt to exceed the original request quantity; verify rejection.
5. Fully confirm all quantities; verify invoice conversion becomes available.
6. Verify installation financial reports and CSV show requested, executed, remaining, and execution rate.
