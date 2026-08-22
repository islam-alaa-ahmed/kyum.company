(function(){
const SCREEN='advertisingProjectCosts',CACHE='advertising-expenses:snapshot',TTL=300000,STALE=30*86400000;let mem=null;
const db=()=>{if(!window.customerSupabase)throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase};
const can=a=>window.PermissionEngine?.can?.(SCREEN,a)??window.CustomerPermissions?.canScreen?.(SCREEN,a)??false;
const req=a=>{if(!can(a))throw new Error('لا توجد صلاحية '+a+' على تكلفة وربحية المشاريع.')};
const unwrap=async(q,m)=>{const{data,error}=await q;if(error)throw new Error(`${m}: ${error.message}`);return data};
const ns=async()=>`user:${window.KYUMOfflineSessionStore?.currentUserId?.()||'anonymous'}`;
async function network(){const[expenses,types,employees,projects]=await Promise.all([
unwrap(db().from('adv_project_expenses').select('*,project:adv_projects(id,project_number,project_name),expense_type:adv_expense_types(id,code,name),employee:adv_employees(id,employee_code,name)').order('created_at',{ascending:false}).limit(1000),'تعذر تحميل مصروفات المشاريع'),
unwrap(db().from('adv_expense_types').select('id,code,name,is_active').eq('is_active',true).order('name'),'تعذر تحميل أنواع المصروفات'),
unwrap(db().from('adv_employees').select('id,employee_code,name,can_have_custody,is_active').eq('is_active',true).eq('can_have_custody',true).order('name'),'تعذر تحميل موظفي العهد'),
unwrap(db().from('adv_projects').select('id,project_number,project_name,status,financial_closed_at').is('financial_closed_at',null).neq('status','مغلق ماليًا').order('created_at',{ascending:false}),'تعذر تحميل المشاريع المفتوحة')]);
const x={expenses,types,employees,projects,loadedAt:new Date().toISOString()};mem={x,t:Date.now()};await window.KYUMSmartCache?.set?.(CACHE,x,{namespace:await ns(),ttlMs:86400000,staleMaxMs:STALE,source:'supabase',schemaVersion:1}).catch(()=>{});return x}
async function snapshot({force=false}={}){req('view');if(!force&&mem&&Date.now()-mem.t<TTL)return mem.x;if(!force){const c=await window.KYUMSmartCache?.get?.(CACHE,{namespace:await ns(),allowStale:true,allowStaleAnyAge:true,staleMaxMs:STALE}).catch(()=>null);if(c?.hit){mem={x:c.data,t:Date.now()};if(navigator.onLine!==false)network().catch(()=>{});return c.data}}return network()}
async function clear(){mem=null;await window.KYUMSmartCache?.removePrefix?.(CACHE,{namespace:await ns()}).catch(()=>{})}
const uuid=()=>crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const online=()=>{if(navigator.onLine===false)throw new Error('اعتماد مصروفات المشاريع يحتاج اتصالًا بالخادم لأن تكلفة المشروع والعهدة تُحدّثان ذريًا.')};
async function post(x){req('add');online();const{data,error}=await db().rpc('adv_post_project_expense',{p_project_id:x.project_id,p_expense_date:x.expense_date||null,p_expense_type_id:x.expense_type_id,p_payment_source:x.payment_source,p_employee_id:x.payment_source==='custody'?x.employee_id:null,p_amount:Number(x.amount),p_description:x.description||null,p_reference_number:x.reference_number||null,p_notes:x.notes||null,p_client_transaction_id:uuid()});if(error)throw new Error(error.message);await clear();return data}
async function reverse(id,reason){req('delete');online();const{data,error}=await db().rpc('adv_reverse_project_expense',{p_expense_id:id,p_reason:reason,p_client_transaction_id:uuid()});if(error)throw new Error(error.message);await clear();return data}
window.KYUMSyncEngine?.register?.('advertising_project_expenses',()=>network().catch(()=>null));
window.AdvertisingExpensesService=Object.freeze({snapshot,post,reverse,can,invalidate:clear});
})();