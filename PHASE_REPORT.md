# Phase M14.7 — Installation Dashboard Integration, Settings & Final Module Certification

## Root Cause
The installations overview remained a static foundation placeholder after operational screens were completed. The module also had no persisted operational settings screen. Final module certification therefore required real dashboard aggregation, schema-compatible settings, permission registration, App Shell registration, and cumulative regression checks.

## Scope
- Replace placeholder dashboard indicators with live installation data.
- Add status distribution and upcoming-installations panels.
- Add Installation Settings screen and persisted singleton settings table.
- Register installationSettings in navigation and permission engine.
- Preserve all M14.1–M14.6.1 functionality and existing offline boundaries.

## Version
- Version: 18.30.0
- Build: 183000
- Cache Token: kyum-crm-pwa-18-30-0-m14-7-final-certification

## Modified Files
index.html; assets/css/installation-dashboard-settings.css; assets/js/app.js; assets/js/installations-service.js; assets/js/installation-dashboard-settings.js; assets/js/permission-engine.js; assets/js/pwa.js; service-worker.js; package.json; version.json; migration and verification SQL; PHASE_REPORT.md.

## Database Compatibility
Uses actual project columns: app_screens.group_name/display_order and role_screen_permissions.role. No group_key, sort_order, role_id, roles table, or can_import dependency.

## Offline Boundary
The UI assets are App Shell cached. Dashboard reads and settings writes remain online-only, matching the declared installations module policy. Existing Offline Login, Smart Cache, Queue and Background Sync are unchanged.
