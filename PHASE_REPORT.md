# Phase M14.9.8.16.9 — Global Typography Scale & Responsive Layout Certification

## Scope
- Increased UI typography by approximately two visual steps.
- Applied stronger, tiered font weights to headings, controls, buttons, tables, cards, and dialogs.
- Protected buttons and controls against clipped or overflowing labels.
- Improved wrapping and minimum heights for forms, tables, badges, dialogs, and action groups.
- Added responsive desktop, tablet, and mobile typography rules.
- Isolated print/PDF typography through `@media print` so exports remain compact and stable.

## Files Modified
- `assets/css/global-typography-certification.css`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Regression Protection
- No business logic, permissions, Supabase queries, calculations, filters, or workflow code changed.
- Existing CSS files were not replaced; the certification layer loads last and contains scoped overrides.
- Print styles explicitly restore compact report dimensions.
