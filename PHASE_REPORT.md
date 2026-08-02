# Phase M14.9.1.1 — Today Requests Focused Layout Hotfix

## Root Cause
شاشة طلبات اليوم كانت تستخدم Workspace مقسومًا إلى قائمتين وتعرض معاينة الطلب الحالي بجانب قائمة اليوم، رغم وجود تبويب مستقل للطلب الحالي. كما أن قواعد ألوان عامة كانت تتغلب على لون نص زر بدء التنفيذ في Light Mode.

## Scope
- تحويل تبويبي طلبات اليوم والطلب الحالي إلى زرين صغيرين بمحاذاة يمين الشاشة.
- حذف قسم معاينة الطلب الحالي من تبويب طلبات اليوم.
- جعل قائمة طلبات اليوم بعرض المساحة بالكامل.
- الحفاظ على الانتقال التلقائي إلى تبويب الطلب الحالي بعد بدء التنفيذ.
- تثبيت لون نص زر بدء التنفيذ بالأبيض في Light Mode.

## Modified Files
- index.html
- assets/css/installation-execution.css
- assets/js/installation-execution.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- PHASE_REPORT.md

## Version
- Version: 18.39.1
- Build: 183901
- Cache Token: kyum-crm-pwa-18-39-1-m14-9-1-1-today-focused-layout

## Regression
- لم يتم تعديل SQL أو Supabase أو RLS.
- لم يتم تعديل دورة حالات التنفيذ أو رفع الصور أو Google Maps.
- الانتقال بعد بدء التنفيذ إلى الطلب الحالي ما زال فعالًا.
