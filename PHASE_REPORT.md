# Phase M14.9.4 — Mobile Installation Tables & Current Request Ownership Certification

## Baseline
`kyum.company-main(7).zip` + M14.9.3 + M14.9.3.1.

## Root Cause
- جدول محاضر التركيبات احتفظ بـ `min-width:1180px` داخل حاوية تقص المحتوى على الهاتف.
- شاشة الطلب الحالي كانت تستخدم أي طلب يحتوي على سجل تنفيذ كـ fallback، حتى لو لم يكن مختارًا بواسطة المستخدم الحالي.
- تحديث مراحل التنفيذ كان يسمح لمسار قديم باستكمال طلب متقدم داخل نطاق الفرقة دون إثبات ملكية الطلب الحالي.

## Scope
- تحويل صفوف محاضر التركيبات إلى Mobile Cards باستخدام نفس HTML والبيانات.
- تحديد الطلب الحالي حصريًا من RPC مرتبطة بـ `auth.uid()`.
- فرض ملكية الطلب الحالي على تحديث المرحلة ورفع صور التنفيذ.
- منع أكثر من طلب حالي نشط للمستخدم نفسه.

## Version
- Version: `18.42.0`
- Build: `184200`
- Cache Token: `kyum-crm-pwa-18-42-0-m14-9-4-mobile-table-current-ownership`

## Files Modified
- `assets/css/installation-completion.css`
- `assets/js/installation-completion.js`
- `assets/js/installation-execution.js`
- `assets/js/installations-service.js`
- `assets/js/pwa.js`
- `index.html`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_9_4_mobile_tables_current_request_ownership.sql`
- `supabase/verification/phase_m14_9_4_mobile_tables_current_request_ownership_verification.sql`
- `PHASE_REPORT.md`

## Regression Boundary
لم يتم تعديل دورة الجدولة أو صلاحيات إدارة العملاء أو بيانات المحاضر أو منطق الفاتورة والمرفقات.
