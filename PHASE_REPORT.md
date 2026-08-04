# Phase M14.9.8.7.4 — Quotation-to-Installation Instant Prefill Performance Recovery

## Root Cause
The existing full-prefill flow waited for all installation reference options and then performed a second Supabase quotation/customer read before writing any visible values. On slower devices this left the destination form visibly empty even though the source quotation and customer were already loaded in the quotations screen.

## Changes
- Pass a safe source snapshot with quotation/customer identifiers and visible fields when the action is clicked.
- Render customer, quotation, customer order number and notes immediately before navigation completes.
- Preserve the instant values while installation reference lists load.
- Run quotation verification and installation options loading in parallel.
- Reconcile the instant snapshot with authoritative Supabase data before allowing normal save validation.
- Keep the 30-minute session recovery from Phase M14.9.8.7.3.

## Security and data integrity
The snapshot improves perceived speed only. The authoritative Supabase verification remains active, and save still validates the selected customer, accepted quotation state, duplicate conversion, neighborhood and services.

## Modified files
- assets/js/app.js
- assets/js/installations-module.js
- assets/js/pwa.js
- index.html
- service-worker.js
- package.json
- version.json
- scripts/phase-m14-9-8-7-4-check.mjs
- PHASE_REPORT.md
