# Phase M14.9.8.11 — Installation Technician Role, Team Binding & Own Assignment Scope

## Root Cause
دور `viewer` كان ظاهرًا باسم «مشاهد» بدون ربط تشغيلي بفرقة أو فني، بينما نطاق التنفيذ كان يعتمد على الفرقة فقط. لذلك لم يكن ممكنًا ضمان أن مستخدم الفني يرى طلباته المسندة لاسمه فقط.

## Changes
- تغيير الاسم الظاهر للدور `viewer` إلى «فني تركيبات» مع بقاء الصلاحيات من شاشة الصلاحيات.
- إضافة ربط المستخدم بفرقة تركيب واسم فني.
- حفظ الربط بمعرّف الفرقة واسم فني normalized.
- مزامنة فرقة المستخدم تلقائيًا مع `installation_team_access`.
- تقييد طلبات التنفيذ وفتح الطلب الحالي وتحديث المراحل على الفرقة واسم الفني معًا.
- الحفاظ على جميع الأدوار الأخرى بدون تضييق إضافي إذا لم يكن لها Technician Binding.

## Version
- 18.47.0
- Build 184700

## Modified Files
- index.html
- assets/js/permissions.js
- assets/js/users-service.js
- assets/js/app.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_8_11_installation_technician_role_team_binding_scope.sql
- supabase/verification/phase_m14_9_8_11_installation_technician_role_team_binding_scope_verification.sql
- scripts/phase-m14-9-8-11-check.mjs

## Validation
- JavaScript syntax: PASS
- Service Worker syntax: PASS
- Feature certification: 8/8 PASS
