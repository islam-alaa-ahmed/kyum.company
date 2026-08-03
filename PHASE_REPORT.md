# Phase M14.9.7.4 — Installations Runtime Root Cause Recovery

## Root Cause

`assets/js/installations-service.js` exported `saveCompletion` inside `window.InstallationsService` although the function definition had been lost during the cumulative merge. At runtime this caused a `ReferenceError` before `window.InstallationsService` was assigned. Every installation screen then failed because the shared service object did not exist.

## Fix

- Restored `saveCompletion` with completion report upsert and before/after/delivery authorization uploads.
- Added rollback of uploaded storage object when its database metadata insert fails.
- Expanded the runtime contract to validate every method actually consumed by installation screens.
- Removed the misleading visible cache-contract message.
- Preserved queries, RLS, team scope, representative scope, execution flow, and UI layouts.

## Version

- Version: 18.45.4
- Build: 184504
- Cache Token: `kyum-crm-pwa-18-45-4-m14-9-7-4-installations-runtime-root-cause-recovery`

## Modified Files

- `assets/js/installations-service.js`
- `assets/js/installations-service-contract.js`
- `assets/js/pwa.js`
- `index.html`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Regression Scope

- New installation request and edit flow
- Installation requests list
- Scheduling and distribution
- Execution workspace
- Completion reports and attachments
- Exceptions and revisits
- Operational reports
- Installation settings catalog
