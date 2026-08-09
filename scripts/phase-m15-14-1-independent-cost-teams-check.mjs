import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const html=read('index.html');
const js=read('assets/js/installation-costs.js');
const svc=read('assets/js/installations-service.js');
const sql=read('supabase/migrations/phase_m15_14_1_independent_cost_technicians_teams.sql');
const checks=[
  ['annual tab', html.includes('data-cost-mode="annual"') && html.includes('تكلفة السنة')],
  ['monthly tab', html.includes('data-cost-mode="monthly"') && html.includes('تكلفة الشهور')],
  ['manual technician controls', html.includes('addInstallationCostTechnicianBtn') && js.includes('saveInstallationCostTechnician') && js.includes('removeInstallationCostTechnician')],
  ['manual team controls', html.includes('addInstallationCostTeamBtn') && html.includes('installationCostTeamMembersDialog') && js.includes('saveInstallationCostTeamMembers')],
  ['team cards use active mode cost', js.includes('techTotal(t,m)') && js.includes('installationCostTeamsGrid')],
  ['workspace uses independent technicians', svc.includes("from('installation_cost_technicians')") && !svc.includes("rpc('get_installation_cost_technicians')")],
  ['workspace uses independent teams', svc.includes("from('installation_cost_teams')") && svc.includes("from('installation_cost_team_members')")],
  ['stable technician ids in cost facts', svc.includes('technician_id:payload.technicianId') && sql.includes('add column if not exists technician_id uuid')],
  ['permission driven RLS', sql.includes("has_screen_permission(''installationCosts'',''view'')") && sql.includes('installation_cost_team_members')],
  ['version 18.53.41', read('version.json').includes('18.53.41') && read('assets/js/pwa.js').includes('18.53.41') && read('service-worker.js').includes('18-53-41-independent-cost-technicians-teams-m15-14-1')]
];
let fail=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail)process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
