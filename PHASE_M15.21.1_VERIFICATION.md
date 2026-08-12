# Phase M15.21.1 — Manual Quotation Number Exact Duplicate Guard

## Root Cause
Phase M15.21 changed the add-quotation dialog to allocate a server-derived `Q-YYYY-NNN` number. That conflicts with the business workflow where quotation numbers are externally/manual registered references. In addition, `findByNumber()` used `ilike`, whose wildcard semantics are broader than exact identity, and the generic `23505` handler labeled every unique-key conflict as a duplicate quotation number.

## Fix
- New quotation number is blank and is entered manually by the user.
- Edit keeps the existing quotation number.
- Duplicate pre-check uses exact server equality on the full trimmed `quotation_number`.
- Database unique constraint remains authoritative.
- `23505` is reported as duplicate quotation number only when the violated constraint is the quotation-number unique key; unrelated internal unique conflicts get their own error.
- No SQL/RLS/business workflow changes.

## Verification
Run:

```bash
node tests/phase-m15.21.1/manual-quotation-number-exact-duplicate.contract.test.js
node --check assets/js/app.js
node --check assets/js/quotations-service.js
node --check assets/js/pwa.js
node --check service-worker.js
```

Expected: contract `7/7 PASS` and all syntax checks pass.
