import fs from 'node:fs';
const service=fs.readFileSync('assets/js/installations-service.js','utf8');
const ui=fs.readFileSync('assets/js/installation-execution.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const sw=fs.readFileSync('service-worker.js','utf8');
const tests=[
 ['workspace query excludes pending confirmation', service.includes(".in('status',['مجدولة','قيد التنفيذ'])")],
 ['terminal visit guard exists', service.includes("if(v.completed_at||['بانتظار التأكيد','مؤكدة','ملغاة']")],
 ['super admin current marker restricted to in-progress', service.includes("String(v.status||'').trim()==='قيد التنفيذ'")],
 ['ui candidate guard excludes completed', ui.includes("r.isCurrentUserSelection===true&&!r.completedAt")],
 ['ui candidate guard excludes pending confirmation', ui.includes("'بانتظار التأكيد'")],
 ['version bumped', version.version==='18.53.47' && version.build===185347],
 ['cache token synchronized', sw.includes(version.cacheToken)],
 ['no legacy current observer marks terminal visit', !service.includes("isCurrentUserSelection:Boolean((currentVisitId&&String(v.id)===String(currentVisitId))||(superAdminExecutionObserver&&v.selected_for_execution_at))")]
];
let ok=0;
for(const [name,pass] of tests){console.log(`${pass?'PASS':'FAIL'} ${name}`); if(pass)ok++;}
console.log(`\n${ok}/${tests.length} PASS`);
if(ok!==tests.length)process.exit(1);
