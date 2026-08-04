# Phase M14.9.8.6 — Installation Day Details Customer Number & Representative Display

## Root Cause
The day-details appointment cards already received `customerPhone` and `representativeName` from the shared scheduling service, but the card renderer did not display them. No database or query expansion was required.

## Changes
- Added the customer number directly below the customer name.
- Added the sales representative name to each appointment card.
- Preserved address, technician, status, services, totals and actions.
- Kept the dynamic team-column layout and calendar workflow unchanged.

## Modified files
- assets/js/installation-scheduling.js
- assets/js/pwa.js
- index.html
- service-worker.js
- package.json
- version.json
- scripts/phase-m14-9-8-6-check.mjs
- PHASE_REPORT.md

## Version
18.46.5 / 184605
