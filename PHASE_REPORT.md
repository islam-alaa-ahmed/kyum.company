# Phase M14.9.8 — Enterprise Permissions Role-Agnostic Certification

## Scope
Runtime screen/action authorization and customer-domain data scopes were changed to depend on granted permissions and persisted scopes rather than ordinary role labels.

## Key changes
- Added `KYUMDataAccessScope` as the canonical resolver for customers, follow-ups, quotations and daily operations.
- Removed the sales-representative runtime permission baseline.
- Removed legacy role-matrix action visibility from `CustomerPermissions.apply`.
- Restricted representative dropdowns using the persisted canonical scope.
- Made missing scope rows restrictive for every non-super-admin user.
- Unified import visibility with `can_add`, matching the current database schema.
- Added an automated role-agnostic permissions certification check.

## Intentional immutable exception
`super_admin` remains the only explicit role override. All other roles are descriptive labels and do not determine ordinary screen/action/data access.

## Regression constraints
Installation customer scope and installation scope remain independent. Existing installation RLS/RPC policies were not widened or replaced.
