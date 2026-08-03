# Phase M14.9.2.2 — Completion Report Full Layout Hotfix

## Root Cause
The completion dialog inherited generic dialog sizing and overflow rules. Its 980px shell was narrower than the combined invoice, evidence, file-input and footer content, producing horizontal scrolling, clipped fields and partially hidden actions.

## Scope
UI layout only for the Installation Completion Report dialog. Business logic, validation, uploads, Supabase, RLS and representative/team scopes are unchanged.

## Changes
- Expanded the dialog to a responsive maximum width of 1180px.
- Added an internal scrollable body with vertical scrolling only.
- Removed horizontal overflow and constrained all controls to the dialog width.
- Kept header and action footer visible while the form body scrolls.
- Desktop: structured multi-column layout.
- Tablet: two-column layout.
- Mobile: single-column layout with full-width actions.
- Preserved Light and Dark mode surfaces and borders.

## Version
- Version: 18.40.2
- Build: 184002
- Cache Token: kyum-crm-pwa-18-40-2-m14-9-2-2-completion-full-layout

## Modified Files
- index.html
- assets/css/installation-completion.css
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- PHASE_REPORT.md

## Regression
- Invoice required fields: unchanged.
- Delivery authorization upload: unchanged.
- Before/after photos: unchanged.
- Existing attachments: unchanged.
- Completion save/print logic: unchanged.
- Representative and team RLS: unchanged.
