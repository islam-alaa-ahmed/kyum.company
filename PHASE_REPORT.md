# Phase M14.9.8.5 — Installation Scheduling Pending Table Data Expansion

## Root Cause
The pending scheduling table used a minimal six-column projection and did not display the operational context already available in `scheduleList`. The technician column was also misleading because these rows have not completed assignment yet.

## Changes
- Added services with quantities.
- Added total services amount.
- Added installation location.
- Added sales representative.
- Removed technician from the pending table.
- Preserved request number, customer, appointment, status and scheduling action.
- Kept the existing rule that a fully scheduled/assigned request leaves the pending table and appears in the calendar.

## Modified files
- index.html
- assets/js/installations-service.js
- assets/js/installation-scheduling.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- scripts/phase-m14-9-8-5-check.mjs
- PHASE_REPORT.md

## Version
18.46.4 / 184604
