import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = rel => fs.readFileSync(new URL(rel, root), 'utf8');
const app = read('assets/js/app.js');
const service = read('assets/js/installations-service.js');
const moduleJs = read('assets/js/installations-module.js');
const migration = read('supabase/migrations/phase_m15_16_accepted_quotation_installation_scheduling_handoff.sql');
const checks = [
  ['quotations hide converted rows', app.includes('if (item.installationRequestId) return false')],
  ['installation create requires quotation in service', service.includes(`if(!payload.quotationId)throw new Error('لا يمكن إنشاء طلب تركيب بدون عرض سعر مقبول. اختر عرض السعر المقبول أولًا.')`)],
  ['new form requires accepted quotation', moduleJs.includes('لا يمكن إنشاء طلب تركيب إلا من عرض سعر مقبول.')],
  ['new form navigates to scheduling', moduleJs.includes('KYUMNavigation?.open?.("installationSchedule"')],
  ['create event updates quotation screen state', app.includes('kyum-installation-request-created')],
  ['database rejects missing quotation', migration.includes('if p_quotation_id is null then')],
  ['database enforces accepted quotation', migration.includes("if v_quotation.status <> 'مقبول' then")],
  ['database links quotation to created request', migration.includes('installation_request_id = v_request_id')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`${checks.length-failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
