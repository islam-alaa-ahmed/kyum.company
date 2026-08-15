import fs from 'node:fs';
const style=fs.readFileSync('assets/css/style.css','utf8');
const canon=fs.readFileSync('assets/css/desktop-visual-identity-canonical.css','utf8');
const responsive=fs.readFileSync('assets/css/core-screens-responsive.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const checks=[
 ['desktop-only canonical',canon.includes('@media (min-width:1024px)')],
 ['header excluded',!canon.includes('#appHeader')&&!canon.includes('.topbar')],
 ['sidebar excluded',!canon.includes('.sidebar')],
 ['shared controls tokenized',style.includes('var(--control-border,var(--border))')&&style.includes('var(--control-bg,#fff)')],
 ['shared cards tokenized',style.includes('var(--stat-card-bg,var(--surface))')&&style.includes('var(--panel-bg,var(--surface))')],
 ['tables tokenized',style.includes('var(--table-card-bg,var(--surface))')&&style.includes('var(--table-head-bg,#f8fafc)')],
 ['actions tokenized',style.includes('var(--row-action-border,0)')&&style.includes('var(--edit-btn-bg,#eff6ff)')],
 ['legacy D1.1 property overlay removed',!canon.includes(':is(#dashboardView,#customersView,#followupsView) .primary-btn{')],
 ['semantic KPI icons',canon.includes('--kpi-icon:url("data:image/svg+xml')&&canon.includes('mask:center/contain no-repeat var(--kpi-icon)')],
 ['gold sparse emphasis',canon.includes('#dashboardView .stat-card:nth-child(4n+1)')],
 ['wide dashboard density owner updated',responsive.includes('repeat(6, minmax(0, 1fr))')],
 ['customers/followups table fidelity',canon.includes('tbody tr:nth-child(even)')&&canon.includes('inset -4px 0 0 var(--desk-blue)')],
 ['D1.2 stylesheet token',html.includes('desktop-visual-identity-canonical.css?v=18.53.84')],
 ['desktop CSS cached offline',sw.includes('./assets/css/desktop-visual-identity-canonical.css')],
 ['release cache token',sw.includes('kyum-crm-pwa-18-53-84-desktop-visual-fidelity-d1-2')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);
