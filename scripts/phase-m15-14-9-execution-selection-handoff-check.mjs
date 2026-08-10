import fs from 'node:fs';
const svc=fs.readFileSync(new URL('../assets/js/installations-service.js',import.meta.url),'utf8');
const ver=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));
const tests=[
 ['release bumped',ver.version==='18.53.48'&&ver.build===185348],
 ['scheduled selected visit can be current',svc.includes("!['بانتظار التأكيد','مؤكدة','ملغاة','ملغي'].includes(String(v.status||'').trim())&&((currentVisitId")],
 ['completed visits hard excluded',svc.includes('!v.completed_at')],
 ['old qid-execution-only current predicate removed',!svc.includes("!v.completed_at&&String(v.status||'').trim()==='قيد التنفيذ'&&((currentVisitId")],
 ['workspace still limits active visit statuses',svc.includes(".in('status',['مجدولة','قيد التنفيذ'])")],
 ['selection still uses visit RPC',svc.includes("rpc('select_installation_execution_visit'")],
 ['super admin observer retained',svc.includes('superAdminExecutionObserver&&v.selected_for_execution_at')]
];
let fail=0;for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}if(fail)process.exit(1);
