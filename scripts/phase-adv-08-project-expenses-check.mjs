import fs from'node:fs';
const m=fs.readFileSync('supabase/migrations/phase_adv_08_project_expenses.sql','utf8'),s=fs.readFileSync('assets/js/advertising-expenses-service.js','utf8'),u=fs.readFileSync('assets/js/advertising-expenses-module.js','utf8'),c=fs.readFileSync('assets/js/advertising-custody-module.js','utf8'),h=fs.readFileSync('index.html','utf8'),p=JSON.parse(fs.readFileSync('enterprise-offline-policy.json','utf8'));
const x=[
['expense table',m.includes('create table if not exists public.adv_project_expenses')],
['atomic post',m.includes('adv_post_project_expense')],
['project open guard',m.includes('المشروع مغلق ماليًا ولا يمكن إضافة مصروفات عليه')],
['expense type master',m.includes('adv_expense_types')],
['project cost entry',m.includes("'expense','project_expense'")],
['custody payment',m.includes("'project_expense_payment'")],
['custody balance guard',m.includes('رصيد العهدة غير كافٍ')],
['controlled reverse',m.includes('adv_reverse_project_expense')],
['cost rollback',m.includes("'project_expense_reversal'")&&m.includes('-v_cost.amount')],
['custody rollback',m.includes('current_balance=current_balance+v_expense.amount')],
['generic custody reverse blocked',m.includes('يتم عكسها من شاشة مصروفات المشروع فقط')],
['UI owner route',h.includes('advertisingExpensesBody')&&h.includes('advertisingExpenseDialog')],
['custody UI owner guard',c.includes('من مصروفات المشروع')],
['cached reads',s.includes('KYUMSmartCache')],
['offline posting blocked',s.includes('يحتاج اتصالًا بالخادم')],
['search audit',u.includes('trackSearchInput')],
['policy',p.domains?.advertising_project_expenses?.status==='compliant']
];let f=0;for(const[n,o]of x){console.log(o?'PASS':'FAIL',n);if(!o)f++}console.log(`${x.length-f}/${x.length} PASS`);process.exitCode=f?1:0;