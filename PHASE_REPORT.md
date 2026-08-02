# Phase M14.9.0.1 — Daily Details Dialog Position & Light Mode Hotfix

## Root Cause
نافذة تفاصيل اليوم لم تكن تملك قواعد تمركز مستقلة، فتأثرت بقيود `dialog` العامة وظهرت كمساحة عريضة ممتدة مع انحياز محتوى الفرق. كما لم تكن هناك قواعد Light Mode صريحة للنافذة الجديدة وبطاقاتها.

## Scope
- تثبيت النافذة في منتصف الشاشة داخل Top Layer.
- منع امتداد الـDialog نفسه بعرض الصفحة.
- الحفاظ على عرض ديناميكي حتى 1500px حسب مساحة الشاشة.
- ضبط Light Mode للسطح والعناوين والبطاقات والحدود والأزرار.
- الحفاظ على التقسيم الديناميكي حسب عدد الفرق.
- عدم تعديل البيانات أو منطق التقويم أو الإجراءات.

## Version
- Version: 18.38.1
- Build: 183801
- Cache Token: `kyum-crm-pwa-18-38-1-m14-9-0-1-day-dialog-ui-hotfix`

## Modified Files
- `assets/css/installation-scheduling.css`
- `index.html`
- `assets/js/pwa.js`
- `service-worker.js`
- `package.json`
- `version.json`
- `PHASE_REPORT.md`
