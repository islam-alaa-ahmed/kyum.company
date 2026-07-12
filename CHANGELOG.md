# KYUM Phase 13.1 — Restore DELETE WHERE Fix

## Root Cause
The database safe-delete protection rejects `DELETE` statements that do not
contain a `WHERE` clause.

## Fix
- Replaced every full-table delete inside
  `restore_kyum_backup_transactional()` with `DELETE ... WHERE true`.
- Preserved child-to-parent delete order.
- Preserved parent-to-child restore order.
- Preserved atomic rollback behavior.
- Reloaded the PostgREST schema cache.
