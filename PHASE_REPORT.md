# Phase M14.9.5 — Mobile Theme Canonicalization & Visual Regression Certification

## Baseline
- kyum.company-main(7).zip
- M14.9.3
- M14.9.3.1
- M14.9.4

## Root Cause
The mobile UI had multiple historical theme selectors (`html[data-theme]`, `[data-theme]`, `.dark-mode`, and `body:not(.dark-mode)`). The runtime only updated the root `data-theme`, so legacy selectors could remain out of sync. Several mobile cards, dialogs, fields, and table cells also inherited translucent glass surfaces, causing background bleed and weak contrast in both themes.

## Scope
- Synchronize the canonical theme state with legacy aliases.
- Add a final mobile-only theme normalization layer loaded after all feature styles.
- Enforce opaque surfaces, readable form controls, dialog surfaces, table cells, and primary-button contrast.
- Preserve all business logic, RLS, filters, data services, and offline behavior.

## Modified Files
- index.html
- assets/css/mobile-theme-canonical.css
- assets/js/app.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- PHASE_REPORT.md

## Version
- Version: 18.43.0
- Build: 184300
- Cache Token: kyum-crm-pwa-18-43-0-m14-9-5-mobile-theme-canonicalization

## Validation
- JavaScript syntax: PASS
- Service Worker syntax: PASS
- CSS brace validation: PASS
- Theme runtime synchronization: PASS
- New stylesheet App Shell registration: PASS
- Offline Runtime Reliability: PASS (65/65 local CSS/JS assets)
- Dashboard Offline Certification: PASS
- Cache-first Connectivity: 15/15 PASS
- Sync Queue Recovery: 13/13 PASS
- Offline Write Completion: 10/10 PASS
- Full Enterprise Offline Certification: PASS WITH 1 PREVIOUS DOCUMENTED WARNING

## Regression Boundary
No SQL, Supabase, RLS, customer/follow-up/quotation data logic, installation workflow, filtering logic, or permission logic was changed.
