# Phase M14.9.7.7 — Daily Performance Professional PDF Export

## Scope
إضافة زر تصدير PDF احترافي إلى شاشة تقرير الأداء اليومي فقط، دون تعديل حسابات التقرير أو البيانات أو الصلاحيات.

## Implemented
- زر `تصدير PDF` بجوار تحديث التقرير وتصدير CSV.
- التصدير يعتمد على تاريخ التقرير والموظف/المندوب المحدد حاليًا.
- هيدر KYUM احترافي يتضمن الشعار والعنوان وبيانات التقرير ووقت التصدير.
- تخطيط A4 أفقي مع RTL وخلفية طباعة بيضاء.
- تضمين ملاحظة المدير، مؤشرات الأداء، الترتيب اليومي، الجداول والتفاصيل الظاهرة.
- تكرار رؤوس الجداول عند امتداد التقرير لأكثر من صفحة.
- منع قص الصفوف والكروت الرئيسية بين الصفحات قدر الإمكان.
- فتح نافذة الطباعة مباشرة لاختيار `Save as PDF` من المتصفح.

## Unchanged
- Daily Performance calculations.
- Filters and representative scope.
- Supabase, SQL and RLS.
- CSV export.
- Desktop/mobile screen rendering.

## Version
- Version: 18.45.8
- Build: 184508
- Cache: kyum-crm-pwa-18-45-8-m14-9-7-7-daily-performance-pdf-export
