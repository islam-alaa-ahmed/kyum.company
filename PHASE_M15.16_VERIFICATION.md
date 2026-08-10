# Phase M15.16 — Accepted Quotation → Installation Scheduling Handoff

## Root Cause / Gap Audit
- The quotation table already showed the create-installation action only for accepted quotations.
- The installation service already rejected a non-accepted quotation when a quotation was provided.
- Existing database triggers already synchronized `quotations.installation_request_id` for linked requests.
- Missing: a new installation request could still be created without any quotation.
- Missing: converted quotations could still be displayed by the Quotations screen when the workflow filter was changed.
- Missing: after creation the form stated that the request was sent to the Requests review screen and did not navigate to Scheduling.
- Missing: quotation cache/UI state was not explicitly invalidated immediately after installation creation.

## M15.16 Behavior
1. New installation requests require an accepted, not-previously-converted quotation.
2. Converted quotations are excluded from the Quotations screen itself.
3. Successful creation links the quotation to the request and invalidates quotation cache/state.
4. The user is navigated directly to Installation Scheduling after creation.
5. Historical legacy installation requests with no quotation are not altered by migration.

## Manual Regression
- Accepted quotation → button appears.
- Pending/rejected quotation → no create-installation button.
- Attempt direct create with no quotation → blocked before write.
- Create from accepted quotation → request created once, quotation disappears, Scheduling opens and request is available there.
- Reload Quotations → converted quotation remains absent.
- Existing legacy requests continue to load/edit.
