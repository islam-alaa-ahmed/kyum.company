# Phase M14.1 — Installations Module Foundation

## Root Cause
لم يكن المشروع يحتوي على Navigation Group أو View أو Screen Permission خاص بوحدة التركيبات. إضافة زر منفرد دون تسجيله داخل views ومحرك الصلاحيات كانت ستؤدي إلى Unknown View أو إخفاء القسم للمستخدمين وعدم عمله Offline.

## Scope
- إضافة قسم رئيسي «إدارة التركيبات» أسفل «إدارة العملاء».
- إضافة شاشة «لوحة التركيبات» كبنية تأسيسية للوحدة.
- توثيق الوحدات التشغيلية ودورة العمل داخل الشاشة دون إنشاء بيانات وهمية.
- ربط الشاشة بالتنقل وPage Meta ومحرك الصلاحيات.
- إضافة Migration لتسجيل الشاشة ومنح Super Admin كامل الصلاحيات.
- تسجيل CSS الجديد داخل Offline App Shell.
- دعم Mobile وTablet وLaptop وDesktop وWide Desktop وLight/Dark Mode.

## Out of Scope
- إنشاء جداول طلبات التركيبات أو الفنيين.
- تعديل Supabase tables القائمة أو RLS الحالية.
- إنشاء CRUD أو Smart Sync قبل اعتماد حقول دورة التشغيل.
- تغيير Business Logic للعملاء أو عروض الأسعار.

## Version
- Version: 18.24.0
- Build: 182400
- Cache Token: kyum-crm-pwa-18-24-0-m14-1

## Files Modified
- index.html
- assets/css/installations-foundation.css
- assets/js/app.js
- assets/js/permission-engine.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_1_installations_module_foundation.sql
- supabase/verification/phase_m14_1_installations_module_foundation_verification.sql
- PHASE_REPORT.md

## Regression Notes
لم يتم تعديل خدمات العملاء أو المتابعات أو عروض الأسعار أو Offline Queue أو Smart Sync أو Mobile Shell. تم الإضافة بصورة تراكمية فوق Baseline 18.23.0.

## Validation Report
- JavaScript syntax: PASS.
- CSS brace validation: PASS.
- Duplicate HTML IDs: 0.
- Navigation/View/Page Meta integration: PASS.
- Permission Engine group integration: PASS.
- Version and Cache Token synchronization: PASS.
- Dashboard Offline Certification: PASS.
- Offline Runtime Reliability: PASS; all 50 local CSS/JS assets registered.
- Cache-first Connectivity: 15/15 PASS.
- Sync Queue Recovery: 13/13 PASS.
- Remaining Modules Offline Integration: PASS.
- Offline Write Completion: 10/10 PASS.
- Full Enterprise Offline Certification: PASS WITH the same previously documented direct-data-path warning in assets/js/app.js.
