# Phase M15.25 — Suggested Customers Strict Rotation Cycle

## Root Cause
The existing M15.19 engine used historical exposure count as an ORDER BY priority. That was fair round-robin ordering, but the cycle boundary was implicit rather than enforced as a hard eligibility rule. A replenishment batch could therefore continue from the lowest exposure group into the next exposure group in the same generation call after the lower group was exhausted.

Transactions are not customer identities in this engine: quotations, invoices and customer requests are not joined by the replenishment RPC. The canonical rotation identity remains `customers.id`.

## Fix
- Added an explicit `v_cycle_floor` for each representative/customer type.
- Only customers whose historical exposure count equals the current cycle floor can be selected.
- The next cycle cannot start until no eligible customer remains on the previous floor.
- Same-day duplicate prevention and same-day follow-up exclusion remain intact.
- Preserved the existing 10 company + 10 individual daily target and representative account scope.
- No quotation, invoice, installation, customer-request, permission, or business workflow logic was changed.

## Data integrity audit
The verification SQL checks duplicate non-empty normalized phones and separately lists same-name/no-phone master rows for manual review. No automatic name-based merge is performed.
