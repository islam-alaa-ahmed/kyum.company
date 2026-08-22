import fs from'node:fs';
const m=fs.readFileSync('supabase/migrations/phase_adv_06_employee_custody_ledger.sql','utf8'),s=fs.readFileSync('assets/js/advertising-custody-service.js','utf8'),u=fs.readFileSync('assets/js/advertising-custody-module.js','utf8'),h=fs.readFileSync('index.html','utf8'),p=JSON.parse(fs.readFileSync('enterprise-offline-policy.json','utf8'));
const c=[
['custody accounts',m.includes('create table if not exists public.adv_custody_accounts')],
['custody ledger',m.includes('create table if not exists public.adv_custody_transactions')],
['employee custody gate',m.includes('can_have_custody')],
['server balance nonnegative',m.includes('current_balance numeric')&&m.includes('رصيد العهدة غير كافٍ')],
['atomic custody rpc',m.includes('create or replace function public.adv_custody_post')],
['direct project open guard',m.includes("project_direct_payment")&&m.includes("المشروع مغلق ماليًا")],
['direct project cost entry',m.includes("'custody_direct_payment'")&&m.includes('adv_project_cost_entries')],
['controlled reversal',m.includes('adv_reverse_custody_transaction')&&m.includes('is_reversed=true')],
['reversal cost rollback',m.includes("source_type='custody_direct_payment'")&&m.includes('-v_cost.amount')],
['permission add delete',m.includes("adv_custody_assert_permission('add')")&&m.includes("adv_custody_assert_permission('delete')")],
['no direct writes',m.includes('revoke insert,update,delete on public.adv_custody_accounts')],
['cached reads',s.includes('KYUMSmartCache')],
['offline posting blocked',s.includes('يحتاج اتصالًا بالخادم')&&!s.includes('KYUMOfflineQueue?.enqueue')],
['custody UI',h.includes('advertisingCustodyAccountsBody')&&h.includes('advertisingCustodyDialog')],
['purchases deferred',h.includes('المشتريات — المرحلة التالية')],
['smart item add',u.includes('openAddItem')&&u.includes('advertising-reference-saved')],
['search tracking',u.includes('trackSearchInput')],
['policy',p.domains?.advertising_custody?.status==='compliant']
];let f=0;for(const[n,o]of c){console.log((o?'PASS':'FAIL'),n);if(!o)f++}console.log(`${c.length-f}/${c.length} PASS`);process.exitCode=f?1:0;