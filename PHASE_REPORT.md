# Phase M14.6.1 — Schema Compatibility Hotfix

## Root Cause
M14.6 used a non-canonical permissions schema (`group_key`, `sort_order`, `role_id`, `public.roles`, `can_import`) while the actual KYUM baseline defines `app_screens(group_name, display_order)` and `role_screen_permissions(role, screen_key, ... can_export)` using `public.app_role`.

A second mismatch used `صباحية/مسائية` for revisit slots while installation requests use the canonical stored values `صباحي/مسائي`.

## Fix
- Replaced all invalid permission-schema references with the actual Phase 11 schema.
- Registered the two M14.6 screens under `إدارة التركيبات`.
- Granted only the intended Super Admin permissions.
- Added `view` permission to the revisit SELECT RLS policy.
- Standardized stored time-slot values to `صباحي/مسائي` while preserving the visible Arabic labels.
- Kept the migration transactional and idempotent.

## Execution
Run `supabase/migrations/phase_m14_6_installation_exceptions_revisits_reports.sql` again in Supabase SQL Editor. The failed previous run rolled back because it was inside `begin/commit`.

## Version
- Version: 18.29.1
- Build: 182901
- Cache Token: kyum-crm-pwa-18-29-1-m14-6-1-schema-hotfix

## Modified Files
- supabase/migrations/phase_m14_6_installation_exceptions_revisits_reports.sql
- supabase/verification/phase_m14_6_1_schema_compatibility_verification.sql
- index.html
- assets/js/installation-operations-reports.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- PHASE_REPORT.md
