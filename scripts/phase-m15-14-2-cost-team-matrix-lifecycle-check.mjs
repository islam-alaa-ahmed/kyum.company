import fs from 'node:fs';
const root=new URL('../',import.meta.url).pathname;
const read=p=>fs.readFileSync(root+p,'utf8');
const app=read('assets/js/installation-costs.js');
const svc=read('assets/js/installations-service.js');
const html=read('index.html');
const sql=read('supabase/migrations/phase_m15_14_2_cost_center_reporting_team_matrix_employee_lifecycle.sql');
const checks=[
 ['annual helper removed',!app.includes('شهري افتراضي:')],
 ['monthly source helper removed',!app.includes('من السنوي:')],
 ['totals row exists',app.includes('installation-cost-total-row')],
 ['single matrix manager',html.includes('manageInstallationCostTeamMembersBtn')&&!app.includes('data-cost-team-members=')],
 ['matrix supports multi team',app.includes('data-cost-matrix-check')&&app.includes('new Set()')],
 ['employee lifecycle action',app.includes('data-cost-tech-toggle')&&svc.includes('toggleInstallationCostTechnician')],
 ['departure date persisted',sql.includes('inactive_at date')&&sql.includes('toggle_installation_cost_technician')],
 ['many-to-many unique pair',sql.includes('ux_installation_cost_team_members_pair')],
 ['version consistent',read('version.json').includes('18.53.42')&&read('assets/js/pwa.js').includes('18.53.42')&&html.includes('v=18.53.42')]
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++}if(bad)process.exit(1);
