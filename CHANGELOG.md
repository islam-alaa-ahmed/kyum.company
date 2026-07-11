# KYUM Phase 09 — Follow-ups Supabase

## Modified/New Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `assets/js/permissions.js`
- `assets/js/followups-service.js`
- `supabase/migrations/phase09_followups_audit.sql`

## Implemented

- Supabase is now the only production source for follow-up records.
- Live follow-up loading under existing RLS policies.
- Add, edit and delete follow-ups.
- UUID relationships for customer, representative and no-sale reason.
- Automatic update of the customer's latest contact date.
- Update of quotation number and no-sale reason when supplied.
- Recalculation of latest contact date after follow-up deletion.
- Today, overdue, upcoming and completed status calculations.
- Search, representative filter, status filter and pagination.
- Role-aware follow-up controls.
- Follow-up audit logging.
- Customer profile timeline now uses live Supabase follow-ups.
- Dashboard follow-up indicators now use live Supabase data.

## Scope Note

Quotations still use the temporary source until Phase 10.
