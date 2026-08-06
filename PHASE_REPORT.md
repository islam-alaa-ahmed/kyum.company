# Phase M14.9.8.16.9.4 — Installation Summary Report & Financial Report Layout Recovery

## Scope
- إضافة تبويب **ملخص التركيبات** قبل التقرير المالي.
- تجميع الخدمات حسب الفرقة دون عمود الفني، مع دمج خلية الفرقة بعدد صفوف خدماتها.
- إظهار العدد، إجمالي قيمة الخدمة، ومتوسط قيمة الخدمة.
- إضافة إجمالي لكل فرقة وإجمالي عام.
- فلاتر اليوم السابق/الحالي/التالي، السنة، الشهر، اليوم، المندوب، واختيار فرق متعددة.
- تصدير PDF ومشاركة واتساب PDF وفق الفلاتر الحالية.
- إصلاح هيدر التقرير المالي ليتوافق مع 14 عمودًا وإزالة `%undefined`.

## Files Modified
- index.html
- assets/js/installations-service.js
- assets/js/installations-service-contract.js
- assets/js/installation-operations-reports.js
- assets/css/installation-operations-reports.css
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- PHASE_REPORT.md

## Regression
- لم يتم تعديل Business Logic للجدولة أو التنفيذ.
- التقرير يعتمد على RLS الحالية ونطاق صلاحيات تقارير التركيبات.
- PDF منفصل لملخص التركيبات ولا يغيّر صادرات التقارير الأخرى.
