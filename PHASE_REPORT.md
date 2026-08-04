# Phase M14.9.7.8 — Installation Request Create Permission Recovery

## Root Cause
The dedicated `installationRequestNew` screen was granted `can_view` to operational roles during the unified create/edit phase, but `can_add` remained false. The permission engine correctly hid `#saveNewInstallationRequest`, leaving only the reset action visible.

## Fix
- Recover `can_add` for sales representatives and operational roles already allowed to add customers and view the dedicated screen.
- Keep backend RPC/RLS enforcement on `installationRequestNew.add`.
- Keep the save button visible with a clear disabled state/message when permission is genuinely missing, instead of silently removing it.
- Preserve representative and installation scope restrictions.

## Version
- Version: 18.45.9
- Build: 184509
