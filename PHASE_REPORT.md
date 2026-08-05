# Phase M14.9.8.15.1 — Installation Inline Edit Dialog Layout & Request Context Recovery

## Scope
- Added request context to the existing installation services inline edit dialog.
- Removed horizontal scrolling from the services editor.
- Preserved service editing and scheduling workflows without database changes.

## Request context
- District / neighborhood.
- Customer location with a safe Open Location link when a map URL exists.
- Customer order number.
- Quotation number.

## Responsive behavior
- Wide desktop dialog with fixed, proportional service columns.
- No horizontal overflow.
- Two-column request context on tablets.
- Service rows become vertical cards on mobile.

## Modified files
- `index.html`
- `assets/js/installations-module.js`
- `assets/css/installation-request-inline-dialogs.css`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `package-lock.json`
- `version.json`

## Regression scope
- Installation Requests inline edit.
- Scheduling inline edit launch.
- Assignment dialog return flow.
- Service quantity, unit price, totals, add/remove and save behavior.

No SQL migration is required.
