# Phase M15.31.2 — Mobile Visual Identity Expansion

## Scope
Phone-only visual identity expansion for Quotations, Sales Invoices, and Daily Operations.

## Root cause
The approved M15.31.1 identity tokens and canonical component styling were intentionally scoped only to Dashboard, Customers, and Followups. The remaining three target views therefore continued to inherit older generic mobile surfaces/card/table presentation rather than the approved Blue/Gold Glass 3D identity.

## Implementation
- Extended the existing canonical M15.31 owner block in `assets/css/mobile-theme-canonical.css` instead of adding a second override stylesheet.
- Added the three target views to the existing shared control/button contract.
- Applied the approved Blue/Gold glass identity to toolbars, summaries/KPIs, filters, mobile table cards, Daily Operations panels/progress cards, and action surfaces.
- No Desktop/Tablet selectors, business logic, SQL/Supabase, permissions, navigation, Header, Side Menu, or Bottom Navigation were changed.

## Verification
- `permissions:role-agnostic:check`: 12/12 PASS.
- `permissions:visibility-consistency:check`: 5/5 PASS.
- `dashboard:offline:check`: PASS.
- `mobile:final-certification:check`: 19/21; the two pre-existing installation certification failures remain: Current request server ownership and Completion default pending documentation.
- Version/cache ownership unified at 18.53.78.

## Manual review before next phase
1. عروض الأسعار: Light + Dark, filters sheet, KPI cards, quotation record cards/actions.
2. فواتير المبيعات: Light + Dark, summary cards, filters, invoice record cards.
3. إدارة المهام اليومية: Light + Dark, targets, checklist, suggested customers/team, progress cards and daily tables.
4. Desktop: spot-check Dashboard, Customers, Followups, Quotations, Sales Invoices, Daily Operations to confirm no visual change.
