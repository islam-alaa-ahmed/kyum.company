# Phase M14.8.7 — Unified Installation Request Create/Edit Screen

## Root Cause
زر التعديل كان يفتح Dialog قديمًا يحتوي حقولًا تشغيلية وجدولة لا تطابق نموذج الإدخال الحالي متعدد الخدمات. كما أن تحديث الخدمات لم يكن موحدًا مع تحديث رأس الطلب داخل Transaction واحدة.

## Scope
- إلغاء مسار نافذة التعديل القديمة.
- فتح شاشة `طلب تركيب جديد` نفسها في وضع التعديل.
- تحميل العميل والحي ورابط Google Maps وعرض السعر والخدمات والكميات والأسعار والأولوية والملاحظات.
- تغيير عنوان الشاشة وزر الحفظ في وضع التعديل.
- تحديث الطلب وخدماته داخل Database RPC واحدة.
- الحفاظ على رقم الطلب والحالة والموعد والوقت والفرقة والفني والتنفيذ والمحاضر دون تغيير.

## Version
- Version: 18.37.0
- Build: 183700
- Cache Token: kyum-crm-pwa-18-37-0-m14-8-7-unified-request-edit

## Files Modified
- index.html
- assets/js/installations-module.js
- assets/js/installations-service.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_8_7_unified_installation_request_create_edit.sql
- supabase/verification/phase_m14_8_7_unified_installation_request_create_edit_verification.sql
- PHASE_REPORT.md

## Regression Boundary
لم يتم تعديل منطق الجدولة أو التنفيذ أو المحاضر أو نطاق رؤية المندوبين أو إدارة العملاء.
