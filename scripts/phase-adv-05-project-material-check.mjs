import fs from'node:fs';
const m=fs.readFileSync('supabase/migrations/phase_adv_05_project_material_issue_returns.sql','utf8'),s=fs.readFileSync('assets/js/advertising-material-service.js','utf8'),u=fs.readFileSync('assets/js/advertising-material-module.js','utf8'),h=fs.readFileSync('index.html','utf8'),i=fs.readFileSync('assets/js/advertising-inventory-module.js','utf8'),r=fs.readFileSync('assets/js/advertising-reference-module.js','utf8'),p=JSON.parse(fs.readFileSync('enterprise-offline-policy.json','utf8'));
const c=[
['project cost ledger',m.includes('create table if not exists public.adv_project_cost_entries')],
['inventory project link',m.includes('add column if not exists project_id')],
['issue rpc',m.includes('adv_post_project_material_issue')],
['issue current average cost',m.includes('v_cost:=round(v_balance.average_cost,4)')],
['stock negative guard',m.includes('الكمية المطلوبة أكبر من الرصيد المتاح')],
['open project guard',m.includes('adv_material_assert_project_open')&&m.includes('financial_closed_at')],
['return original issue cost',m.includes("v_issue.unit_cost")&&m.includes("'inventory_return'")],
['return quantity guard',m.includes('v_returnable:=v_issue.quantity-v_already_returned')],
['atomic cost entries',m.includes("'inventory_issue'")&&m.includes("'inventory_return'")],
['controlled material reversal',m.includes('adv_reverse_project_material_transaction')&&m.includes('update public.adv_project_cost_entries set is_reversed=true')],
['generic inventory reversal blocked',m.includes('حركات مواد المشاريع يتم عكسها من شاشة صرف المواد فقط')],
['material read RLS',m.includes("advertisingMaterialIssue','view'")],
['server authoritative posting',s.includes('يحتاج اتصالًا بالخادم')&&!s.includes("KYUMOfflineQueue?.enqueue")],
['smart cache',s.includes('KYUMSmartCache')],
['UI issue and return',h.includes('advertisingMaterialIssueDialog')&&h.includes('advertisingMaterialReturnDialog')],
['smart add item',u.includes('openAddItem')&&r.includes('advertising-reference-saved')],
['inventory screen routes project reversal',i.includes('من شاشة صرف المواد')],
['search activity',u.includes('trackSearchInput')],
['policy',p.domains?.advertising_material_issue?.status==='compliant']
];let f=0;for(const[n,o]of c){console.log((o?'PASS':'FAIL'),n);if(!o)f++}console.log(`${c.length-f}/${c.length} PASS`);process.exitCode=f?1:0;