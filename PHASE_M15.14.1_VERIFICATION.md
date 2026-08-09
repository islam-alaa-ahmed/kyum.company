# Phase M15.14.1 — Independent Cost Technicians & Teams

## Scope
- Annual / monthly cost tabs.
- Manual cost-center employee add/edit/delete independent from installation execution technicians.
- Manual cost-team add/edit/delete independent from operational installation teams.
- Team membership managed from inside each cost team.
- Team totals follow the active annual/monthly tab.
- Existing M15.14 cost names/values are migrated to stable technician IDs when possible.

## Database
Run `supabase/migrations/phase_m15_14_1_independent_cost_technicians_teams.sql` after the M15.14 migration.
Then run the verification SQL.

## Checks
- Phase static certification: 10/10 PASS.
- Permission visibility: 5/5 PASS.
- Role-agnostic permissions: 12/12 PASS.
- JavaScript syntax: PASS.
