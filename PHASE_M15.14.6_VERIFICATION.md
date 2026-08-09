# Phase M15.14.6 — Super Admin Execution Observer

## Root Cause
`executionWorkspace()` marked a visit as current only when `get_current_installation_execution_visit_id()` returned it for the logged-in user. That RPC intentionally filters `selected_for_execution_by = auth.uid()`. Therefore a visit started by technician Waseem was visible to Waseem but was never marked current for Super Admin, and the Current Request tab rendered the empty state.

## Fix
For Super Admin only, an active execution visit with `selected_for_execution_at` is exposed as an active/current candidate for observation. Other roles keep the existing per-user selection behavior. No execution stage, assignment, scheduling, or database logic changed.

## Regression checks
- Technician current selection remains based on the existing RPC/current user.
- Super Admin can observe active selected visits regardless of who selected them.
- Unselected scheduled visits do not become current merely because Super Admin is logged in.
- Completed/confirmed visits remain excluded by the existing active visit query.
- No SQL/RLS/RPC changes.
