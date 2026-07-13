# KYUM Phase 15.3.1 — Customer 360 Foundation

## Root Cause / Architecture
The project already had a customer-details dialog and a working `عرض` action.
The existing flow was upgraded instead of creating a duplicate customer screen.

## Modified/New Files

- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `assets/js/customer360-engine.js`

## Implemented

- Full-width Customer 360 dialog.
- Customer status: active, today, needs follow-up, overdue, inactive.
- Last-contact and inactivity calculation.
- Customer KPIs for follow-ups, quotations, values and conversion.
- Customer profile, interests, notes and no-sale reason.
- Quotation summary and complete quotation list.
- Follow-up summary, latest follow-up and complete history.
- Direct edit and add-follow-up actions.
- Responsive desktop, tablet and mobile layouts.
- No SQL migration or Edge Function.
