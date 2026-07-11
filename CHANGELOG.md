# KYUM Phase 12 — Backup Center & System Settings

## Modified/New Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `assets/js/permissions.js`
- `assets/js/backup-service.js`
- `assets/js/system-settings-service.js`
- `supabase/migrations/phase12_backup_system_settings.sql`
- `supabase/functions/backup-admin/index.ts`
- `PHASE12_SETUP.md`

## Implemented

- Full JSON backup export for operational and configuration tables.
- Backup file validation before restore.
- Super-Admin-only restore with typed confirmation phrase.
- Backup and restore operation history.
- Company identity settings.
- Currency, timezone, page size and session timeout settings.
- Database RLS for backup history and system settings.
- Secure server-side backup operations through a Supabase Edge Function.
- No Service Role key is exposed in GitHub Pages.
