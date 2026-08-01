# Phase M14.8.1 — Separate New Installation Request Screen & Optional Quotation Support

## Root Cause
إنشاء طلب التركيب كان مرتبطًا بزر داخل شاشة قائمة الطلبات، ما خلط بين الإنشاء والمتابعة. كما أن دورة العمل تتطلب السماح بطلب مباشر دون عرض سعر.

## Scope
- إضافة شاشة مستقلة `installationRequestNew` داخل إدارة التركيبات.
- نقل إنشاء الطلب إلى نموذج صفحة كاملة.
- حذف زر الإنشاء من شاشة طلبات التركيبات.
- إبقاء تعديل الطلبات الحالية داخل Dialog شاشة الطلبات.
- دعم `quotation_id = null` وإظهار «بدون عرض سعر».
- إضافة الشاشة إلى الصلاحيات والتنقل.

## Version
- Version: 18.31.0
- Build: 183100
- Cache Token: kyum-crm-pwa-18-31-0-m14-8-1-new-request-screen

## Database
`quotation_id` اختيارية، مع استمرار Trigger مطابقة العميل عند اختيار عرض سعر فقط.

## Regression Boundary
لم يتم تعديل العملاء أو عروض الأسعار أو الجدولة أو التنفيذ أو المحاضر أو Offline Queue أو Smart Sync.
