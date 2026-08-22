import fs from 'node:fs';
const m = fs.readFileSync('supabase/migrations/phase_adv_09_profitability_financial_close.sql','utf8');
const s = fs.readFileSync('assets/js/advertising-profitability-service.js','utf8');
const u = fs.readFileSync('assets/js/advertising-profitability-module.js','utf8');
const h = fs.readFileSync('index.html','utf8');
const checks = [
  ['profitability view', m.includes('adv_project_profitability')],
  ['material cost', m.includes("cost_type='material'")],
  ['direct purchase', m.includes("cost_type='direct_purchase'")],
  ['expenses', m.includes("cost_type='expense'")],
  ['profit formula', m.includes('p.selling_value-coalesce(c.actual_cost,0)')],
  ['margin', m.includes('margin_pct')],
  ['variance', m.includes('cost_variance')],
  ['close completed only', m.includes("v_project.status<>'مكتمل'")],
  ['close snapshot', m.includes('financial_closed_profit=v_profit.profit')],
  ['reopen reason', m.includes('سبب إعادة فتح المشروع ماليًا مطلوب')],
  ['audit history', m.includes('adv_project_financial_close_history')],
  ['permission edit', m.includes("adv_project_financial_assert_permission('edit')")],
  ['cached reads', s.includes('KYUMSmartCache')],
  ['offline close blocked', s.includes('يحتاجان اتصالًا بالخادم')],
  ['search audit', u.includes('trackSearchInput')],
  ['UI', h.includes('advertisingProfitabilityBody') && h.includes('advertisingProfitabilityTab')]
];
let failures=0;
for (const [name,ok] of checks) { console.log(ok?'PASS':'FAIL',name); if(!ok) failures++; }
console.log(`${checks.length-failures}/${checks.length} PASS`);
process.exitCode=failures?1:0;
