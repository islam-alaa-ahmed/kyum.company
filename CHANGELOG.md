# KYUM Phase 07 — Reference Data Supabase

## Root Cause Fix

The favicon stopped working because Phase 06 replaced `index.html` using an older
baseline that did not contain the approved favicon links. The favicon links have
been restored in the Phase 07 `index.html`.

## Modified/New Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `assets/js/permissions.js`
- `assets/js/reference-data-service.js`
- `supabase/migrations/phase07_reference_data_audit.sql`

## Features

- Live loading of sales representatives from Supabase.
- Live loading of interest categories and no-sale reasons.
- Add/edit/activate/deactivate representatives.
- Add/edit/activate/deactivate reference items.
- Duplicate protection through database unique constraints.
- Management-only edit controls.
- Loading and connection error states.
- Audit-log insertion policy for Phase 07 operations.
