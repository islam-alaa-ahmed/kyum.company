# Phase M14.6 — Installation Exceptions, Revisit Workflow & Operational Reports

## Baseline
Latest cumulative baseline through Phase M14.5.

## Root Cause
Phase M14.4 recorded deferred and failed execution states, but those records had no dedicated operational queue, no controlled revisit entity, and no installation-specific performance reporting. Reusing the original request date alone would overwrite history and prevent reliable revisit measurement.

## Scope
- Add an exceptions/revisit screen for deferred and failed installation requests.
- Add a controlled installation_revisits table with one active scheduled revisit per request.
- Reschedule the original installation request while retaining revisit history.
- Add operational reports for completion rate, revisit rate, execution duration, technician productivity, and failure reasons.
- Add CSV export.
- Register both screens in navigation, permission engine, versioning, and offline App Shell.

## Out of Scope
- Offline writes for installation operations.
- Customer satisfaction survey.
- Route optimization and GPS tracking.
- Inventory/material consumption.
- Changes to customers, quotations, RLS scope rules, or legacy business logic.

## Version
- Version: 18.29.0
- Build: 182900
- Cache Token: kyum-crm-pwa-18-29-0-m14-6

## Modified Files
- index.html
- assets/css/installation-operations-reports.css
- assets/js/app.js
- assets/js/installation-operations-reports.js
- assets/js/installations-service.js
- assets/js/permission-engine.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_6_installation_exceptions_revisits_reports.sql
- supabase/verification/phase_m14_6_installation_exceptions_revisits_reports_verification.sql
- PHASE_REPORT.md

## Database
New table: public.installation_revisits

Controls:
- Foreign keys to installation_requests and installation_technicians.
- One active scheduled revisit per installation request.
- RLS based on installationExceptions permission and current representative visibility.
- Audit fields for creator and timestamps.

## Permission Keys
- installationExceptions: view/edit
- installationReports: view/export

Super Admin receives the applicable permissions initially.

## Impact Audit
No changes were made to customer, follow-up, quotation, permission scope, offline queue, smart sync, or completion evidence logic. Existing installation phases remain loaded in their previous order.

## Validation
- JavaScript syntax: PASS
- CSS brace validation: PASS
- Duplicate HTML IDs: 0
- Offline Runtime Reliability: PASS (61/61 local CSS/JS assets registered)
- Cache-first Connectivity: 15/15 PASS
- Sync Queue Recovery: 13/13 PASS
- Offline Write Completion: 10/10 PASS
- Full Enterprise Offline Certification: PASS WITH DECLARED ONLINE-ONLY EXCLUSIONS

## Documented Previous Warning
The pre-existing direct UI data paths in assets/js/app.js for sales representative update/delete and generic reference delete remain unchanged and outside this phase scope.
