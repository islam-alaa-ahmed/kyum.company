import fs from 'node:fs';
const m=fs.readFileSync('supabase/migrations/phase_adv_07_purchases.sql','utf8');
const s=fs.readFileSync('assets/js/advertising-purchases-service.js','utf8');
const h=fs.readFileSync('index.html','utf8');
const c=[
['headers',m.includes('adv_purchases')],
['lines',m.includes('adv_purchase_lines')],
['atomic post',m.includes('adv_post_purchase')],
['weighted average',m.includes('v_new_avg')],
['inventory linkage',m.includes("'purchase',v_purchase.id")],
['project cost',m.includes("'direct_purchase','purchase'")],
['custody debit',m.includes("'settlement_decrease'")],
['open project guard',m.includes('المشروع مغلق ماليًا')],
['reversal',m.includes('adv_reverse_purchase')],
['permissions',m.includes("adv_custody_assert_permission('delete')")],
['offline post blocked',s.includes('يحتاج اتصالًا بالخادم')],
['purchase UI',h.includes('advertisingPurchasesPane')&&h.includes('advertisingPurchaseDialog')]
];
let f=0;for(const [n,o] of c){console.log(o?'PASS':'FAIL',n);if(!o)f++}
console.log(`${c.length-f}/${c.length} PASS`);process.exitCode=f?1:0;
