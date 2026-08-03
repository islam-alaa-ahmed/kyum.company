# Phase M14.9.7.5.1 — Installation Customer Options & Layout Recovery

## Root Cause
Phase M14.9.7.5 added `customer_number` to the customers query while `options()` loaded customers, quotations, neighborhoods, and service types through one `Promise.all`. Any customers-query failure therefore rejected the complete options request and cleared all dependent lists, including neighborhoods and services. The new combobox was also inserted into the previous three-column form without rebalancing the remaining customer fields.

## Fix
- Customers, quotations, neighborhoods, and service types now load independently through `Promise.allSettled`.
- A compatibility fallback retries the customers query without `customer_number` only when the backend reports that the column/schema cache is unavailable.
- One failed list no longer removes successful lists.
- Removed legacy attempts to populate the hidden customer-id input as a `<select>`.
- Preserved customer search by name, phone, and customer number.
- Rebalanced the customer section to two columns on desktop and one column on mobile.
- Customer results remain anchored to the search field on mobile instead of covering unrelated form content.

## Modified Files
- `assets/js/installations-service.js`
- `assets/js/installations-module.js`
- `assets/css/installation-requests.css`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`

## Version
- Version: 18.45.6
- Build: 184506
- Cache Token: `kyum-crm-pwa-18-45-6-m14-9-7-5-1-customer-options-recovery`

## Regression Scope
No SQL, RLS, request-save logic, quotation filtering, installation workflow, execution timeline, completion reports, or offline queue logic was changed.
