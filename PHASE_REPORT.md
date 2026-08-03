# Phase M14.9.6 — Mobile Data Accuracy, Filters & Scale Certification

## Baseline
- `kyum.company-main(7).zip`
- Includes merged M14.9.3, M14.9.3.1, M14.9.4 and M14.9.5.

## Root Cause
1. The field labelled **رقم طلب العميل** in the completion report was populated from the internal installation request number (`INS-...`), not from an actual customer-issued order / purchase-order reference.
2. Several Arabic date/time render paths used `ar-SA` without an explicit Gregorian calendar, allowing device/browser calendar preferences to affect displayed dates.
3. Installation requests, reference options and completion records relied on single Supabase result sets. With large datasets this could silently stop at the server response limit and make filters, counts and dropdowns incomplete.

## Implemented Scope
- Added optional `installation_requests.customer_order_number` (max 120 characters).
- Added **رقم طلب العميل (اختياري)** to the shared create/edit installation request screen.
- Preserved the internal `request_number` as a separate immutable system identifier.
- Displayed and searched the customer order number in the installation requests screen.
- Completion report now reads the real customer order number; blank values display as unregistered instead of copying the internal request number.
- Updated create/update transactional RPCs to save the customer order number with services.
- Added paged data retrieval for installation requests, request services, customers, accepted quotations, neighborhoods, service types, completion reports and completion attachments to prevent silent 1000-row truncation.
- Explicitly locked touched Arabic date/time rendering to the Gregorian calendar.

## Files Modified
- `index.html`
- `assets/js/app.js`
- `assets/js/installations-module.js`
- `assets/js/installations-service.js`
- `assets/js/installation-completion.js`
- `assets/js/installation-execution.js`
- `assets/js/installation-operations-reports.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_9_6_mobile_data_accuracy_filters_scale.sql`
- `supabase/verification/phase_m14_9_6_mobile_data_accuracy_filters_scale_verification.sql`
- `PHASE_REPORT.md`

## Version
- Version: `18.44.0`
- Build: `184400`
- Cache Token: `kyum-crm-pwa-18-44-0-m14-9-6-mobile-data-filters-scale`

## Validation
- All JavaScript syntax checks: PASS
- Service Worker syntax: PASS
- Dashboard Offline Certification: PASS
- Offline Runtime Reliability: PASS (65/65 App Shell assets)
- Cache-first Connectivity: PASS (15/15)
- Sync Queue Recovery: PASS (13/13)
- Offline Write Completion: PASS (10/10)
- Full Enterprise Offline Certification: PASS WITH 1 PREVIOUS DOCUMENTED WARNING

## Regression Boundary
Unchanged:
- Installation representative/team RLS introduced in M14.9.3.
- Current request ownership and execution-stage protection from M14.9.4.
- Mobile Light/Dark canonical theme layer from M14.9.5.
- Execution workflow, completion invoice validation, attachment upload and Smart Sync behavior.

## Deployment Order
1. Upload the modified files using their original repository paths.
2. Run `supabase/migrations/phase_m14_9_6_mobile_data_accuracy_filters_scale.sql`.
3. Run `supabase/verification/phase_m14_9_6_mobile_data_accuracy_filters_scale_verification.sql`.
4. The final verification query should return `0 rows`.
