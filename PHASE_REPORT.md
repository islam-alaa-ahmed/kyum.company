# Phase M14.8.6 — Customer Google Maps Location Integration

## Root Cause
The installation request stored the district/address text only. The field technician therefore had to search for the address manually, and the execution screen could not open the exact location shared by the customer.

## Scope
- Add an optional Google Maps location field to the new installation request screen.
- Store the link on the installation request itself.
- Validate supported HTTPS Google Maps sharing links in both the browser and database.
- Use the saved link in the technician execution screen, with the existing address search retained as a fallback.
- No changes to scheduling, permissions, representative visibility, customer management, RLS scope, offline queue, or Smart Sync.

## Supported links
- `https://maps.app.goo.gl/...`
- `https://www.google.com/maps/...`
- `https://google.com/maps/...`
- `https://maps.google.com/...`
- `https://goo.gl/maps/...`

## Files Modified
- `index.html`
- `assets/css/installation-requests.css`
- `assets/js/installations-module.js`
- `assets/js/installations-service.js`
- `assets/js/installation-execution.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_8_6_customer_google_maps_location.sql`
- `supabase/verification/phase_m14_8_6_customer_google_maps_location_verification.sql`

## Release
- Version: `18.36.0`
- Build: `183600`
- Cache Token: `kyum-crm-pwa-18-36-0-m14-8-6-customer-google-maps-location`

## Database Application
1. Run `supabase/migrations/phase_m14_8_6_customer_google_maps_location.sql`.
2. Run `supabase/verification/phase_m14_8_6_customer_google_maps_location_verification.sql`.

## Regression Boundaries
- Existing requests remain valid because the new field is nullable.
- Existing address-based map navigation remains available as fallback.
- No customer table or customer permission scope was modified.
- No installation representative visibility policy was modified.
