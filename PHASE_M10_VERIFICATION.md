# Phase M10 — PWA Verification

## Root Cause
The project already linked a basic web manifest and standard icons, but it had no Service Worker, no registration lifecycle, no install experience, no offline fallback, no maskable icons, and no iOS installation guidance. Therefore it could be bookmarked but was not a complete installable PWA.

## Scope
- Expanded the manifest with identity, scope, standalone display, orientation, categories, maskable icons, and app shortcuts.
- Added a same-origin Service Worker with app-shell precaching, navigation network-first handling, and static-asset stale-while-revalidate caching.
- Explicitly excluded Supabase, REST/Auth/Functions, API paths, and non-GET requests from caching.
- Added Android install prompting and iPhone Add-to-Home-Screen guidance.
- Added offline state feedback and a dedicated offline fallback page.
- Added maskable icons and portrait/landscape startup images.
- Kept Desktop, Tablet, Supabase, authentication, permissions, queries, and business logic unchanged.

## Files Modified / Added
- `index.html`
- `site.webmanifest`
- `service-worker.js`
- `offline.html`
- `assets/css/mobile.css`
- `assets/js/pwa.js`
- `assets/js/mobile.js` (version reference only; application behavior unchanged)
- `assets/images/maskable-icon-192x192.png`
- `assets/images/maskable-icon-512x512.png`
- `assets/images/pwa-splash-portrait.png`
- `assets/images/pwa-splash-landscape.png`

## Verification
- `node --check assets/js/pwa.js`: passed.
- `node --check service-worker.js`: passed.
- `node --check assets/js/mobile.js`: passed.
- Manifest JSON parse: passed.
- HTML parse: passed.
- CSS brace balance: `601 / 601`.
- `assets/js/app.js` SHA-256 remains identical to Phase M9.
- Service Worker cache rules exclude Supabase/API/auth/functions and all write requests.
- PWA assets are referenced using relative paths compatible with GitHub Pages subdirectories.
- Mobile asset version synchronized to `M10.0.0`.

A final browser installation test requires deployment over HTTPS (for example GitHub Pages) and testing Android Chrome plus iPhone Safari. Dynamic CRM data intentionally remains online-only.

## GitHub Desktop Summary
**Summary:** `Phase M10: enable installable KYUM CRM PWA`

**Description:**
- Add manifest, Service Worker, offline fallback, and install lifecycle.
- Add Android installation prompt and iPhone Add-to-Home-Screen guidance.
- Add maskable icons and mobile startup images.
- Cache only the application shell and static assets while excluding Supabase and sensitive dynamic requests.
- Preserve Desktop, Tablet, authentication, permissions, and business logic.
