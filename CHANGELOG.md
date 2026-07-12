# KYUM Phase 13.1 — Generated Columns Restore Fix

## Root Cause
The backup contains values for generated database columns such as
`customers.normalized_phone`. PostgreSQL rejects explicit inserts into
generated columns.

## Fix
- Builds the writable INSERT column list from PostgreSQL metadata.
- Automatically excludes every generated column.
- Preserves IDs, relationships, timestamps, and normal writable fields.
- Preserves safe-delete `WHERE true`.
- Preserves parent/child restore order.
- Preserves atomic rollback behavior.
