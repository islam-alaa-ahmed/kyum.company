# KYUM CRM Enterprise
## Phase M14.8.4 — Installation Settings Single-View UX

### Baseline
`kyum.company-main(6).zip`

### Root Cause
1. شاشة إعدادات التركيبات كانت تستخدم ثلاثة عناصر `details`، لذلك بقيت الخدمات وفرق التركيبات والأحياء موجودة في الصفحة معًا، حتى عند الرغبة في التركيز على قسم واحد.
2. قائمة إدارة التركيبات كانت تضيف صراحة `max-height: 520px` و`overflow-y: auto`، مما أنشأ شريط تمرير داخليًا مستقلًا داخل القائمة الجانبية.

### Scope
- إضافة فلتر علوي لاختيار: الخدمات، فرق التركيبات، الأحياء.
- عرض قسم واحد فقط وإخفاء القسمين الآخرين فعليًا من التخطيط.
- الاحتفاظ باختيار المستخدم أثناء الجلسة الحالية.
- إزالة Accordion القديم.
- إزالة التمرير الداخلي من قائمة إدارة التركيبات.
- تحسين المسافات وترويسة القسم وأزرار الإضافة والجداول.
- عدم تعديل قاعدة البيانات أو RLS أو Business Logic.

### Files Modified
- `index.html`
- `assets/css/installation-dashboard-settings.css`
- `assets/js/installation-settings-management.js`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`

### Version
- Version: `18.34.0`
- Build: `183400`
- Cache Token: `kyum-crm-pwa-18-34-0-m14-8-4-settings-single-view`

### Impact Audit
- لا تغيير في جداول Supabase.
- لا تغيير في صلاحيات التركيبات.
- لا تغيير في حفظ أو تعديل أو حذف الخدمات والفرق والأحياء.
- لا تغيير في طلبات التركيبات أو الجدولة أو التنفيذ.
- التمرير الأفقي داخل الجداول بقي متاحًا عند الحاجة.

### Validation
- جميع ملفات JavaScript: PASS
- Service Worker syntax: PASS
- CSS brace validation: PASS
- Duplicate HTML IDs: 0
- Dynamic single-section display: PASS
- Sidebar internal vertical scroll removal: PASS
- Version synchronization: PASS
- App Shell registration: 64/64 PASS
- Dashboard Offline Certification: PASS
- Offline Runtime Reliability: PASS
- Cache-first Connectivity: 15/15 PASS
- Sync Queue Recovery: 13/13 PASS
- Offline Write Completion: 10/10 PASS
- Full Enterprise Offline Certification: PASS WITH 1 PREVIOUS DOCUMENTED WARNING

### Previous Warning
التحذير السابق في `assets/js/app.js` متعلق بمسارات مباشرة قديمة لمندوبي المبيعات والبيانات المرجعية، وهو خارج نطاق هذه المرحلة ولم يتم لمسه.
