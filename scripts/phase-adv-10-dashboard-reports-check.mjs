import fs from 'node:fs';
const m=fs.readFileSync('supabase/migrations/phase_adv_10_dashboard_reports.sql','utf8');
const s=fs.readFileSync('assets/js/advertising-reporting-service.js','utf8');
const u=fs.readFileSync('assets/js/advertising-reporting-module.js','utf8');
const h=fs.readFileSync('index.html','utf8');
const c=[
['dashboard rpc',m.includes('adv_dashboard_snapshot')],
['reports rpc',m.includes('adv_reports_snapshot')],
['dashboard permission',m.includes("advertisingDashboard','view'")],
['reports permission',m.includes("advertisingReports','view'")],
['canonical profitability',m.includes('adv_project_profitability')],
['canonical inventory',m.includes('adv_inventory_balances')],
['canonical custody',m.includes('adv_custody_transactions')],
['canonical purchases',m.includes('adv_purchases')],
['canonical expenses',m.includes('adv_project_expenses')],
['canonical materials',m.includes('adv_inventory_transactions')],
['smart cache',s.includes('KYUMSmartCache')],
['export permission',s.includes("can(REPORTS,'export')")],
['csv export',s.includes('text/csv')],
['dashboard UI',h.includes('advertisingDashTopProfit')],
['reports UI',h.includes('advertisingReportsBody')],
['report filters',u.includes('advertisingReportFrom')&&u.includes('advertisingReportTo')],
['report tabs',u.includes("tab==='projects'")&&u.includes("tab==='inventory'")],
['search audit',u.includes('trackSearchInput')]
];let f=0;for(const[n,o]of c){console.log(o?'PASS':'FAIL',n);if(!o)f++}console.log(`${c.length-f}/${c.length} PASS`);process.exitCode=f?1:0;
