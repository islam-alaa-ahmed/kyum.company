# Phase M14.9.7.3 — Installations Service Contract Recovery

## Baseline

- kyum.company-main(7).zip
- Cumulative merge through M14.9.7.2

## Root Cause

All installation screens failed with errors such as:

- Cannot read properties of undefined (reading 'list')
- Cannot read properties of undefined (reading 'scheduleList')
- Cannot read properties of undefined (reading 'executionWorkspace')
- Cannot read properties of undefined (reading 'completionList')
- Cannot read properties of undefined (reading 'exceptionList')
- Cannot read properties of undefined (reading 'operationalReport')
- Cannot read properties of undefined (reading 'settingsCatalog')

The installation UI modules were calling `window.InstallationsService` directly. A partial/stale runtime load could leave the shared service object unavailable while all screen modules continued to initialize. This broke every screen at the same contract boundary, even though the individual Supabase queries and RLS rules were unchanged.

## Scope

- Restore one shared, verified service contract for every installation screen.
- Prevent installation modules from calling the service before it is ready.
- Add a cache-busted recovery load when the service file is missing or incomplete.
- Preserve all data queries, filters, RLS, team scope, representative scope, execution workflow, and completion logic.

## Implementation

- Added `installations-service-contract.js`.
- Added `KYUMInstallationsServiceReady` and a validated safe proxy.
- Added a fallback script load for `installations-service.js` using a recovery cache token.
- Updated all installation UI consumers to call the safe proxy.
- Added a ready event after the service publishes its complete method contract.
- Registered the new contract file in the Service Worker App Shell.

## Affected Screens

- New installation request.
- Installation requests.
- Scheduling and distribution.
- Installation execution.
- Completion reports.
- Exceptions and revisits.
- Installation reports.
- Installation dashboard.
- Installation settings.

## Version

- Version: 18.45.3
- Build: 184503
- Cache Token: kyum-crm-pwa-18-45-3-m14-9-7-3-installations-service-contract-recovery

## Validation

- JavaScript syntax: PASS
- Service Worker syntax: PASS
- Installation service contract registered: PASS
- All installation consumers use safe proxy: PASS
- Final mobile certification: 21/21 PASS
- App Shell assets: 66/66 PASS
- Dashboard offline certification: PASS
- Offline runtime reliability: PASS
- Cache-first connectivity: 15/15 PASS
- Sync queue recovery: 13/13 PASS
- Offline write completion: 10/10 PASS
- Full enterprise offline certification: PASS WITH 1 PREVIOUS DOCUMENTED WARNING

## Regression

Unchanged:

- Supabase schema and migrations.
- RLS and team boundary rules.
- Representative visibility.
- Current request ownership.
- Execution stage order and timestamps.
- Completion report workflow.
- Filters and KPI calculations.
- Light and Dark Mode styling.
