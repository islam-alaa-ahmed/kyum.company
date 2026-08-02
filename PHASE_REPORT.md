# Phase M14.9.0 — Dynamic Team Split Calendar Dialog

## Root Cause
تقويم التركيبات كان يعرض تفاصيل الطلبات كاملة داخل خلية اليوم، ما سبب ازدحامًا وصعوبة في مقارنة أحمال الفرق. لم تكن هناك نافذة يومية تجمع المواعيد حسب الفرقة أو تعرض تفاصيل الخدمات.

## Scope
- تحويل خلية اليوم إلى ملخص حسب فرق التركيبات.
- فتح نافذة تفاصيل في منتصف الصفحة عند الضغط على يوم يحتوي مواعيد.
- تقسيم النافذة ديناميكيًا: فرقة واحدة = عمود، فرقتان = عمودان، 3 = ثلاثة، 4 = أربعة. عند زيادة الفرق عن أربعة يتم توزيعها على صفوف إضافية مع الحفاظ على القراءة.
- عرض نوع كل خدمة وكميتها وإجمالي عدد وقيمة الخدمات لكل موعد.
- توفير فتح الطلب وإعادة الجدولة من بطاقة الموعد.
- عدم تغيير قاعدة البيانات أو RLS أو منطق الحفظ.

## Version
- Version: 18.38.0
- Build: 183800
- Cache Token: `kyum-crm-pwa-18-38-0-m14-9-0-dynamic-team-calendar-dialog`

## Modified Files
- `index.html`
- `assets/css/installation-scheduling.css`
- `assets/js/installation-scheduling.js`
- `assets/js/installations-service.js`
- `assets/js/installations-module.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`

## Regression Boundary
No SQL, Supabase schema, RLS, permissions, offline queue, or smart sync logic was changed.
