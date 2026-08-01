# Phase M14.8.3 — Installation Settings Screen & Sidebar Navigation Recovery

## Root Cause
- مجموعة إدارة التركيبات تحتوي تسعة عناصر، بينما `nav-group-content` كانت محددة بارتفاع ثابت، فتختفي العناصر الأخيرة وتتداخل المجموعة مع الأقسام التالية.
- شاشة إعدادات التركيبات القديمة كانت نموذج إعدادات تشغيل عام، ولا تدير البيانات المرجعية الفعلية المطلوبة لإنشاء الطلب.
- جدول الخدمات لم يحتوِ تكلفة، ولم يوجد كيان مستقل لفرق التركيبات، والأحياء لم تحتوِ المدينة والمنطقة.

## Scope
- إصلاح تمرير وتنسيق مجموعة إدارة التركيبات وإظهار إعدادات التركيبات كآخر عنصر.
- استبدال محتوى الشاشة بثلاث قوائم منسدلة: الخدمات، فرق التركيبات، الأحياء.
- CRUD والصلاحيات للخدمات والفرق والأحياء.
- إضافة السعر والتكلفة للخدمات، وبيانات الفريق، والمدينة والمنطقة للأحياء.

## Version
- Version: 18.33.0
- Build: 183300
- Cache Token: kyum-crm-pwa-18-33-0-m14-8-3-settings-navigation

## Modified Files
- index.html
- assets/css/installation-dashboard-settings.css
- assets/js/installations-service.js
- assets/js/installation-settings-management.js
- assets/js/pwa.js
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_8_3_installation_settings_navigation_recovery.sql
- supabase/verification/phase_m14_8_3_installation_settings_navigation_verification.sql

## Regression Boundary
No customer, quotation, scheduling, execution, completion, offline queue, smart sync, or RLS visibility logic was changed outside installation settings reference-data management.
