# Phase M14.9.7.1 — Mobile Quotation Dialog Viewport & Footer Safe-Area Hotfix

## Baseline
- `kyum.company-main(7).zip`
- Cumulative phases M14.9.3 through M14.9.7

## Root Cause
The quotation dialog used a sticky footer while both the dialog and its form allowed visible overflow. On mobile browsers, the visual viewport changes with browser chrome, safe areas, font scaling, and the software keyboard. The footer therefore overlaid a different final field depending on the device height.

## Scope
- Mobile quotation create/edit dialog only.
- No quotation business logic, database, permissions, filters, or validation changes.

## Implementation
- Dynamic viewport height using `100dvh` with `100vh` fallback.
- Dialog split into fixed header, independently scrollable form body, and non-overlapping footer.
- Safe-area padding added to the footer.
- Horizontal overflow prevented for all controls, including date and number inputs.
- Small-phone and coarse-pointer layouts covered.
- Light and dark footer/header surfaces preserved.

## Version
- Version: `18.45.1`
- Build: `184501`
- Cache Token: `kyum-crm-pwa-18-45-1-m14-9-7-1-quotation-dialog-safe-viewport`

## Modified Files
- `assets/css/mobile-theme-canonical.css`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `scripts/mobile-final-enterprise-certification-check.mjs`
- `PHASE_REPORT.md`

## Regression Audit
- Quotation fields and their order: unchanged.
- Quotation save/edit handlers: unchanged.
- Customer searchable select: unchanged.
- Permissions and RLS: unchanged.
- Offline Queue and Smart Sync: unchanged.
- Desktop and tablet dialog behavior: unchanged.
