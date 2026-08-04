# Phase M14.9.8.4 — Installation Service Hydration & Customer District Dropdown Recovery

## Baseline
- Full baseline: `kyum.company-main (2)(4).zip`
- Merged cumulative phase: M14.9.8.3

## Root Cause
1. The installation new-view event started `initializeNewView()` asynchronously, then immediately reset the form and created the first service row before service options finished loading. Existing rows were never rehydrated after the catalog arrived.
2. Customer district remained a free-text input and did not consume the active `installation_neighborhoods` reference catalog.

## Fix
- Added deterministic option-loaded state and service-row rehydration.
- New view reset now occurs only after options finish loading.
- Existing/edit rows preserve their selected service, including inactive legacy services.
- Customer district is now a select populated from active installation neighborhoods.
- Existing legacy district values remain selectable during edit.
- District catalog failure does not block the rest of the customer form.
- Selecting a district can fill blank city/region fields from reference data.

## Files Modified
- `index.html`
- `assets/js/installations-module.js`
- `assets/js/app.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `scripts/phase-m14-9-8-4-check.mjs`
- `PHASE_REPORT.md`

## Version
- Version: 18.46.3
- Build: 184603
