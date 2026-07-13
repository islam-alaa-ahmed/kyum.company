# KYUM Phase 15.4.3 — Reference Data Filtered Full-Width View

## Modified Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`

## Implemented

- Converted reference data to a full-width single-panel layout.
- Added a dropdown selector for:
  - Customer interest categories
  - No-sale reasons
- Displays only the selected section.
- Added Delete beside Edit.
- Added safe Supabase deletion.
- Blocks deletion when the item is referenced by existing data.
- Recommends deactivation when deletion is blocked.
- No SQL migration or Edge Function.
