# Phase M14.9.8.7.1 — Quotation Installation Relationship Ambiguity Recovery

## Root Cause
Phase M14.9.8.7 introduced a reverse foreign key from `quotations.installation_request_id` to `installation_requests.id` while the existing canonical foreign key `installation_requests.quotation_id` already linked the same tables. PostgREST therefore found two possible relationships when embedding `quotations` from `installation_requests`.

## Fix
- Kept `installation_requests.quotation_id -> quotations.id` as the canonical relationship.
- Removed only the reverse foreign-key constraint while preserving `quotations.installation_request_id` and its values as a workflow pointer.
- Changed the installation request query to use the explicit PostgREST relationship `quotations!installation_requests_quotation_id_fkey`.
- Added migration and verification scripts.

## Regression Boundaries
No requests, quotations, services, permissions, scheduling data, or workflow pointers are deleted. The accepted quotation conversion workflow and duplicate-prevention index remain unchanged.
