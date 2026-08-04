# Phase M15.0 — Sales Invoices Registry

## Baseline
`kyum.company-main(10).zip`

## Scope
- إضافة شاشة **فواتير المبيعات** داخل قسم **إدارة العملاء**.
- عرض سجل الفواتير في جدول موحد.
- إنشاء فاتورة مباشرة من عرض سعر مقبول غير مرتبط بتركيب.
- إنشاء/تحديث فاتورة تلقائيًا عند حفظ محضر تركيب مكتمل.
- منع تكرار الفاتورة لنفس عرض السعر أو طلب التركيب.
- تطبيق صلاحيات الشاشة ونطاق المندوب الحالي.

## Table columns
رقم الطلب، اسم العميل، رقم الفاتورة، قيمة الفاتورة، مصاريف التركيب، اسم المندوب، تاريخ الفاتورة، المصدر، الحالة.

## Data rules
- الفاتورة المباشرة من العرض تستخدم قيمة العرض ومصاريف تركيب صفرية.
- فاتورة التركيب تستخدم إجمالي خدمات الطلب، وتُحسب مصاريف التركيب من `quantity × default_cost` للخدمات.
- العرض المرتبط بتركيب لا يمكن فوترته مباشرة؛ تتم فوترته من محضر التركيب.
- لا يتم إنشاء تصميم فاتورة أو PDF أو تحصيل ضمن هذه المرحلة.

## Version
- Version: `18.48.0`
- Build: `184800`
- Cache Token: `kyum-crm-pwa-18-48-0-m15-0-sales-invoices-registry`

## Modified files
- `index.html`
- `assets/css/sales-invoices.css`
- `assets/js/app.js`
- `assets/js/quotations-service.js`
- `assets/js/installations-service.js`
- `assets/js/sales-invoices-service.js`
- `assets/js/sales-invoices.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m15_0_sales_invoices_registry.sql`
- `supabase/verification/phase_m15_0_sales_invoices_registry_verification.sql`

## Regression boundaries
لم يتم تغيير منطق العملاء أو المتابعات أو الجدولة أو التنفيذ أو صلاحيات الفرق. تم فقط إضافة سجل الفواتير وربطه بمصادره الحالية.
