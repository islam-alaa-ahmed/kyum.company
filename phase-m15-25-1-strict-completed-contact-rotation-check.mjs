import fs from 'node:fs';
const migration = fs.readFileSync(new URL('../supabase/migrations/phase_m15_25_1_strict_completed_contact_rotation_fix.sql', import.meta.url), 'utf8');
const checks = [
  ['completed-only counter', /filter\s*\(where\s+hist\.status\s*=\s*'completed'\)/i.test(migration)],
  ['cycle floor guard', /cs\.completed_count\s*=\s*v_cycle_floor/i.test(migration)],
  ['floor includes active-today customers', /calculate the cycle floor across ALL eligible customers/i.test(migration)],
  ['same-day duplicate blocked', /today\.suggestion_date\s*=\s*p_suggestion_date/i.test(migration)],
  ['customer id canonical identity', /c\.id as customer_id/i.test(migration)],
  ['quotation absent', !/\bquotations?\b/i.test(migration.replace(/^--.*$/gm, ''))],
  ['invoice absent', !/\binvoices?\b/i.test(migration.replace(/^--.*$/gm, ''))],
  ['request identity absent', !/\bcustomer_requests\b/i.test(migration.replace(/^--.*$/gm, ''))],
  ['phone required', /c\.phone is not null[\s\S]*btrim\(c\.phone\) <> ''/i.test(migration)]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
