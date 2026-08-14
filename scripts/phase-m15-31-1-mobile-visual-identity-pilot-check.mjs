import fs from 'node:fs';

const files = {
  mobile: fs.readFileSync('assets/css/mobile.css','utf8'),
  canonical: fs.readFileSync('assets/css/mobile-theme-canonical.css','utf8'),
  index: fs.readFileSync('index.html','utf8'),
  pwa: fs.readFileSync('assets/js/pwa.js','utf8'),
  sw: fs.readFileSync('service-worker.js','utf8'),
  version: JSON.parse(fs.readFileSync('version.json','utf8')),
};

const checks = [
  ['pilot contract registered', files.canonical.includes('Phase M15.31.1 — KYUM Mobile Visual Identity Pilot')],
  ['pilot is phone-only', files.canonical.includes('@media (max-width:767px)')],
  ['KYUM blue/gold tokens registered', files.canonical.includes('--kyum-content-blue:#1688ff') && files.canonical.includes('--kyum-content-gold:#e9ad37')],
  ['light/dark glass surfaces registered', files.canonical.includes('--kyum-content-glass-blue:') && files.canonical.includes('html[data-theme="dark"]')],
  ['dashboard KPI pilot styling', files.canonical.includes('#dashboardView .dashboard-stats .stat-card')],
  ['customer mobile-card pilot styling', files.canonical.includes('#customersView .customer-mobile-card{')],
  ['followup KPI/card pilot styling', files.canonical.includes('#followupsView .followup-stat{') && files.canonical.includes('#followupsView tbody tr{')],
  ['legacy KPI visual ownership retired from mobile.css', files.mobile.includes('dashboard KPI presentation moved to mobile-theme-canonical.css') && files.mobile.includes('follow-up KPI presentation moved to mobile-theme-canonical.css')],
  ['legacy customer-card visual ownership retired from mobile.css', files.mobile.includes('dedicated customer-card presentation moved to mobile-theme-canonical.css')],
  ['version unified', files.version.version === '18.53.76' && files.pwa.includes('18.53.76') && files.index.includes('?v=18.53.76')],
  ['cache token unified', files.version.cacheToken === 'kyum-crm-pwa-18-53-76-mobile-visual-pilot-m15-31-1' && files.sw.includes(files.version.cacheToken)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) passed++;
}
console.log(`${passed}/${checks.length} PASS`);
process.exit(passed === checks.length ? 0 : 1);
