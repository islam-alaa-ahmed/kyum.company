# Phase M14.8.4.3 — Scheduling Team & Modal Layout

## Root Cause
The scheduling dialog did not include the installation team, and its visual field order did not match the approved workflow. Technician name and notes occupied full-width rows while the team stored in installation settings was not connected to scheduling.

## Scope
- Keep installation date and hourly installation time on the first row.
- Add an installation-team dropdown sourced from active `installation_teams` records.
- Place technician name beside team name.
- Move assignment notes to a full-width row below them.
- Persist the selected team through `installation_requests.installation_team_id`.
- Improve modal width, spacing, RTL alignment and responsive behavior.

## Version
- Version: 18.34.3
- Build: 183403
- Cache Token: kyum-crm-pwa-18-34-3-m14-8-4-3-scheduling-team-layout

## Modified Files
- index.html
- assets/css/installation-scheduling.css
- assets/js/installation-scheduling.js
- assets/js/installations-service.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_8_4_3_scheduling_team_layout.sql
- supabase/verification/phase_m14_8_4_3_scheduling_team_layout_verification.sql
