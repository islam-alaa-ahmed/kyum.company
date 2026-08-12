const fs = require('fs');
const p = 'supabase/migrations/phase_m15_25_suggested_customers_strict_rotation_cycle.sql';
const sql = fs.readFileSync(p, 'utf8');
const checks = [
  ['cycle floor', sql.includes('v_cycle_floor')],
  ['hard floor eligibility', sql.includes('e.exposure_count = v_cycle_floor')],
  ['same-day suggestion guard', sql.includes('today.suggestion_date = p_suggestion_date')],
  ['same-day followup guard', sql.includes('f.contact_date = p_suggestion_date')],
  ['representative scope', sql.includes('c.representative_id = v_linked_representative_id')],
  ['company/individual quotas', sql.includes("array['شركة'::text, 'فردي'::text]")],
  ['no quotation identity join', !/join\s+public\.quotations/i.test(sql)],
  ['no invoice identity join', !/join\s+public\.[a-z_]*invoices/i.test(sql)],
  ['no request identity join', !/join\s+public\.customer_requests/i.test(sql)]
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
