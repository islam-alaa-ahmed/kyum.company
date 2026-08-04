# Phase M14.9.7.9 — Customer Service Follow-up & Installation Scope Persistence Recovery

## Root Cause

1. `CustomersService.resolveCustomerRepresentativeScope()` allowed scoped customer loading only when the profile role was exactly `sales_representative`. A customer-service user linked to a representative therefore received `mode: none`, so the customer selector in the follow-up dialog was empty.
2. The user dialog rendered installation scope controls, but `openUserDialog()` did not restore their values and `saveUserForm()` did not include them in the payload. `UsersService.updateUser()` consequently received undefined installation scope values and normalized them back to `own`.

## Fix

- Allow every non-privileged operational user linked to a representative to resolve the canonical customer data-access scope.
- Preserve RLS and selected-representative restrictions; no global customer visibility was granted.
- Implement complete installation-scope UI state management: render, search, select, restore, submit, and count.
- Send `installationAccessMode` and `allowedInstallationRepresentativeIds` on create/update.
- Verify the persisted installation profile and selected representatives after every save.

## Modified Files

- `assets/js/customers-service.js`
- `assets/js/app.js`
- `assets/js/users-service.js`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`

## Regression Scope

Customer visibility remains controlled by `user_data_access_profiles`, `user_data_access_representatives`, and database RLS. Installation visibility remains independent and controlled by `installation_data_access_profiles` and `installation_data_access_representatives`.
