import fs from 'node:fs';
const svc=fs.readFileSync('assets/js/installations-service.js','utf8');
const idx=fs.readFileSync('index.html','utf8');
const pwa=fs.readFileSync('assets/js/pwa.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const ver=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
 ['super admin role detection',svc.includes("superAdminExecutionObserver=executionViewerRole==='super_admin'")],
 ['shared active selection for super admin',svc.includes('superAdminExecutionObserver&&v.selected_for_execution_at')],
 ['current user selection preserved',svc.includes('currentVisitId&&String(v.id)===String(currentVisitId)')],
 ['active visit statuses preserved',svc.includes(".in('status',['مجدولة','قيد التنفيذ','بانتظار التأكيد'])")],
 ['index version',idx.includes('18.53.46')],
 ['pwa version',pwa.includes('18.53.46')],
 ['service worker version',sw.includes('18-53-46-super-admin-execution-observer-m15-14-6')],
 ['version json',ver.version==='18.53.46'&&ver.build===185346]
];
let bad=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++;} if(bad)process.exit(1);
