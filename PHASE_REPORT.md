# Phase M14.9.8.15.2 — Installation Request Context Inline Editing & Google Maps Recovery

## Root Cause
The previous dialog displayed installation-request context as read-only summary cards. It also used the customer district/address fallback for the location card instead of exposing the request's `customer_map_url` as an editable field.

## Scope
- Edit the neighborhood stored on the current installation request.
- Edit the Google Maps URL stored on the current installation request.
- Edit the customer order number stored on the current installation request.
- Edit or clear the quotation linked to the current installation request.
- Save the request context and service lines through the existing atomic request/services RPC.
- Keep the dialog responsive without horizontal scrolling or clipped labels.

## Data Boundary
These changes update `installation_requests` and its service rows only. They do not update the customer master record or reference-data service prices.

## Validation
- JavaScript syntax checks: PASS
- Service contract check: PASS
- Editable request-context static checks: PASS
- Duplicate HTML IDs: 0
- Version synchronization: PASS
- Horizontal overflow prevention rules: PASS
