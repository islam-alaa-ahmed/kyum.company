import fs from 'node:fs';
const service=fs.readFileSync(new URL('../assets/js/installations-service.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const quotation=fs.readFileSync(new URL('../assets/js/quotations-service.js',import.meta.url),'utf8');
const checks=[
 ['schedule loads confirmed visits', service.includes("'بانتظار التأكيد','مؤكدة'")],
 ['schedule visit select carries completed_at', /scheduleList\(\)[\s\S]*?completed_at[\s\S]*?get_installation_schedule_global/.test(service) || /get_installation_schedule_global[\s\S]*?completed_at/.test(service)],
 ['schedule does not discard pending confirmation', !/if\(v\.completed_at\|\|\['بانتظار التأكيد','مؤكدة','ملغاة'\]/.test(service)],
 ['schedule excludes only cancelled visit in expansion', service.includes("if(String(v.status||'').trim()==='ملغاة')return;")],
 ['quotation normalization recognizes request reverse link', quotation.includes("row.installation_request_id || row.installation_requests?.[0]?.id")],
 ['quotation screen hides converted rows', app.includes('quotations.filter(item => !item.installationRequestId)')],
 ['installation create action requires accepted quotation', app.includes('canonicalStatus === "مقبول" && !item.installationRequestId')]
];
let ok=0; for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`); if(pass)ok++;}
console.log(`\n${ok}/${checks.length} PASS`); if(ok!==checks.length)process.exit(1);
