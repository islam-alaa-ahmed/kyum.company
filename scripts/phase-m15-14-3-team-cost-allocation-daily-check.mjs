import fs from 'node:fs';
const root=new URL('../', import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const js=read('assets/js/installation-costs.js');
const html=read('index.html');
const ver=JSON.parse(read('version.json'));
const checks=[
 ['allocation helper',js.includes('allocatedTechTotal')&&js.includes('membershipCount')],
 ['team allocation',js.includes('members.reduce((s,t)=>s+allocatedTechTotal(t,m),0)')],
 ['daily helper',js.includes('function dailyCost')&&js.includes('function periodDays')],
 ['daily KPI html',html.includes('installationCostsKpiDay')],
 ['team daily footer',js.includes('installation-cost-team-daily')],
 ['version',ver.version==='18.53.43'&&html.includes('18.53.43')]
];
for(const [n,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${n}`);
if(checks.some(([,ok])=>!ok)) process.exit(1);
