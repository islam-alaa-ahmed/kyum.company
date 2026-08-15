import fs from 'node:fs';
const css=fs.readFileSync('assets/css/mobile-theme-canonical.css','utf8');
const ver=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
 ['version',ver.version==='18.53.81'],
 ['phase marker',css.includes('M15.31.5 administration + settings mobile visual identity')],
 ['report inset reset',css.includes('position:absolute;inset:auto;inset-inline-end:12px')],
 ['report label-only spacing',css.includes('.executive-kpi-card .kpi-card-head{padding-inline-end:42px')],
 ['users',css.includes('#usersView')],['permissions',css.includes('#permissionsView')],['activity',css.includes('#activityLogView')],
 ['backups semantic icons',css.includes('--backup-icon:url(')],['notifications',css.includes('#notificationCenterView')],
 ['system settings',css.includes('#systemSettingsView')],['about',css.includes('#aboutAppView')]
];
let failed=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failed++;}process.exitCode=failed?1:0;
