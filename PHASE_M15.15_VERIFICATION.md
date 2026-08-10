# Phase M15.15 — Mandatory Google Maps Location

## Root Cause
The installation request form and create RPC accepted an empty `customer_map_url`; validation only checked URL format when a value existed.

## Scope
- New installation request: Google Maps link is mandatory.
- Existing installation requests remain readable even if historical data has no map link.
- Editing through the request/context form requires a map link before saving, so legacy rows are progressively corrected when edited.
- No scheduling, execution, quantity, invoice, permission, or cost-center logic changed.

## Verification
Run `node scripts/phase-m15-15-mandatory-google-maps-check.mjs`.
Apply the migration, then run `supabase/verification/phase_m15_15_mandatory_google_maps_installation_request_verification.sql`.
