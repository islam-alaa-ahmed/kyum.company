import fs from 'node:fs';
const m=fs.readFileSync('supabase/migrations/phase_adv_11_final_integration_certification.sql','utf8');
const v=JSON.parse(fs.readFileSync('version.json','utf8'));
const h=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

const checks=[
  ['version 18.54.26',v.version==='18.54.26'&&v.build===185426],
  ['profitability sums immutable deltas',m.includes('coalesce(sum(amount),0)')&&!m.includes("sum(amount) filter (where not is_reversed)")],
  ['material delta category',m.includes("filter (where cost_type='material')")],
  ['direct purchase delta category',m.includes("filter (where cost_type='direct_purchase')")],
  ['expense delta category',m.includes("filter (where cost_type='expense')")],
  ['purchase source uniqueness excludes purchase',m.includes("source_type <> 'purchase'")],
  ['close canonical flag',m.includes("set_config('app.adv_financial_close_rpc','on',true)")],
  ['reopen canonical flag',m.includes("set_config('app.adv_financial_reopen_rpc','on',true)")],
  ['trigger blocks direct close',m.includes('الإغلاق المالي يتم فقط من الإجراء المالي المعتمد')],
  ['trigger blocks direct reopen',m.includes('إعادة فتح المشروع ماليًا تتم فقط من الإجراء المالي المعتمد')],
  ['trigger blocks manual snapshot edits',m.includes('حقول الإغلاق المالي تُدار تلقائيًا')],
  ['closed operational immutability retained',m.includes('المشروع مغلق ماليًا ولا يمكن تعديل بياناته التشغيلية')],
  ['close only completed retained',m.includes("v_project.status<>'مكتمل'")],
  ['reopen reason retained',m.includes('سبب إعادة فتح المشروع ماليًا مطلوب')],
  ['all local assets bumped',!h.includes('?v=18.54.25')],
  ['service worker final token',sw.includes('18-54-26-final-integration-adv-11')]
];
let failures=0;
for(const [name,ok] of checks){console.log(ok?'PASS':'FAIL',name);if(!ok)failures++}
console.log(`${checks.length-failures}/${checks.length} PASS`);
process.exitCode=failures?1:0;
