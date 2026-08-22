(function(){
const SCREEN='advertisingCustodyPurchases',CACHE='advertising-custody:snapshot',TTL=5*60*1000,STALE=30*24*60*60*1000;let mem=null,inflight=null;
const db=()=>{if(!window.customerSupabase)throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase};
const can=a=>window.PermissionEngine?.can?.(SCREEN,a)??window.CustomerPermissions?.canScreen?.(SCREEN,a)??false;
function req(a){if(!can(a))throw new Error('لا توجد صلاحية '+({view:'عرض',add:'إضافة',edit:'تعديل',delete:'حذف'}[a]||a)+' العهد والمشتريات.')}
async function ns(){return `user:${window.KYUMOfflineSessionStore?.currentUserId?.()||'anonymous'}`}
async function unwrap(q,msg){const {data,error}=await q;if(error)throw new Error(`${msg}: ${error.message}`);return data}
async function network(){
 const [accounts,transactions,employees,projects,items]=await Promise.all([
  unwrap(db().from('adv_custody_accounts').select('id,employee_id,current_balance,is_active,last_transaction_at,updated_at,employee:adv_employees(id,employee_code,name,job_title,can_have_custody,is_active)').order('updated_at',{ascending:false}),'تعذر تحميل أرصدة العهد'),
  unwrap(db().from('adv_custody_transactions').select('id,transaction_number,account_id,employee_id,transaction_date,transaction_type,amount,signed_amount,balance_after,project_id,item_id,description,reference_number,notes,is_reversed,reversed_transaction_id,created_at,employee:adv_employees(id,employee_code,name),project:adv_projects(id,project_number,project_name),item:adv_items(id,item_code,name)').order('created_at',{ascending:false}).limit(1000),'تعذر تحميل حركات العهد'),
  unwrap(db().from('adv_employees').select('id,employee_code,name,job_title,can_have_custody,is_active').eq('is_active',true).eq('can_have_custody',true).order('name'),'تعذر تحميل موظفي العهد'),
  unwrap(db().from('adv_projects').select('id,project_number,project_name,status,financial_closed_at').is('financial_closed_at',null).neq('status','مغلق ماليًا').order('created_at',{ascending:false}),'تعذر تحميل المشاريع المفتوحة'),
  unwrap(db().from('adv_items').select('id,item_code,name,is_active').eq('is_active',true).order('name'),'تعذر تحميل الأصناف')
 ]);
 const x={accounts,transactions,employees,projects,items,loadedAt:new Date().toISOString()};mem={x,t:Date.now()};
 await window.KYUMSmartCache?.set?.(CACHE,x,{namespace:await ns(),ttlMs:24*60*60*1000,staleMaxMs:STALE,source:'supabase',schemaVersion:1}).catch(()=>{});
 return x;
}
async function snapshot({force=false}={}){req('view');if(!force&&mem&&Date.now()-mem.t<TTL)return mem.x;if(!force&&inflight)return inflight;inflight=(async()=>{if(!force){const c=await window.KYUMSmartCache?.get?.(CACHE,{namespace:await ns(),allowStale:true,allowStaleAnyAge:true,staleMaxMs:STALE}).catch(()=>null);if(c?.hit){mem={x:c.data,t:Date.now()};if(navigator.onLine!==false)network().catch(()=>{});return c.data}}return network()})();try{return await inflight}finally{inflight=null}}
async function clear(){mem=null;await window.KYUMSmartCache?.removePrefix?.(CACHE,{namespace:await ns()}).catch(()=>{})}
function uuid(){return crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function online(){if(navigator.onLine===false)throw new Error('اعتماد حركة العهدة يحتاج اتصالًا بالخادم لأن الرصيد وتكلفة المشروع تُحدّث بصورة ذرية.')}
async function post(data){req('add');online();const {data:row,error}=await db().rpc('adv_custody_post',{p_employee_id:data.employee_id,p_transaction_type:data.transaction_type,p_amount:Number(data.amount),p_transaction_date:data.transaction_date||null,p_project_id:data.project_id||null,p_item_id:data.item_id||null,p_description:data.description||null,p_reference_number:data.reference_number||null,p_notes:data.notes||null,p_client_transaction_id:data.client_transaction_id||uuid()});if(error)throw new Error(error.message);await clear();void window.BusinessActivityService?.log?.({eventType:'activity',sectionKey:SCREEN,actionKey:`custody_${data.transaction_type}`,entityType:'adv_custody_transactions',entityId:row?.id||null,entityDisplayName:row?.transaction_number||'',details:{employee_id:data.employee_id,amount:Number(data.amount),project_id:data.project_id||null,item_id:data.item_id||null}});return row}
async function reverse(row,reason){req('delete');online();const {data,error}=await db().rpc('adv_reverse_custody_transaction',{p_transaction_id:row.id,p_reason:reason,p_client_transaction_id:uuid()});if(error)throw new Error(error.message);await clear();void window.BusinessActivityService?.log?.({eventType:'activity',sectionKey:SCREEN,actionKey:'custody_reverse',entityType:'adv_custody_transactions',entityId:row.id,entityDisplayName:row.transaction_number,details:{reason,transaction_type:row.transaction_type}});return data}
window.KYUMSyncEngine?.register?.('advertising_custody',()=>network().catch(()=>null));
window.AdvertisingCustodyService=Object.freeze({snapshot,post,reverse,can,invalidate:clear});
})();