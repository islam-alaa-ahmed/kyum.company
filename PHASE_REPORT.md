# Phase M15.2 — Geographic Search & Completeness Certification

## Root Cause

1. حقول المنطقة والمدينة والحي كانت تعتمد على `datalist` الأصلي للمتصفح، لذلك كانت القائمة تظهر خارج حدود نافذة العميل ولا يمكن التحكم في موقعها أو تصميمها بصورة ثابتة.
2. مصدر المنطقة والمدينة كان مشتقًا من صفوف الأحياء فقط، لذلك المنطقة أو المدينة التي لا يوجد لها حي ضمن الجزء المحمل لا تظهر.
3. استعلام Supabase كان ينفذ طلبًا واحدًا دون Pagination. حد النتائج الافتراضي قد يؤدي إلى تحميل أول 1000 حي فقط، رغم وجود آلاف السجلات في قاعدة البيانات.

## Changes

- استبدال datalist بثلاث قوائم بحث مخصصة ومترابطة.
- القائمة تفتح أسفل الحقل داخل الديسكتوب، وفي Sheet ثابتة على الموبايل.
- البحث العربي يدعم اختلاف الهمزات والتشكيل والتاء المربوطة والألف المقصورة.
- المنطقة تُحمّل من `installation_regions` مباشرة.
- المدينة تُحمّل من `installation_cities` مباشرة وتُفلتر حسب المنطقة.
- الحي يُحمّل من `installation_neighborhoods` ويُفلتر حسب المدينة.
- إضافة تحميل Paginated بحجم 1000 سجل لكل صفحة حتى انتهاء جميع السجلات.
- إضافة Keyboard Navigation ورسالة عدم وجود نتائج وإغلاق القائمة خارج الحقل.
- إضافة Verification SQL لفحص الأعداد والعلاقات والتكرارات والتغطية لكل منطقة.

## Files Modified

- `index.html`
- `assets/js/app.js`
- `assets/css/style.css`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/verification/phase_m15_2_geographic_catalog_completeness_verification.sql`
- `PHASE_REPORT.md`

## Regression Audit

- Customer add/edit payload continues saving the Arabic names, not UUIDs.
- Existing customer hydration maps stored region/city/district names to the current IDs.
- City is disabled until a region is selected.
- District is disabled until a city is selected.
- Changing region clears incompatible city and district.
- Changing city clears incompatible district.
- No changes to customers business logic, permissions, installations, reports, or Supabase RLS.
- JavaScript syntax: PASS.
- Service Worker syntax: PASS.

## Manual Verification

1. Run the M15.2 verification SQL and confirm 13 seeded regions and zero orphan/duplicate rows.
2. Open Add Customer and search for a region from the beginning and middle of its name.
3. Confirm the city list contains only cities of the selected region.
4. Confirm the district list contains only districts of the selected city.
5. Test a city/district expected after row 1000 to confirm pagination loads the full catalog.
6. Edit an existing customer and confirm its current geography is restored.
7. Test desktop, mobile, light mode, and dark mode.
