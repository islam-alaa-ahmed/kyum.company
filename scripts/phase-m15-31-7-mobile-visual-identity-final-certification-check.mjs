import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const canonical = read('assets/css/mobile-theme-canonical.css');
const index = read('index.html');
const sw = read('service-worker.js');
const pwa = read('assets/js/pwa.js');
const mobile = read('assets/css/mobile.css');
const version = JSON.parse(read('version.json'));

const featureViews = [
  'aboutAppView','activityLogView','backupsView','customersView','dailyOperationsView',
  'dailyPerformanceReportView','dashboardView','followupsView','installationCompletionView',
  'installationCostsView','installationExceptionsView','installationExecutionView',
  'installationReportsView','installationRequestNewView','installationRequestsView',
  'installationScheduleView','installationSettingsView','installationsOverviewView',
  'notificationCenterView','permissionsView','quotationsView','reportsOverviewView',
  'representativesView','salesInvoicesView','settingsView','systemHealthView',
  'systemSettingsView','usersView'
];

const shellViews = ['loginView','appView'];
const htmlViews = [...index.matchAll(/id="([A-Za-z0-9_-]+View)"/g)].map((m) => m[1]);
const uncoveredFeatureViews = featureViews.filter((view) => !canonical.includes(`#${view}`));
const unexpectedViews = htmlViews.filter((view) => !featureViews.includes(view) && !shellViews.includes(view));

const mobileScopeIndex = canonical.indexOf('@media (max-width: 768px)');
const firstFeatureIndex = Math.min(...featureViews.map((view) => {
  const i = canonical.indexOf(`#${view}`);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}));

const checks = [
  ['version bumped', version.version === '18.53.83' && version.build === 185383],
  ['cache token synchronized', version.cacheToken === 'kyum-crm-pwa-18-53-83-mobile-visual-identity-final-certification-m15-31-7' && sw.includes(version.cacheToken)],
  ['pwa version synchronized', pwa.includes('const CURRENT_VERSION = "18.53.83"')],
  ['index cache bust synchronized', index.includes('mobile-theme-canonical.css?v=18.53.83') && index.includes('app.js?v=18.53.83')],
  ['all feature views discovered in HTML', featureViews.every((view) => htmlViews.includes(view))],
  ['all feature views have canonical coverage', uncoveredFeatureViews.length === 0],
  ['only shell views excluded from feature rollout', unexpectedViews.length === 0 && shellViews.every((view) => htmlViews.includes(view))],
  ['canonical feature ownership starts inside mobile scope', mobileScopeIndex >= 0 && firstFeatureIndex > mobileScopeIndex],
  ['M15.31.6 KPI collision contract retained', canonical.includes('#reportsOverviewView .executive-kpi-card .kpi-card-head{') && canonical.includes('grid-template-columns:minmax(0,1fr) auto!important') && canonical.includes('position:static!important;inset:auto!important')],
  ['M15.31.6 top customers contract retained', canonical.includes('#reportsOverviewView .top-customer-item{') && canonical.includes('grid-template-columns:34px minmax(0,1fr) minmax(86px,auto)!important')],
  ['legacy executive KPI visual ownership remains removed', !mobile.includes('#reportsOverviewView .executive-kpi-card{min-height:128px')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (!ok) failed += 1;
}

console.log(`INFO - feature views certified: ${featureViews.length}`);
console.log(`INFO - shell/runtime views intentionally excluded: ${shellViews.join(', ')}`);
if (uncoveredFeatureViews.length) console.log(`INFO - uncovered feature views: ${uncoveredFeatureViews.join(', ')}`);
if (unexpectedViews.length) console.log(`INFO - unexpected HTML views: ${unexpectedViews.join(', ')}`);

if (failed) process.exit(1);
