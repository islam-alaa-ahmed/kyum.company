# KYUM Phase 15.4.1 — Company Contact Person

## Modified/New Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `assets/js/customers-service.js`
- `assets/js/customer360-export.js`
- `supabase/migrations/phase15_4_1_company_contact_person.sql`

## Implemented

- Added `اسم المسؤول` to the customer form.
- Field appears and becomes required only when customer type is `شركة`.
- Field is cleared and hidden for `فردي`.
- Added Supabase column `contact_person_name`.
- Added read/write support in CustomersService.
- Added responsible-person search.
- Added a responsible-person column to the customer table.
- Added the field to Customer 360.
- Added the field to Customer 360 Excel/PDF exports.
