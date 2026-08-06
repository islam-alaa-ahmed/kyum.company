# Phase M14.9.8.16.9.3 — Execution Visit Schedule Data Alignment

## Root Cause

شاشة التنفيذ كانت تقرأ التاريخ والوقت والفرقة من سجل `installation_requests` الرئيسي فقط، بينما التقويم يعرض بيانات `installation_execution_visits`. عند وجود زيارة فعلية أو خطة متعددة الأيام، أدى ذلك إلى اختلاف الوقت وظهور الفرقة القديمة أو الفارغة.

## Changes

- توسيع `executionWorkspace()` ليقرأ الزيارات وخدمات كل زيارة.
- استخدام وقت وفرقة وفني الزيارة الفعلية في طلبات اليوم.
- إضافة رقم العميل واسم المندوب.
- عرض ملاحظات الإسناد، ثم ملاحظات الطلب كبديل.
- الحفاظ على خدمات وكميات الزيارة بدل إجمالي الطلب الكامل.
- منع تكرار الطلب نفسه داخل قائمة الطلبات الحالية عند وجود أكثر من زيارة.

## Modified Files

- `assets/js/installations-service.js`
- `assets/js/installation-execution.js`
- `assets/css/installation-execution.css`
- `assets/js/pwa.js`
- `index.html`
- `service-worker.js`
- `package.json`
- `version.json`

## Manual Regression

- طلب أحادي اليوم.
- طلب متعدد الأيام.
- إعادة الجدولة مع تغيير الوقت والفرقة.
- عرض الديسكتوب والموبايل.
- زر بدء التنفيذ والطلب الحالي.
