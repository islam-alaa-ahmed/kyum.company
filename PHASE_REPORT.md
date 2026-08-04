# Phase M14.9.8.1 — Installation Scheduling Action Permission UX Recovery

## Baseline
- `kyum.company-main (1)(4).zip`
- Phase M14.9.8 merged before this hotfix.

## Root Cause
The scheduling save button was registered under `installationSchedule.edit`. The central Permission Engine hid every unauthorized action using `hidden=true`, so a user who could view all installation requests but lacked the edit action opened the assignment dialog without any visible save control or explanation.

The installation data scope and the scheduling edit action are intentionally independent:
- installation scope controls which requests are visible;
- `installationSchedule.edit` controls whether assignment changes can be saved.

## Fix
- Added a per-action denied presentation mode to the Permission Engine.
- `#saveInstallationAssignment` now uses `deniedMode: disable` instead of being hidden.
- The disabled button remains visible and carries the explicit message: `ليس لديك صلاحية جدولة وإسناد طلبات التركيبات.`
- The assignment dialog displays the same inline message when opened without edit permission.
- The submit handler rechecks `installationSchedule.edit` before calling the service.
- Authorized users still receive the normal enabled save button regardless of role name.
- Service-side permission checks remain unchanged.

## Security
No permission was granted automatically. No RLS, RPC, team scope, representative scope, or installation data scope was widened.

## Version
- Version: `18.46.1`
- Build: `184601`
- Cache token: `kyum-crm-pwa-18-46-1-m14-9-8-1-installation-scheduling-permission-ux`

## Modified Files
- `assets/js/permission-engine.js`
- `assets/js/installation-scheduling.js`
- `assets/js/pwa.js`
- `index.html`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Validation
- JavaScript syntax: PASS
- Service Worker syntax: PASS
- Role-agnostic permission certification: 12/12 PASS
- Final mobile certification: 21/21 PASS
- Version/cache synchronization: PASS

## Manual Verification
1. User with `installationSchedule.view=true`, `edit=false`: dialog opens, save button is visible but disabled, and the permission message is shown.
2. User with `installationSchedule.edit=true`: save button is enabled and assignment saves normally.
3. Changing installation scope to all representatives does not grant edit permission.
