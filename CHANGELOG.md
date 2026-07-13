# KYUM Phase 15.4.2 — Representatives List & Actions

## Modified Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`

## Implemented

- Replaced representative cards with a users-style table.
- Added search by name, code, phone and email.
- Added active/inactive status filter.
- Added assigned-customer count.
- Added actions column:
  - Edit
  - Suspend / Reactivate
  - Delete
- Prevented deletion when customers are assigned.
- Added safe Supabase status update and delete handling.
- Preserved Phase 15.4.1 company contact-person UI changes.
- No SQL migration or Edge Function.
