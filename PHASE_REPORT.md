# Phase M14.9.8.16.6 — Multi-Day Scheduling Layout Collision Recovery

## Root Cause
The scheduling form uses a four-column CSS grid, but the `full-span` sections did not have an effective `grid-column: 1 / -1` rule. The multi-day panel, services summary and notes therefore occupied individual grid cells and collided with each other. Older responsive rules also compressed visit cards and their controls beyond usable widths.

## Changes
- Forced all direct `full-span` scheduling sections to occupy the full grid width.
- Separated the multi-day header, add-day action and visit cards into stable layout regions.
- Displayed two visit cards per row on wide screens and one per row below 1180px.
- Rebuilt each visit card as clear two-column field rows with readable labels and controls.
- Prevented horizontal overflow and text clipping in service quantity rows.
- Enlarged and clarified Add Day, Delete Day, Save Scheduling and Cancel buttons.
- Kept the dialog footer visible and stable.

## Regression Preservation
No scheduling business logic, quantities, past-date support, day locking, technician conflict checks, permissions, execution, invoices or reports were changed.

## Version
- Version: 18.50.13
- Build: 185013
