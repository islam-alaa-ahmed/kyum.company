# Phase M14.9.3 — Installation RLS Consolidation & Team Boundary Certification

## Root Cause
The main `installation_requests` select/update policies applied team scope only when the current user also had `installationExecution` permission. Because PostgreSQL RLS policies govern all query paths, scheduling, reports, completion, or overview users could load requests outside their granted installation teams while still passing representative scope.

## Scope
- Add one canonical combined scope function for installation representative + installation team.
- Rebuild canonical RLS policies for requests and every request child workflow.
- Apply the same scope to linked customer and quotation reads.
- Preserve unassigned requests only for users allowed to schedule installations.

## Security Result
A non-super-admin can access an installation request only when:
1. the representative is inside the independent installation representative scope; and
2. the assigned team is inside `installation_team_access`.

Unassigned requests are visible only to users with `installationSchedule/edit`. New requests remain unassigned at creation and cannot be inserted directly into an unauthorized team.

## Modified Files
- `supabase/migrations/phase_m14_9_3_installation_rls_consolidation_team_boundary.sql`
- `supabase/verification/phase_m14_9_3_installation_rls_consolidation_team_boundary_verification.sql`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Version
- Version: 18.41.0
- Build: 184100
- Cache Token: `kyum-crm-pwa-18-41-0-m14-9-3-installation-rls-team-boundary`

## Manual Permission Matrix
Test with:
- Super Admin.
- User granted one installation team and one representative.
- User granted multiple teams.
- Completion-only user.
- Scheduling user with unassigned requests.
- User with customer-management permissions but no installation scope.

Expected: no request, child service, execution file, history, completion report, revisit, linked customer, or linked quotation outside the intersection of representative and team scope is readable.
