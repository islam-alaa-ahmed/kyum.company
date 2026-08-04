# Phase M14.9.7.8.1 — Installation Request RLS Create Recovery

## Baseline
`kyum.company-main(8).zip`

## Confirmed root cause
The save button reached Supabase successfully, but `installation_requests` rejected the parent INSERT through RLS. The create path trusted a representative id supplied by the browser and used a `SECURITY INVOKER` RPC. The child services insert also depended on being able to re-select the new parent request, although a creator may own `installationRequestNew.add` without owning `installationRequests.view`.

## Recovery
- Resolve the request representative from the selected customer's authoritative owner.
- Allow the current representative only as a controlled fallback for legacy unassigned customers.
- Validate the resolved representative against the independent installation representative scope.
- Replace all competing request INSERT policies with one canonical policy.
- Rebuild the transactional create RPC as `SECURITY DEFINER` with explicit permission, scope, quotation, neighborhood, service and URL validation.
- Keep newly created requests unassigned to an installation team until scheduling.
- Preserve all existing SELECT/UPDATE/DELETE team and representative boundaries.

## Database files
- `supabase/migrations/phase_m14_9_7_8_1_installation_request_rls_create_recovery.sql`
- `supabase/verification/phase_m14_9_7_8_1_installation_request_rls_create_recovery_verification.sql`

## Version
- Version: `18.45.10`
- Build: `184510`
- Cache: `kyum-crm-pwa-18-45-10-m14-9-7-8-1-installation-request-rls-create-recovery`

## Manual regression
1. Sales representative opens New Installation Request.
2. Selects one of their accessible customers, neighborhood and service.
3. Saves successfully.
4. Request is created as `بانتظار المراجعة` with no team assignment.
5. The creator sees it only if their Requests view permission allows it.
6. A customer outside the installation representative scope remains blocked.
