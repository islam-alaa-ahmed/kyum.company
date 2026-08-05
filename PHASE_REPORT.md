# Phase M14.9.8.11.2 — Execution Technician Filter Permission Scope Recovery

## Root Cause

The execution filters were locked whenever a record existed in `installation_user_technician_bindings`. The UI did not check the current role or installation access mode. A Super Admin or a user with `all` / `selected` access could therefore be treated as an own-scope technician and become locked to the saved technician and team.

## Fix

- `executionIdentity()` now returns the current role, installation access mode, binding, and an explicit `lockIdentity` decision.
- Identity filters are locked only when all conditions are true:
  - role code is `viewer` (displayed as فني تركيبات),
  - installation access mode is `own`,
  - a technician and team binding are both present.
- Super Admin is always resolved as `all` and never locked.
- Users with `all` or `selected` scope can choose among technicians and teams returned by their RLS-authorized workspace.
- Existing filter selections are preserved when the workspace refreshes if they remain authorized.
- No RLS bypass or SQL change was introduced.

## Regression Scope

- Technician own-scope remains locked to the assigned technician and team.
- Super Admin defaults to all technicians and all permitted teams.
- Selected-scope users can switch only between rows returned by Supabase RLS.
- Current request and execution stage permissions remain unchanged.
- Phase M16 installation financial reports remain merged in the baseline.

## Version

- Version: 18.49.1
- Build: 184901
- Cache Token: `kyum-crm-pwa-18-49-1-m14-9-8-11-2-execution-technician-permission-scope`
