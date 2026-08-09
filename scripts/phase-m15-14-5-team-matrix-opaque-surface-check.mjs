import fs from 'node:fs';
const css=fs.readFileSync('assets/css/installation-costs.css','utf8');
const idx=fs.readFileSync('index.html','utf8');
const pwa=fs.readFileSync('assets/js/pwa.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const ver=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
  ['scoped dialog surface', css.includes('.installation-cost-matrix-dialog .dialog-shell') && css.includes('background:var(--surface,#ffffff)!important')],
  ['opaque body cells', css.includes('.installation-cost-matrix-dialog .installation-cost-matrix tbody td')],
  ['alternating rows', css.includes('tbody tr:nth-child(even) td')],
  ['dark mode surface', css.includes('html[data-theme="dark"] .installation-cost-matrix-dialog')],
  ['no blur on shell', css.includes('backdrop-filter:none!important')],
  ['index version', idx.includes('18.53.45')],
  ['pwa version', pwa.includes('18.53.45')],
  ['service worker cache token', sw.includes('18-53-45-team-matrix-opaque-surface-m15-14-5')],
  ['version json', ver.version==='18.53.45' && ver.build===185345]
];
let fail=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fail++;}
if(fail) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
