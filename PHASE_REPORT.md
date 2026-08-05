# Phase M14.9.8.16.6.1 — Scheduling Modal Scroll & Sticky Footer Recovery

## Root Cause
The assignment dialog used a flex shell without a dedicated scrollable body. The action bar remained visible but overlapped the lower visit cards because the content area did not reserve its own scrolling region.

## Changes
- Added `installation-assignment-scroll-body` between the fixed header and footer.
- Converted the dialog shell to a three-row grid: header, scrollable body, footer.
- Added vertical scrolling to the body only.
- Kept Save and Cancel visible in a dedicated footer that does not cover fields.
- Prevented horizontal overflow and preserved responsive one-column layout.

## Files Modified
- index.html
- assets/css/installation-scheduling.css
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- PHASE_REPORT.md

## Version
- Version: 18.50.14
- Build: 185014
