const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const app = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const svc = fs.readFileSync(path.join(root, 'assets/js/quotations-service.js'), 'utf8');
const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
let pass = 0;
function check(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`); pass += 1;
}
check('new quotation form does not auto-allocate an internal serial', app.includes('quotationCodeInput.value = quotation?.code || "";') && !app.includes('quotationCodeInput.value = await window.QuotationsService.getNextQuotationCode()'));
check('duplicate lookup uses exact quotation number equality', svc.includes('.eq("quotation_number", quotationNumber.trim())'));
check('duplicate lookup no longer uses ilike wildcard semantics', !svc.includes('.ilike("quotation_number", quotationNumber.trim())'));
check('duplicate message is scoped to quotation_number constraint', svc.includes('constraint.includes("quotation_number")'));
check('unrelated unique conflicts are not mislabeled as quotation-number duplicates', svc.includes('تعارض داخلي في السجل'));
check('database quotation_number uniqueness protection remains in save path', svc.includes('quotation_number: record.code.trim()'));
check('release version advanced', version.version === '18.53.55');
console.log(`RESULT: ${pass}/7 PASS`);
