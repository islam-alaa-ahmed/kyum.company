# KYUM CRM — Phase M15.2.2 Customer Geographic Dropdown Anchor & Rendering Hotfix

## Baseline
- Full baseline: `kyum.company-main (6)(6).zip` — version 18.52.2
- Applied prior stable delta: Phase M15.2.1 — version 18.52.3

## Confirmed root cause
Phase M15.2.1 positioned the geographic option panel with `position: fixed` while it remained a descendant of the top-layer `dialog`. Chromium can resolve fixed descendants of a dialog/containing block differently from viewport geometry. The JavaScript then injected viewport `left/width/top/bottom` values, while CSS also used logical inset rules. In RTL this produced an oversized white option surface that no longer matched the field width, and the option rows could be painted outside the visible part of that surface.

## Repair
- Removed viewport-coordinate positioning for desktop geographic dropdowns.
- Anchored every option panel to its own combobox with `position:absolute`.
- Width is now constrained exactly by the field (`left:0; right:0; max-width:100%`).
- Up/down opening still uses measured available dialog space, but only toggles relative top/bottom placement and max-height.
- Removed `contain: layout paint` from the option panel.
- Added explicit text color, horizontal overflow protection, and predictable box sizing.
- Mobile uses the same field-anchored behavior instead of a full-width fixed bottom sheet.

## Regression boundaries
No customer save logic, geographic catalog queries, Supabase pagination, RLS, permissions, installation logic, reports, or existing data were changed.

## Manual verification
1. Open Add Customer and Region dropdown.
2. Confirm popup width equals Region field width.
3. Confirm region names are visible and searchable.
4. Select a region and verify only its cities appear.
5. Select a city and verify only its districts appear.
6. Scroll the dialog and repeat near the bottom to verify upward opening.
7. Repeat in Edit Customer, dark mode, and mobile.

## Release
- Version: 18.52.4
- Build: 185204
- Cache: `kyum-crm-pwa-18-52-4-customer-geographic-dropdown-anchor-rendering-hotfix`
