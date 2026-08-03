# Phase M14.9.7.5 — Installation Customer Search by Name, Phone & Code

## Root Cause
حقل العميل في شاشة طلب تركيب جديد كان قائمة Select تقليدية، لذلك لا يدعم البحث داخل العملاء عند زيادة العدد، ولا يمكن الوصول السريع باستخدام رقم الجوال أو رقم العميل.

## Scope
- تحويل اختيار العميل في شاشة طلب تركيب جديد إلى Combobox قابل للبحث.
- البحث بالاسم أو رقم الجوال أو رقم العميل.
- عرض الاسم والجوال ورقم العميل داخل كل نتيجة.
- الحفاظ على نطاق العملاء الذي تعيده RLS دون توسيع الصلاحيات.
- استمرار ربط عروض الأسعار بالعميل المختار.

## Files Modified
- index.html
- assets/css/installation-requests.css
- assets/js/installations-module.js
- assets/js/installations-service.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json

## Version
- Version: 18.45.5
- Build: 184505
- Cache Token: kyum-crm-pwa-18-45-5-m14-9-7-5-installation-customer-search

## Validation
- JavaScript syntax: PASS
- Service worker syntax: PASS
- Customer query includes customer_number: PASS
- Search supports name, phone, customer number: PASS
- Quotation filtering after customer selection: PASS
- SQL / RLS / business workflow: UNCHANGED
