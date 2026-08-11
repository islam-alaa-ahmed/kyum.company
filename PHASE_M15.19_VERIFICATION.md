# Phase M15.19 Verification

## Scope
- Technician execution card metadata: representative + team labels.
- Daily suggested-customer fair rotation without early repeats.

## Root Cause
1. `installation_requests` was visible to the bound technician, but nested `sales_representatives` / `installation_teams` labels could be filtered by their independent RLS policies, so the same execution request showed labels for Super Admin but blanks for the technician.
2. Daily suggestion replenishment excluded only same-day suggestions/followups. Historical suggestions were not part of candidate priority, allowing a contacted customer to re-enter before the representative's remaining customer pool had completed one suggestion cycle.

## Fix
- Added a narrow SECURITY DEFINER RPC returning only representative/team labels for execution requests already inside the caller's permitted execution + assignment scope.
- Merged these labels only as fallbacks when nested joins are unavailable.
- Changed replenishment candidate order to lowest historical suggestion count first, then oldest last-suggestion date. This creates a balanced round-robin: no customer receives the next exposure count until lower-exposure customers catch up.

## Regression boundaries
- No customer/representative global visibility expansion.
- No scheduling, execution-state, quantity, invoice, notification-matrix, or cost-center logic changes.
- Same-day duplicates remain blocked.
- Phase M15.18 sales-representative notification isolation is preserved.
