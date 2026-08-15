import fs from 'node:fs';

const style = fs.readFileSync('assets/css/style.css','utf8');
const canonical = fs.readFileSync('assets/css/desktop-visual-identity-canonical.css','utf8');
const html = fs.readFileSync('index.html','utf8');

const checks = [
  ['shared status uses tokens', style.includes('background:var(--data-status-info-bg,#eff6ff)')],
  ['shared controls own color-scheme', style.includes('color-scheme:var(--control-color-scheme,normal)')],
  ['native options use tokens', style.includes('select option{background:var(--option-bg,#fff)')],
  ['row actions use containment tokens', style.includes('white-space:var(--row-action-white-space,normal)')],
  ['desktop dark controls set dark scheme', canonical.includes('--control-color-scheme:dark')],
  ['desktop dark options are navy', canonical.includes('--option-bg:#081930')],
  ['desktop dark data status is not light', canonical.includes('--data-status-info-bg:linear-gradient(145deg,rgba(12,34,63,.96),rgba(8,25,48,.94))')],
  ['customer action width fixed', canonical.includes('min-width:286px')],
  ['customer buttons no wrap', canonical.includes('--row-action-white-space:nowrap')],
  ['dashboard scoped', canonical.includes('#dashboardView')],
  ['customers scoped', canonical.includes('#customersView')],
  ['followups scoped', canonical.includes('#followupsView')],
  ['header not targeted', !canonical.includes('#appHeader')],
  ['sidebar not targeted', !canonical.includes('.sidebar')],
  ['version link updated', html.includes('desktop-visual-identity-canonical.css?v=18.53.85')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
