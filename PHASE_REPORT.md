# Phase M14.8.5 — Independent Installation Representative Visibility Scope

## Root Cause
كانت جميع جداول التركيبات تستخدم `can_access_representative()`، وهي نفس دالة نطاق بيانات إدارة العملاء. لذلك منح أو منع رؤية مندوب داخل إدارة العملاء كان يغيّر تلقائيًا بيانات التركيبات، ولم يكن ممكنًا منح مستخدم رؤية تركيبات مندوبيّن محددين بصورة مستقلة.

## Scope
- إضافة فلتر مندوب إلى شاشة طلبات التركيبات.
- إنشاء نطاق مستقل للتركيبات: `own / selected / all`.
- إضافة قائمة مستقلة للمندوبين المسموح بعرض تركيباتهم داخل نموذج المستخدم.
- إنشاء `can_access_installation_representative(uuid)`.
- تحويل RLS الخاصة بطلبات التركيبات والخدمات والمحاضر والمرفقات وإعادة الزيارات وسجل التنفيذ إلى النطاق الجديد.
- إبقاء صلاحيات وداتا إدارة العملاء دون تغيير.

## Default Behavior
- Super Admin: جميع التركيبات.
- المستخدم المرتبط بمندوب: يرى تركيبات مندوبه تلقائيًا.
- `selected`: يرى مندوبه والمندوبين المحددين فقط.
- `all`: يرى جميع التركيبات، بشرط امتلاك صلاحية الشاشة نفسها.

## Files Modified
- `index.html`
- `assets/js/installations-module.js`
- `assets/js/users-service.js`
- `assets/js/app.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_8_5_independent_installation_representative_visibility.sql`
- `supabase/verification/phase_m14_8_5_independent_installation_representative_visibility_verification.sql`

## Release
- Version: `18.35.0`
- Build: `183500`
- Cache Token: `kyum-crm-pwa-18-35-0-m14-8-5-installation-representative-scope`

## Database Execution
1. Run `supabase/migrations/phase_m14_8_5_independent_installation_representative_visibility.sql`.
2. Run `supabase/verification/phase_m14_8_5_independent_installation_representative_visibility_verification.sql`.

## Regression Boundary
No customer-management data scope table, customer screen permission, business calculation, offline queue, or smart sync logic was modified.
