import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const index=read('index.html');
const svc=read('assets/js/installations-service.js');
const mod=read('assets/js/installations-module.js');
const sql=read('supabase/migrations/phase_m15_15_mandatory_google_maps_installation_request.sql');
const version=JSON.parse(read('version.json'));
const tests=[
 ['HTML map input required',/id="newInstallationCustomerMapUrl"[^>]*required/.test(index)],
 ['HTML no optional marker',!index.includes('موقع العميل (رابط Google Maps) <span class="optional-mark">اختياري</span>')],
 ['Service requires map URL',svc.includes('function requireGoogleMapsUrl')&&svc.includes('موقع العميل على Google Maps مطلوب لحفظ طلب التركيب.')],
 ['Create uses required map helper',svc.includes('p_customer_map_url:requireGoogleMapsUrl(payload.customerMapUrl)')],
 ['Form blocks blank map',mod.includes('if (!payload.customerMapUrl)')&&mod.includes('newInstallationCustomerMapUrl')],
 ['RPC blocks blank map',sql.includes('if v_map_url is null then')&&sql.includes('Google Maps location is required for installation requests')],
 ['Historical table not forced NOT NULL',!sql.includes('alter column customer_map_url set not null')],
 ['Version 18.53.49',version.version==='18.53.49']
];
let failed=0; for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok)failed++;} if(failed)process.exit(1);
