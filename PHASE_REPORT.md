# Phase M14.8.7.2 — Remove Legacy Technician Management from Scheduling

## Root Cause
شاشة جدولة وتوزيع التركيبات ما زالت تعرض زرًا ونافذة قديمة لإدارة الفنيين، رغم أن دورة العمل الحالية تعتمد على فرق التركيبات من الإعدادات وأسماء الفنيين المحفوظة كمقترحات.

## Scope
- حذف زر «إدارة الفنيين» من شاشة الجدولة.
- حذف نافذة إدارة الفنيين القديمة من واجهة التطبيق.
- إزالة Event Handlers وعمليات التحميل الخاصة بالنافذة القديمة.
- إزالة ربط الصلاحية الخاص بنموذج الفنيين القديم.
- الإبقاء على جداول وبيانات الفنيين القديمة دون حذف لحماية السجلات السابقة.
- عدم تغيير اختيار الفرقة أو اسم الفني أو منطق الجدولة.

## Version
- Version: 18.37.2
- Build: 183702
- Cache Token: kyum-crm-pwa-18-37-2-m14-8-7-2-remove-legacy-technician-management

## Modified Files
- index.html
- assets/js/installation-scheduling.js
- assets/js/permission-engine.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json

## Regression Boundary
No database, RLS, scheduling assignment, team selection, technician name suggestions, offline queue, or customer permissions were changed.
