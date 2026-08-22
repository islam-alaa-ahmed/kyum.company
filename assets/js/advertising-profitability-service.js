(function(){
const SCREEN='advertisingProjectCosts',CACHE='advertising-profitability:snapshot',TTL=300000,STALE=30*86400000;let mem=null;
const db=()=>{if(!window.customerSupabase)throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase};
const can=a=>window.PermissionEngine?.can?.(SCREEN,a)??window.CustomerPermissions?.canScreen?.(SCREEN,a)??false;
const req=a=>{if(!can(a))throw new Error('لا توجد صلاحية '+a+' على تكلفة وربحية المشاريع.')};
const unwrap=async(q,m)=>{const{data,error}=await q;if(error)throw new Error(`${m}: ${error.message}`);return data};
const ns=async()=>`user:${window.KYUMOfflineSessionStore?.currentUserId?.()||'anonymous'}`;
async function network(){const rows=await unwrap(db().from('adv_project_profitability').select('*').order('project_number',{ascending:false}),'تعذر تحميل ربحية المشاريع');const x={rows,loadedAt:new Date().toISOString()};mem={x,t:Date.now()};await window.KYUMSmartCache?.set?.(CACHE,x,{namespace:await ns(),ttlMs:86400000,staleMaxMs:STALE,source:'supabase',schemaVersion:1}).catch(()=>{});return x}
async function snapshot({force=false}={}){req('view');if(!force&&mem&&Date.now()-mem.t<TTL)return mem.x;if(!force){const c=await window.KYUMSmartCache?.get?.(CACHE,{namespace:await ns(),allowStale:true,allowStaleAnyAge:true,staleMaxMs:STALE}).catch(()=>null);if(c?.hit){mem={x:c.data,t:Date.now()};if(navigator.onLine!==false)network().catch(()=>{});return c.data}}return network()}
async function clear(){mem=null;await window.KYUMSmartCache?.removePrefix?.(CACHE,{namespace:await ns()}).catch(()=>{})}
const online=()=>{if(navigator.onLine===false)throw new Error('الإغلاق المالي وإعادة الفتح يحتاجان اتصالًا بالخادم.')};
async function closeProject(id,reason=''){req('edit');online();const{data,error}=await db().rpc('adv_close_project_financially',{p_project_id:id,p_reason:reason||null});if(error)throw new Error(error.message);await clear();return data}
async function reopenProject(id,reason){req('edit');online();const{data,error}=await db().rpc('adv_reopen_project_financially',{p_project_id:id,p_reason:reason});if(error)throw new Error(error.message);await clear();return data}
window.KYUMSyncEngine?.register?.('advertising_project_profitability',()=>network().catch(()=>null));
window.AdvertisingProfitabilityService=Object.freeze({snapshot,closeProject,reopenProject,can,invalidate:clear});
})();