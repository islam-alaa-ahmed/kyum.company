# Phase M14.9.1.3 — Active Request Start Gate, Timeline Durations & Strict Team Scope

## Root Cause
زر بدء التنفيذ كان يغيّر الحالة مباشرة إلى «في الطريق»، لذلك كانت مرحلة بدء التحرك تعتبر منفذة قبل ضغط المستخدم عليها. كما أن شاشة التنفيذ كانت تعتمد على نطاق المندوب فقط ولم يكن هناك Team Scope صريح مستقل يمنع فرق التركيبات من قراءة طلبات فرق أخرى.

## Scope
- اختيار الطلب الحالي بدون بدء أي مرحلة.
- تسجيل وقت فتح خرائط Google كمرحلة مستقلة.
- عرض وقت كل مرحلة والمدة بين المراحل.
- نقل الطلب المكتمل إلى محاضر التركيبات.
- Team Scope صارم عبر RLS وRPC.

## Version
- Version: 18.39.3
- Build: 183903
- Cache Token: kyum-crm-pwa-18-39-3-m14-9-1-3-active-request-timeline-team-scope

## Database
Run `supabase/migrations/phase_m14_9_1_3_active_request_timeline_team_scope.sql`, then the verification SQL.

## Regression
No changes to customer-management permissions, representative scopes, scheduling data, offline queue, or Smart Sync.
