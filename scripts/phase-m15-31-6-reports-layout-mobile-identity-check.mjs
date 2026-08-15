import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const canonical = read('assets/css/mobile-theme-canonical.css');
const mobile = read('assets/css/mobile.css');
const index = read('index.html');
const sw = read('service-worker.js');
const pwa = read('assets/js/pwa.js');
const version = JSON.parse(read('version.json'));

const checks = [
  ['version bumped', version.version === '18.53.82' && version.build === 185382],
  ['cache token synchronized', version.cacheToken === 'kyum-crm-pwa-18-53-82-reports-layout-mobile-identity-m15-31-6' && sw.includes(version.cacheToken)],
  ['pwa version synchronized', pwa.includes('const CURRENT_VERSION = "18.53.82"')],
  ['index cache bust synchronized', index.includes('mobile-theme-canonical.css?v=18.53.82') && index.includes('app.js?v=18.53.82')],
  ['executive KPI canonical contract', canonical.includes('#reportsOverviewView .executive-kpi-card .kpi-card-head{') && canonical.includes('grid-template-columns:minmax(0,1fr) auto!important')],
  ['delta reset from absolute positioning', canonical.includes('#reportsOverviewView .executive-kpi-card .kpi-delta{') && canonical.includes('position:static!important;inset:auto!important')],
  ['top customers explicit grid contract', canonical.includes('#reportsOverviewView .top-customer-item{') && canonical.includes('grid-template-columns:34px minmax(0,1fr) minmax(86px,auto)!important')],
  ['small mobile top customer fallback', canonical.includes('#reportsOverviewView .top-customer-item>b{grid-column:2!important')],
  ['remaining scoped views canonicalized', ['#representativesView','#installationsOverviewView','#installationExceptionsView','#installationCostsView','#installationSettingsView'].every(v => canonical.includes(v))],
  ['legacy executive KPI visual block removed', !mobile.includes('#reportsOverviewView .executive-kpi-card{min-height:128px')],
  ['mobile-only ownership wrapper retained', canonical.includes('@media (max-width:767px)')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
