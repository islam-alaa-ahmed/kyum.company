# Phase M14.9.1.5 — Execution History Classification Recovery

## Root Cause
طلبات قديمة لها حركات تنفيذ فعلية عادت إلى قائمة طلبات اليوم لأن التصنيف اعتمد على selected_for_execution_at فقط، بينما السجلات القديمة قد تحتوي على on_route_at/map_opened_at/arrived_at/started_at أو حالة تشغيل بدون علامة الاختيار الجديدة.

## Fix
- أي طلب به حركة تنفيذ أو حالة تشغيل لا يظهر في طلبات اليوم.
- الطلب غير المكتمل يظهر في الطلب الحالي ويستكمل من آخر مرحلة محفوظة.
- الطلب المكتمل يظل في محاضر التركيبات.
- لم يتم مسح أو إعادة تعيين أي Timestamp أو History.
- المستخدم لا يرى إلا طلبات الفرق المسموح بها عبر RLS وcan_access_installation_team.

## Version
- Version: 18.39.5
- Build: 183905
- Cache Token: kyum-crm-pwa-18-39-5-m14-9-1-5-execution-history-recovery

## Modified Files
- assets/js/installation-execution.js
- assets/js/installations-service.js
- assets/js/pwa.js
- index.html
- service-worker.js
- package.json
- version.json
- supabase/migrations/phase_m14_9_1_5_execution_history_recovery.sql
- supabase/verification/phase_m14_9_1_5_execution_history_recovery_verification.sql

## Regression
- Strict Team Scope preserved.
- New request start gate preserved.
- Timeline timestamps preserved.
- Completion routing unchanged.
- Offline queue and Smart Sync unchanged.
