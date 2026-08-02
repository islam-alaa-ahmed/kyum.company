# Phase M14.9.1 — Team Daily Tasks & Active Installation Workflow

## Root Cause
شاشة تنفيذ التركيبات السابقة كانت قائمة بطاقات عامة ونافذة تعديل حالة يدوية. لم تكن تفصل بين طلبات اليوم والطلب النشط، ولم تفرض تسلسل خطوات التشغيل، كما لم توفر مساحة تشغيل ثابتة لفتح الموقع والتوثيق.

## Scope
- تبويبان: طلبات اليوم / الطلب الحالي.
- عرض الطلبات المجدولة ضمن البيانات التي تسمح بها RLS الحالية والفرقة المسندة للطلب.
- طلب نشط واحد في الواجهة.
- تسلسل إلزامي: بدء التحرك، فتح الموقع، وصل الموقع، بدء التركيب، تم الانتهاء.
- توثيق اختياري بالصور والملاحظات داخل مربع التوثيق فقط.
- انتقال الطلب المكتمل تلقائيًا إلى محاضر التركيبات عبر الحالة `مكتمل`.
- تصميم أزرار كحلي بإطار ذهبي، وفي Light Mode سطح أبيض للأزرار الثانوية بإطار ذهبي.

## Database
- إضافة `installation_requests.arrived_at`.
- إنشاء `installation_execution_files` لتسجيل صور التنفيذ.
- تحديث Trigger تسجيل أوقات مراحل التنفيذ.

## Version
- Version: 18.39.0
- Build: 183900
- Cache Token: kyum-crm-pwa-18-39-0-m14-9-1-team-active-workflow

## Modified Files
- index.html
- assets/css/installation-execution.css
- assets/js/installation-execution.js
- assets/js/installations-service.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_1_team_daily_active_installation_workflow.sql
- supabase/verification/phase_m14_9_1_team_daily_active_installation_workflow_verification.sql
- PHASE_REPORT.md

## Regression Boundary
لم يتم تعديل شاشات إنشاء الطلبات أو الجدولة أو التقويم أو محاضر التركيبات أو صلاحيات إدارة العملاء أو Offline Queue وSmart Sync.
