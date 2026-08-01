# Phase M14.3 — Installation Scheduling Calendar & Assignment Foundation

## Root Cause
Phase M14.2 provided persistent installation requests and basic request scheduling fields, but there was no operational calendar, no technician master data, no assignment ownership fields, and no permission-scoped screen for workload distribution.

## Scope
- Added the `installationSchedule` screen under Installations Management.
- Added a Gregorian monthly calendar with technician/status filters and daily request cards.
- Added pending scheduling/assignment list and workload KPIs.
- Added technician operational master data with status, specialty, city and phone.
- Added assignment dialog for date, time slot, technician, status and notes.
- Added database assignment audit fields and automatic assignment stamping.
- Added RLS and screen permissions using the existing permission engine.
- Registered all new CSS/JS assets in the Offline App Shell.

## Files Modified
- `index.html`
- `assets/css/installation-scheduling.css`
- `assets/js/app.js`
- `assets/js/installations-service.js`
- `assets/js/installation-scheduling.js`
- `assets/js/permission-engine.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_3_installation_scheduling_assignment.sql`
- `supabase/verification/phase_m14_3_installation_scheduling_verification.sql`
- `PHASE_REPORT.md`

## Release
- Version: `18.26.0`
- Build: `182600`
- Cache Token: `kyum-crm-pwa-18-26-0-m14-3`

## Regression Boundaries
No customer, quotation, follow-up, representative visibility, authentication, Smart Cache, Sync Queue, Background Sync or existing responsive layer was replaced. Installation scheduling and technicians remain declared online-only operational setup until a later offline integration phase.

## Validation
- JavaScript syntax: PASS
- Duplicate HTML IDs: PASS (0 duplicates)
- Local CSS/JS references: PASS
- Version and Cache Token synchronization: PASS
- Dashboard Offline Certification: PASS
- Offline Runtime Reliability: PASS
- Cache-first Connectivity: 15/15 PASS
- Sync Queue Recovery: 13/13 PASS
- Offline Write Completion: 10/10 PASS
- Full Enterprise Offline Certification: PASS WITH DECLARED ONLINE-ONLY EXCLUSIONS
- Existing documented `assets/js/app.js` direct-data warning remains unchanged and outside this scope.
