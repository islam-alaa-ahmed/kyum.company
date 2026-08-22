(function(){
const DASH='advertisingDashboard',REPORTS='advertisingReports',STALE=30*86400000,TTL=300000;const mem=new Map();
const db=()=>{if(!window.customerSupabase)throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase};
const can=(screen,a='view')=>window.PermissionEngine?.can?.(screen,a)??window.CustomerPermissions?.canScreen?.(screen,a)??false;
const ns=async()=>`user:${window.KYUMOfflineSessionStore?.currentUserId?.()||'anonymous'}`;
async function load(key,rpc,screen,{force=false}={}){if(!can(screen,'view'))throw new Error('لا توجد صلاحية عرض هذه الشاشة.');const m=mem.get(key);if(!force&&m&&Date.now()-m.t<TTL)return m.data;if(!force){const c=await window.KYUMSmartCache?.get?.(key,{namespace:await ns(),allowStale:true,allowStaleAnyAge:true,staleMaxMs:STALE}).catch(()=>null);if(c?.hit){mem.set(key,{data:c.data,t:Date.now()});if(navigator.onLine!==false)network(key,rpc).catch(()=>{});return c.data}}return network(key,rpc)}
async function network(key,rpc){const{data,error}=await db().rpc(rpc);if(error)throw new Error(error.message);mem.set(key,{data,t:Date.now()});await window.KYUMSmartCache?.set?.(key,data,{namespace:await ns(),ttlMs:86400000,staleMaxMs:STALE,source:'supabase',schemaVersion:1}).catch(()=>{});return data}
async function dashboard(o){return load('advertising-reporting:dashboard','adv_dashboard_snapshot',DASH,o)}
async function reports(o){return load('advertising-reporting:reports','adv_reports_snapshot',REPORTS,o)}
function exportCsv(filename,headers,rows){if(!can(REPORTS,'export'))throw new Error('لا توجد صلاحية تصدير التقارير.');const clean=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv='\uFEFF'+[headers.map(x=>clean(x[0])).join(','),...rows.map(r=>headers.map(x=>clean(typeof x[1]==='function'?x[1](r):r[x[1]])).join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
window.KYUMSyncEngine?.register?.('advertising_reporting',()=>Promise.allSettled([network('advertising-reporting:dashboard','adv_dashboard_snapshot'),network('advertising-reporting:reports','adv_reports_snapshot')]));
window.AdvertisingReportingService=Object.freeze({dashboard,reports,exportCsv,can});
})();