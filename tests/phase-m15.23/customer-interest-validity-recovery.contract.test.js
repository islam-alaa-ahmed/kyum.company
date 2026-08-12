const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const app = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');

const checks = [
  ['reconciliation remains present', app.includes('checkedInterestIds')],
  ['stale validity is cleared from selected IDs', app.includes('if (selectedIds.size > 0)') && app.includes('select.setCustomValidity("")')],
  ['change listener clears stale validity', app.includes('getSelectedCustomerInterestIds().length > 0')],
  ['empty selection validation remains enforced', app.includes('اختر مجال اهتمام واحدًا على الأقل.')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
