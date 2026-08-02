# Phase M14.9.1.4 — Current Request Selection State Hotfix

## Root Cause
The current-request RPC accepted only `مسند` and `مجدول`. Some valid scheduled requests retained legacy/pre-execution states such as `بانتظار المراجعة` or `جديد`, so the request appeared in Today Requests but the RPC rejected it.

## Fix
- Accept valid scheduled pre-execution states.
- Normalise `بانتظار المراجعة`, `جديد`, and `مجدول` to `مسند` when selected.
- Selection writes only `selected_for_execution_at/by`; it does not write `on_route_at`, `map_opened_at`, `arrived_at`, `started_at`, or `completed_at`.
- Reject terminal, deferred, failed, or already-started requests.
- Preserve strict `can_access_installation_team` enforcement.
- Allow the first transition to `في الطريق` from all supported pre-execution states for compatibility.

## Version
- Version: 18.39.4
- Build: 183904
- Cache Token: kyum-crm-pwa-18-39-4-m14-9-1-4-current-request-selection-state-hotfix

## Modified Files
- assets/js/installations-service.js
- assets/js/pwa.js
- index.html
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_1_4_current_request_selection_state_hotfix.sql
- supabase/verification/phase_m14_9_1_4_current_request_selection_state_hotfix_verification.sql
- PHASE_REPORT.md

## Regression Scope
No UI layout, customer permissions, representative visibility, offline queue, scheduling data, or execution timeline display was changed.
