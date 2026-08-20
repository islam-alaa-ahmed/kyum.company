import fs from 'node:fs';
const migration=fs.readFileSync('supabase/migrations/phase_adv_02_advertising_reference_data.sql','utf8');
const html=fs.readFileSync('index.html','utf8');
const service=fs.readFileSync('assets/js/advertising-reference-service.js','utf8');
const module=fs.readFileSync('assets/js/advertising-reference-module.js','utf8');
const css=fs.readFileSync('assets/css/advertising-reference-data.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const offlinePolicy=fs.readFileSync('enterprise-offline-policy.json','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const tables=['adv_items','adv_item_categories','adv_units','adv_employees','adv_suppliers','adv_project_types','adv_expense_types','adv_payment_methods'];
const checks=[
 ['version',version.version==='18.54.17'],
 ['eight reference tables',tables.every(t=>migration.includes(`public.${t}`))],
 ['RLS permission matrix',migration.includes("has_screen_permission(''advertisingReferenceData'',''delete'')")&&migration.includes("has_screen_permission(''advertisingReferenceData'',''add'')")],
 ['item category/unit FK protection',migration.includes('category_id uuid references public.adv_item_categories')&&migration.includes('unit_id uuid references public.adv_units')],
 ['eight UI tabs',(html.match(/data-adv-ref-tab=/g)||[]).length===8],
 ['generic CRUD service',service.includes("KYUMOfflineQueue?.register?.('advertising_reference_data'")&&service.includes('async function save(')&&service.includes('async function remove(')],
 ['smart cache read path',service.includes('KYUMSmartCache')&&service.includes('allowStaleAnyAge:true')],
 ['offline dependency resolution',service.includes('findCreateOperationByLocalId')&&service.includes('resolveServerId')],
 ['delete permission client guard',service.includes("requireAction('delete')")&&module.includes("requireAction('delete')")],
 ['smart add item hook',module.includes('openAddItem')],
 ['activity tracking',service.includes('BusinessActivityService')&&module.includes('trackSearchInput')],
 ['visual owner isolated',css.includes('#advertisingReferenceDataView')&&css.includes('#advertisingReferenceDialog')],
 ['service worker contains new assets',sw.includes('advertising-reference-service.js')&&sw.includes('advertising-reference-data.css')],
 ['enterprise offline policy registered',offlinePolicy.includes('advertising_reference_data')&&offlinePolicy.includes('assets/js/advertising-reference-service.js')],
 ['ADV01 navigation retained',html.includes('data-nav-group="advertising-department"')&&html.includes('data-view="advertisingProjects"')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
