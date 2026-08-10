# Phase M15.14.9 — Execution Selection Handoff Guard

## Root Cause
Phase M15.14.8 correctly excluded completed/terminal visits, but `executionWorkspace()` also required `visit.status === 'قيد التنفيذ'` before marking a visit as the current user selection. `select_installation_execution_visit()` intentionally selects a scheduled visit without changing its status from `مجدولة`; the status changes only when the first execution stage is advanced. Therefore after pressing `بدء التنفيذ`, the selection RPC succeeded, reload returned the visit still as `مجدولة`, and the UI dropped it from Current Request and returned the technician to Today's Requests.

## Fix
Current-selection recognition now accepts an actively selected non-terminal visit whether its status is `مجدولة` or `قيد التنفيذ`. Completed/confirmation/cancelled visits remain hard-excluded, preserving M15.14.8.

## Scope
- `assets/js/installations-service.js`: current-selection predicate only.
- Release/cache token bumped to `18.53.48` in canonical release files.
- No SQL/RLS/business calculation/scheduling/quantity/invoice changes.

## Regression Contract
1. Scheduled assigned visit appears in Today's Requests.
2. Pressing `بدء التنفيذ` selects the visit and it remains visible in Current Request after reload.
3. The first stage can then be advanced normally.
4. A visit with `completed_at` remains excluded.
5. `بانتظار التأكيد`, `مؤكدة`, `ملغاة`, `ملغي` remain excluded.
6. Super Admin observer behavior remains intact.
