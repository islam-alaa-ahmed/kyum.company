# Phase M14.9.7.6 — Quotation Customer Order Number & Status Simplification

## Baseline
Built cumulatively on the latest stable Phase M14.9.7.5.1 baseline.

## Root Cause
The quotation form did not provide a separate customer-issued order/reference number. Quotation status was also distributed across six legacy values, while the required operational workflow now uses only three states.

## Scope
- Add optional customer order number to quotation create/edit.
- Persist, reload, cache and search the value.
- Limit quotation status UI to: قيد التنفيذ، مقبول، مرفوض.
- Normalize legacy values while preserving their original value in `legacy_status`.
- Keep permissions, RLS, customers, follow-ups, installations and offline queue behavior unchanged.

## Data Migration
- Added `quotations.customer_order_number`.
- Added `quotations.legacy_status` for historical preservation.
- Converted `تحت التجهيز`, `تم الإرسال`, `تحت المراجعة` to `قيد التنفيذ`.
- Converted historical `ملغي` to `مرفوض`, while retaining `ملغي` in `legacy_status`.
- Enforced the three-state database constraint.

## Version
- Version: 18.45.7
- Build: 184507
- Cache Token: kyum-crm-pwa-18-45-7-m14-9-7-6-quotation-customer-order-status

## Modified Files
- index.html
- assets/js/app.js
- assets/js/quotations-service.js
- assets/js/reports-engine.js
- assets/js/customer360-engine.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_7_6_quotation_customer_order_status_simplification.sql
- supabase/verification/phase_m14_9_7_6_quotation_customer_order_status_simplification_verification.sql
- PHASE_REPORT.md

## Regression Boundaries
No changes to customer/follow-up permissions, installation workflows, RLS policies, offline queue registration, Smart Sync, or quotation number uniqueness.
