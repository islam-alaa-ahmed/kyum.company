# Phase M14.9.8.7.3 — Quotation-to-Installation Full Data Prefill Recovery

## Root Cause
The quotation action depended on a zero-delay custom event after navigation. On slower devices the installation module or view initialization could miss or overwrite the event values. The transfer also trusted in-memory quotation data and did not re-read the canonical record from Supabase.

## Fix
- Persist a short-lived quotation prefill intent in sessionStorage.
- Re-read the accepted quotation and customer from Supabase.
- Apply prefill after options and view initialization complete.
- Restore prefill after refresh within 30 minutes.
- Transfer customer, quotation, customer order number, matching district, and available quotation notes.
- Preserve service selection as an explicit installation step because quotation lines are not stored as structured installation service rows in the current schema.

## Version
18.46.10 / 184610
