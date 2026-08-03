# Phase M14.9.3.1 — Operational Reference Dropdown Scope Recovery

## Root Cause
`interest_categories` and `no_sale_reasons` SELECT policies required `settings.view`. Sales representative accounts can create customers, follow-ups, and quotations without access to Settings, so Supabase returned no reference rows. The UI also loaded representatives, interests, and reasons in one `Promise.all`; one rejected source prevented every operational dropdown from being refreshed.

## Scope
- Customer: interest categories and no-sale reason.
- Follow-ups: customer, representative, method/result/status, and no-sale reason.
- Quotations: searchable customer, representative, status, and rejection reason.
- Active reference rows are readable only for users with the relevant CRM screen permissions.
- Inactive rows remain visible only to users with Settings view permission.
- No reference-data write permission was changed.

## Modified Files
- `assets/js/app.js`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_9_3_1_operational_reference_dropdown_scope_recovery.sql`
- `supabase/verification/phase_m14_9_3_1_operational_reference_dropdown_scope_recovery_verification.sql`
- `PHASE_REPORT.md`

## Version
- Version: 18.41.1
- Build: 184101
- Cache Token: `kyum-crm-pwa-18-41-1-m14-9-3-1-reference-dropdown-scope`

## Regression Boundary
Installation RLS consolidation, customer data scope, follow-up/quotation write RLS, offline queue, and Smart Sync are unchanged.

## Validation
- JavaScript syntax (`app.js`, `pwa.js`, `service-worker.js`): PASS
- Duplicate HTML IDs: 0
- CSS brace audit: PASS
- Version synchronization: PASS
- Dashboard Offline Certification: PASS
- Offline Runtime Reliability: PASS
- Cache-first Connectivity: 15/15 PASS
- Sync Queue Recovery: 13/13 PASS
- Offline Write Completion: 10/10 PASS
- Full Enterprise Offline Certification: PASS WITH THE PREVIOUS DOCUMENTED WARNING

## Dropdown Audit Matrix
- Customer interest categories: active operational reference scope + awaited load.
- Customer no-sale reason: active operational reference scope + awaited load.
- Follow-up customer: scoped customer dataset.
- Follow-up representative: scoped representatives; automatically synchronized with selected customer.
- Follow-up method/result/completion: static canonical values retained.
- Follow-up no-sale reason: active operational reference scope.
- Quotation customer: searchable scoped customer dataset.
- Quotation representative: scoped representatives; automatically synchronized with selected customer.
- Quotation status: static canonical values retained.
- Quotation rejection reason: active operational reference scope.
