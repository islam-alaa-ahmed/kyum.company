import fs from 'node:fs';
const css=fs.readFileSync('assets/css/mobile-theme-canonical.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['phase marker',css.includes('M15.31.4 reports + analytics mobile identity')],
 ['opposite-side icon container',css.includes('inset-inline-end:12px')],
 ['opposite-side semantic svg',css.includes('inset-inline-end:19px')],
 ['reports KPI semantic mapping',css.includes('#reportsOverviewView .executive-kpi-card:nth-child(8)')],
 ['daily performance semantic mapping',css.includes('#dailyPerformanceReportView .daily-performance-kpis.expanded>article:nth-child(6)')],
 ['installation reports semantic mapping',css.includes('#installationReportsView .installation-report-kpis>article:nth-child(9)')],
 ['installation summary semantic mapping',css.includes('#installationReportsView .installation-summary-kpis>article:nth-child(7)')],
 ['reports views preserved',html.includes('id="reportsOverviewView"')&&html.includes('id="installationReportsView"')&&html.includes('id="dailyPerformanceReportView"')],
 ['version cache ref',html.includes('18.53.80')]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok) failed++;}
if(failed) process.exit(1);
