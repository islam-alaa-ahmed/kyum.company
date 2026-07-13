# KYUM Phase 15.2.6 — Export Center Script Loading Fix

## Root Cause
`reports-engine.js` and `export-center.js` were not loaded by `index.html`.
Therefore `window.ReportsEngine` and `window.ReportsExportCenter` were undefined.

## Fix
- Loaded XLSX before the export module.
- Loaded html2canvas before the export module.
- Loaded `reports-engine.js` before `app.js`.
- Loaded `export-center.js` before `app.js`.
- Added cache-busting version parameters.

## Modified File
- `index.html`
