# Phase M14.9.8.16.9.1 — Scheduling Save Button Runtime Recovery

## Root Cause

The scheduling form relied only on the browser native submit lifecycle. Multi-day visit controls were rendered with `required`, but when multi-day mode was turned off the panel was only hidden; its generated controls remained enabled and required. The browser therefore blocked the `submit` event before the JavaScript handler ran. This produced no `جاري الحفظ...` state and no application error, making the button appear unresponsive.

## Fix

- Added `novalidate` to the scheduling form and moved validation to the application layer.
- Changed the save button to an explicit button with a direct click handler.
- Kept Enter/form submission routed to the same single save function.
- Disabled every generated multi-day field whenever multi-day mode is off.
- Added explicit single-day validation and visible Arabic errors.
- Added save in-flight protection and clear saving/saved/error states.
- Preserved multi-day quantity validation, day locks, technician booking checks, permissions, and existing scheduling service calls.

## Files Modified

- `index.html`
- `assets/js/installation-scheduling.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Regression Scope

- Single-day scheduling
- Multi-day scheduling
- Toggle between single and multi-day modes
- Required-field validation
- Save button state transitions
- Day lock and technician booking validation
- Permission enforcement
