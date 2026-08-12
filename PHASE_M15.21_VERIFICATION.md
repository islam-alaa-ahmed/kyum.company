# Phase M15.21 — Quotation Number Source-of-Truth Recovery

## Root Cause
`nextQuotationCode()` كان يحسب الرقم التالي من مصفوفة `quotations` المحملة داخل الواجهة. هذه المصفوفة قد تكون scoped/cached ولا تمثل بالضرورة جميع أرقام العروض الموجودة فعليًا في Supabase، لذلك كان يمكن اقتراح رقم مستخدم بالفعل ثم يرفضه فحص uniqueness عند الحفظ.

## Fix
- إضافة `QuotationsService.getNextQuotationCode()` لقراءة أرقام العروض من مصدر البيانات الفعلي عند فتح نموذج إضافة عرض جديد.
- احتساب أعلى suffix رقمي مع دعم الأرقام القديمة والصيغة `Q-YYYY-NNN`.
- فحص المرشح النهائي عبر `findByNumber()` قبل وضعه في النموذج.
- الإبقاء على unique constraint وفحص الحفظ كطبقة حماية أخيرة.
- في Offline فقط يبقى fallback المحلي حتى لا يتم كسر Offline behavior.

## Scope / Regression
لا تغيير في Business Logic للحالات أو العملاء أو التركيبات أو الصلاحيات. لا تعديل SQL/RLS.

## Files Modified
- `assets/js/quotations-service.js`
- `assets/js/app.js`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `version.json`
- `package.json`
