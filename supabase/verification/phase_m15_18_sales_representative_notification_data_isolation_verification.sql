-- Phase M15.18 verification — READ ONLY

-- 1) Helper functions exist.
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('notification_scope_representative_id','notification_is_visible_to_user','emit_notification_event')
order by p.proname;

-- 2) Notification policies must contain the visibility gate.
select policyname,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename='notifications'
order by policyname;

-- 3) Detect any still-visible cross-owner rows for active sales reps.
-- Expected: 0.
select count(*) as cross_representative_notifications_visible
from public.notifications n
join public.user_profiles up on up.id=n.user_id
where up.role::text='sales_representative'
  and coalesce(up.is_active,true)=true
  and public.notification_is_visible_to_user(up.id,n.request_id,n.visit_id,n.metadata)=false;

-- 4) Pending Push rows that violate Sales Representative scope.
-- Expected: 0.
select count(*) as leaked_pending_push_rows
from public.notification_push_outbox o
join public.notifications n on n.id=o.notification_id
join public.user_profiles up on up.id=n.user_id
where up.role::text='sales_representative'
  and o.status='pending'
  and public.notification_is_visible_to_user(up.id,n.request_id,n.visit_id,n.metadata)=false;
