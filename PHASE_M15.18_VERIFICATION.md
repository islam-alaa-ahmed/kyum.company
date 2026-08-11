# Phase M15.18 — Sales Representative Notification Data Isolation

## Root Cause
The Notification Center matrix could target the `sales_representative` role, and `emit_notification_event` expanded that role to every active sales representative without checking whether the underlying customer/quotation/installation belonged to each representative. The notification query only checked `user_id = auth.uid()`, so previously generated cross-representative rows remained readable.

## Fix
- Resolve the canonical representative scope from installation request/visit and supported metadata references (representative, customer, quotation, follow-up).
- Apply a hard ownership gate to Sales Representative recipients during notification generation.
- Apply the same gate in the `notifications` RLS SELECT/UPDATE policies so legacy leaked rows are not readable.
- Remove pending Push outbox rows that violate the new sales-representative scope.
- Keep the dynamic Notification Center matrix unchanged for event/channel selection and for all other roles.

## Expected behavior
A Sales Representative receives notifications only when the event can be resolved to the representative bound to their own user profile. Events with no resolvable representative scope are not delivered to Sales Representatives. Super Admin and other roles continue to follow the notification matrix.
