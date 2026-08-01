# Phase M14.2 — Installation Requests Data Model & Core Screen

## Root Cause
Phase M14.1 established only the installations navigation and overview. There was no persistent installation request entity, no RLS-scoped CRUD service, and no operational screen for linking a request to a customer and accepted quotation.

## Scope
- Added `installation_requests` with generated request numbers, customer/quotation/representative links, schedule, status, priority, address, description and notes.
- Added quotation/customer consistency validation and representative inheritance from the customer.
- Added RLS policies using the existing screen permission and representative visibility engines.
- Added the `installationRequests` screen to navigation and permissions.
- Added responsive filters, KPI summary, table, create/edit dialog and delete action.
- Only accepted quotations are offered in the form and are filtered by selected customer.
- Added the new CSS/JS assets to the offline App Shell.

## Files Modified
- `index.html`
- `assets/css/installation-requests.css`
- `assets/js/app.js`
- `assets/js/installations-service.js`
- `assets/js/installations-module.js`
- `assets/js/permission-engine.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_2_installation_requests_data_model.sql`
- `supabase/verification/phase_m14_2_installation_requests_verification.sql`
- `PHASE_REPORT.md`

## Release
- Version: `18.25.0`
- Build: `182500`
- Cache Token: `kyum-crm-pwa-18-25-0-m14-2`

## Regression Boundaries
No customer, quotation, follow-up, permission, smart-cache, queue, background-sync, authentication, or reporting business logic was replaced. Existing M13.23 responsive layers and M14.1 foundation remain intact.
