const fs=require('fs');
const app=fs.readFileSync('assets/js/app.js','utf8');
const svc=fs.readFileSync('assets/js/quotations-service.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
 ['server allocator exported',svc.includes('getNextQuotationCode') && svc.includes('quotation_number')],
 ['dialog awaits server allocator',app.includes('await window.QuotationsService.getNextQuotationCode()')],
 ['submit duplicate guard retained',app.includes('رقم عرض السعر ${code} مسجل بالفعل ولا يمكن تكراره.')],
 ['version bumped',version.version==='18.53.54']
];
let failed=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failed++;} process.exit(failed?1:0);
