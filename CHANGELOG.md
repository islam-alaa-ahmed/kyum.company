# KYUM Phase 08 — Customers Supabase CRUD

## Modified/New Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `assets/js/permissions.js`
- `assets/js/customers-service.js`
- `supabase/migrations/phase08_customer_audit.sql`

## Implemented

- Supabase is now the only production source for customer records.
- Live customer loading under existing RLS rules.
- Add and edit customers in Supabase.
- Delete customers for management roles only.
- Unique mobile validation in the UI and database.
- Customer-interest relationship persistence.
- Representative and no-sale-reason UUID relationships.
- Client-side search, filters and pagination.
- Role-aware add, edit and delete controls.
- Customer action audit logging.
- Dashboard customer indicators refresh from live customer data.

## Scope Note

Follow-ups and quotations still use their previous temporary source until
Phases 09 and 10. Customer CRUD itself no longer uses LocalStorage.
