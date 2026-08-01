# Phase M14.8.4.2 — Installation Scheduling Modal, Hourly Slots & Technician Name Suggestions

## Root Cause

نافذة الجدولة كانت تستخدم شبكة عامة تسمح بعرض يتجاوز حدود الـDialog، مع `overflow:auto` على الحاوية، مما أنشأ تمريرًا أفقيًا وقطع بعض الحقول والأزرار.

كما كانت الجدولة تعتمد على:

- فترة نصية (`صباحي` / `مسائي`) بدل وقت محدد.
- اختيار حالة يدوي داخل نافذة الجدولة.
- Foreign Key إلى جدول `installation_technicians`، بينما دورة العمل المطلوبة تعتمد على كتابة اسم الفني مباشرة وحفظه كمقترح مستقل.

## Scope

- إعادة ضبط أبعاد وتخطيط نافذة الجدولة.
- إزالة الـHorizontal Scroll من النافذة.
- اعتماد ساعات كاملة من 10:00 صباحًا إلى 9:00 مساءً.
- إزالة حقل الحالة من النافذة؛ الحفظ يعيّن الطلب تلقائيًا إلى `مسند`.
- استبدال قائمة الفني بحقل بحث وكتابة يدوي مدعوم بـ`datalist`.
- حفظ الاسم الجديد في قائمة اقتراحات مستقلة ومنع تكراره بعد التطبيع.
- استمرار عرض أسماء الفنيين القديمة كـFallback للطلبات السابقة.
- إظهار الوقت واسم الفني في التقويم وشاشة التنفيذ.

## Database

Added to `installation_requests`:

- `scheduled_time time`
- `assigned_technician_name text`

New table:

- `installation_technician_name_suggestions`

The old `technician_id` and `time_slot` columns were retained for backward compatibility and historical records.

## Files Modified

- `index.html`
- `assets/css/installation-scheduling.css`
- `assets/js/installation-scheduling.js`
- `assets/js/installations-service.js`
- `assets/js/installation-execution.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `supabase/migrations/phase_m14_8_4_2_scheduling_hourly_technician_names.sql`
- `supabase/verification/phase_m14_8_4_2_scheduling_hourly_technician_names_verification.sql`

## Version

- Version: `18.34.2`
- Build: `183402`
- Cache Token: `kyum-crm-pwa-18-34-2-m14-8-4-2-scheduling-hourly-technician-names`

## Regression Boundary

No changes were made to customers, quotations, installation request creation, installation services, permissions schema, offline queue, Smart Sync, completion reports, or storage.

## Validation Report

- JavaScript syntax: PASS
- CSS brace validation: PASS
- Duplicate HTML IDs: 0
- Scheduling modal structure: PASS
- Hour range validation (10:00–21:00): PASS
- Status field removed from scheduling modal: PASS
- Searchable technician-name suggestions: PASS
- Dashboard Offline Certification: PASS
- Offline Runtime Reliability: PASS
- Cache-first Connectivity: 15/15 PASS
- Sync Queue Recovery: 13/13 PASS
- Offline Write Completion: 10/10 PASS
- Full Enterprise Offline Certification: PASS WITH ONE PREVIOUS DOCUMENTED WARNING
