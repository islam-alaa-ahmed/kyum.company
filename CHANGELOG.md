# KYUM Phase 11 Enum Hotfix

## Root Cause
PostgreSQL does not allow a newly-added enum value to be used before the
transaction that created it is committed.

## Fix
- Add `sales_supervisor` and `customer_service`.
- Commit the enum changes.
- Start a new transaction for the remaining Phase 11 migration.
