# Phase M14.8.7.1 — Scheduling Modal Light Mode UI Hotfix

## Root Cause
The scheduling dialog relied on inherited surface and text variables that were not resolving to a sufficiently light surface inside the native dialog in Light Mode. The modal body therefore appeared gray/dark while controls stayed white, producing weak contrast and an inconsistent footer.

## Scope
- Light Mode styling for `#installationAssignmentDialog` only.
- Explicit white dialog surface, readable text, borders, placeholders, hover/focus states, close button, footer, and status message.
- Dark Mode and scheduling behavior remain unchanged.

## Files Modified
- `assets/css/installation-scheduling.css`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Release
- Version: `18.37.1`
- Build: `183701`
- Cache Token: `kyum-crm-pwa-18-37-1-m14-8-7-1-scheduling-light-mode-hotfix`

## Regression Boundaries
No changes were made to scheduling data, teams, technician suggestions, permissions, Supabase, RLS, Offline Queue, or Smart Sync.

## Validation
- JavaScript syntax: PASS
- Service Worker syntax: PASS
- CSS brace balance: PASS
- Release token synchronization: PASS
