# Phase M14.9.7.2 — Mobile Quotations Filter & KPI Stacking Hotfix

## Baseline
- KYUM Mobile baseline after Phase M14.9.7.1.

## Root Cause
The mobile quotations toolbar used `position: sticky` with a fixed top offset. The actual mobile header height varies between iPhone Safari, Android Chrome, browser chrome states, safe areas, and font scaling. As the page scrolled, the toolbar floated over the KPI grid and, when the status/loading row was visible, the visual overlap became larger.

## Scope
- Mobile quotations screen only.
- Layout/stacking rules only.
- No data, filtering, permissions, RLS, quotation save logic, or desktop/tablet changes.

## Implementation
- Returned `.mobile-quotations-toolbar` to normal document flow on mobile.
- Removed sticky offsets and transforms.
- Added deterministic spacing between toolbar, status row, KPI grid, and quotation cards.
- Normalized stacking contexts and widths.
- Preserved filter bottom sheet behavior and floating add button.
- Applied equally to Light Mode and Dark Mode.

## Version
- Version: 18.45.2
- Build: 184502
- Cache Token: `kyum-crm-pwa-18-45-2-m14-9-7-2-quotations-filter-kpi-stacking`

## Modified Files
- `assets/css/mobile-theme-canonical.css`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Regression Guard
- Quotation filters and filtering events unchanged.
- Quotation KPI calculations unchanged.
- Quotation table/mobile cards unchanged.
- Add quotation floating action unchanged.
- Bottom navigation and safe area unchanged.
- Desktop/tablet layouts unchanged.
