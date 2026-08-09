# Phase M15.14.4 — Working Days Daily Cost + Team Matrix Layout

## Scope
- Daily cost is calculated using working days in the selected month, excluding every Friday.
- Annual mode daily cost uses annual total / 12 / working days in the selected month.
- Monthly mode daily cost uses selected month total / working days in the selected month.
- Team allocation matrix dialog expands on desktop and fits team columns without clipping.

## Regression boundaries
- No database schema, RLS, permissions, team memberships, employee costs, or monthly overrides changed.
- Existing equal cost allocation across multiple teams remains unchanged.
- Mobile keeps horizontal scrolling for the matrix when physical screen width cannot fit all columns.

## Automated verification
- `node --check assets/js/installation-costs.js`
- `node scripts/phase-m15-14-4-working-days-team-matrix-check.mjs`
- Result: 8/8 PASS.
