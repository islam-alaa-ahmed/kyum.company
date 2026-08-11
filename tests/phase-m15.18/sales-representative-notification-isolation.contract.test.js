const fs=require('fs');
const assert=require('assert');
const sql=fs.readFileSync('supabase/migrations/phase_m15_18_sales_representative_notification_data_isolation.sql','utf8');
const checks=[
  ['scope helper',/notification_scope_representative_id/],
  ['visibility helper',/notification_is_visible_to_user/],
  ['sales representative hard scope',/sales_representative/],
  ['request/customer representative resolution',/coalesce\(c\.representative_id,r\.representative_id\)/],
  ['generation gate',/if not public\.notification_is_visible_to_user/],
  ['select policy gate',/create policy "notifications own select"[\s\S]*notification_is_visible_to_user/],
  ['push pending cleanup',/notification_push_outbox[\s\S]*o\.status='pending'/],
  ['matrix preserved',/notification_event_recipient_rules/]
];
for(const [name,re] of checks){assert(re.test(sql),`FAIL: ${name}`);console.log(`PASS: ${name}`)}
console.log(`PASS ${checks.length}/${checks.length}`);
