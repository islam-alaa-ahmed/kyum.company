const fs = require('fs');
const app = fs.readFileSync('assets/js/app.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');
const version = JSON.parse(fs.readFileSync('version.json','utf8'));
const checks = [
  ['checkbox state reconciled', app.includes('checkedInterestIds') && app.includes('#customerInterestOptions input[type="checkbox"][data-interest-id]:checked')],
  ['native select synchronized', app.includes('option.selected = checkedSet.has(String(option.value))')],
  ['validation uses reconciled select', app.includes('const selectedInterestIds = [...interestSelect.selectedOptions]')],
  ['empty validation retained', app.includes('اختر مجال اهتمام واحدًا على الأقل.')],
  ['release version', version.version === '18.53.51'],
  ['html cache bust', html.includes('assets/js/app.js?v=18.53.51')],
  ['service worker cache', sw.includes('kyum-crm-pwa-18-53-51-customer-interest-edit-reconciliation-m15-17')]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
if (failed) process.exit(1);
