# Phase M14.8.2 — Installation Request Business Workflow & Multi-Service Form

## Root Cause
The previous new-request screen collected scheduling and execution fields during request creation and stored only one free-text work description. This did not match the approved workflow, where the requester records the customer, neighborhood, services, quantities and prices, while the installation supervisor reviews and schedules the request later.

## Scope
- Reorganized the separate new installation request screen into customer, service details and notes sections.
- Removed scheduling date, time slot and operational status from request creation.
- Added optional quotation linkage.
- Added reference-backed neighborhood and service type fields.
- Added multiple service rows with quantity, unit price, line total, total quantity and grand total.
- New requests are saved as `بانتظار المراجعة` and appear in Installation Requests.
- Added a transactional database RPC so the request and all service lines are created atomically.
- Added service summaries and total value to the requests table.

## Database
- `installation_neighborhoods`
- `installation_service_types`
- `installation_request_services`
- New request columns: `neighborhood_id`, `total_services_count`, `total_services_amount`
- Status constraint extended with `بانتظار المراجعة` and `وصل إلى العميل` for the approved workflow.

Existing customer districts are copied into the neighborhood reference table during migration. Service types remain controlled reference data and must be populated with the company's actual services.

## Files Modified
- index.html
- assets/css/installation-requests.css
- assets/js/installations-module.js
- assets/js/installations-service.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_8_2_installation_request_business_workflow_multi_service.sql
- supabase/verification/phase_m14_8_2_installation_request_business_workflow_verification.sql
- PHASE_REPORT.md

## Release
- Version: 18.32.0
- Build: 183200
- Cache Token: kyum-crm-pwa-18-32-0-m14-8-2-request-workflow-services

## Boundaries
No scheduling, technician assignment, execution, completion evidence, customer/follow-up/quotation business logic, or existing offline queue behavior was changed.
