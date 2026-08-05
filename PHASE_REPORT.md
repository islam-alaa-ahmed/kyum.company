# Phase M14.9.8.16.8 — Employee Activity Timeline & Business Audit Trail

## Scope
- تحويل خط سير الموظف من سجل تقني إلى أحداث أعمال عربية مرتبطة باسم العميل أو رقم الطلب/العرض/الفاتورة.
- إضافة سجل أعمال محمي في Supabase مع Triggers للجداول الأساسية وRPC لتسجيل الحركات التفاعلية مثل فتح واتساب.
- تسجيل فتح رابط واتساب بعد تنفيذ فتح الرابط من المتصفح، مع اسم العميل ورقم الهاتف ومصدر الحركة عند توفرها.
- إضافة تصدير مستقل لخط السير PDF ومشاركة واتساب PDF وفق التاريخ والموظف ونوع النشاط المحددين.

## Files Modified
- index.html
- assets/css/style.css
- assets/js/app.js
- assets/js/daily-activity-service.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_8_16_8_employee_business_activity_timeline.sql
- supabase/verification/phase_m14_9_8_16_8_employee_business_activity_timeline_verification.sql

## Version
18.51.0 / build 185100
