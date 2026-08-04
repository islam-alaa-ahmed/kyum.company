# Phase M14.9.8.3 — Enterprise Permission & Visibility Consistency Recovery

## Root causes

1. `auth-session.js` loaded the authoritative permission rows, then refreshed navigation only. Action controls had already been hidden during the earlier pre-load apply, so the quotation add button could remain hidden until another unrelated refresh occurred.
2. The canonical installation RLS combined representative scope and installation-team scope for every screen. A sales representative could therefore lose their own request from `installationRequests` after it was assigned to a team they were not granted.
3. Legacy requests could hold a null or stale `representative_id` that differed from the current representative attached to the customer.

## Corrections

- Full navigation + action permission refresh immediately after permissions finish loading.
- Declarative `quotations.add` binding on the add quotation button; removed render-time visibility race.
- Repaired legacy installation request ownership from the linked customer.
- Added a trigger that keeps request ownership aligned on future inserts/customer changes.
- Requests view now requires representative access but is not hidden by team scope. Operational screens retain their own team/action policies.
- Added SQL diagnostics for unresolved own-scope users and quotation role permissions.

## Version

- Version: 18.46.2
- Build: 184602
- Cache: kyum-crm-pwa-18-46-2-m14-9-8-3-permission-visibility-consistency
