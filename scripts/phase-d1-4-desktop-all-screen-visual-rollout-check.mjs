import fs from 'node:fs';

const style=fs.readFileSync('assets/css/style.css','utf8');
const canonical=fs.readFileSync('assets/css/desktop-visual-identity-canonical.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));

const checks=[
 ['legacy stack isolated below desktop',style.includes('@media (max-width:1023px) {') && style.includes('Phase 17.8.5 — Typography Theme System')],
 ['desktop legacy ownership removal documented',style.includes('Legacy general visual layers 17.8.5–17.8.9 removed from Desktop in D1.4')],
 ['single remaining desktop owner',style.includes('Phase 17.9 / D1.4 — Canonical Remaining Desktop Content Owner')],
 ['desktop scope present',style.includes('@media (min-width:1024px)')],
 ['remaining screens exclude header',style.includes(':not(#appHeader):not(#dashboardView):not(#customersView):not(#followupsView)')],
 ['premium card glass',style.includes('radial-gradient(circle at 92% -14%')],
 ['premium KPI glass',style.includes('radial-gradient(circle at 10% 108%')],
 ['premium table hover',style.includes('box-shadow:inset -4px 0 0 #2f83ff')],
 ['dark option background',style.includes('--option-bg:#081930')],
 ['badge shared owner tokenized',style.includes('white-space:var(--badge-white-space,normal)')],
 ['customer badge nowrap',canonical.includes('--badge-white-space:nowrap')],
 ['customer badge min content',canonical.includes('--badge-min-width:max-content')],
 ['customer classification column protected',canonical.includes('min-width:92px')],
 ['header not targeted in D1 owner',!canonical.includes('#appHeader')],
 ['sidebar not targeted in D1 owner',!canonical.includes('.sidebar')],
 ['cache link updated',html.includes('desktop-visual-identity-canonical.css?v=18.53.86')],
 ['version updated',version.version==='18.53.86' && version.build===185386]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok) failed++;
}
if(failed) process.exit(1);
