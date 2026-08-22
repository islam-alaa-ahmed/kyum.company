(function(){
const SCREEN='advertisingCustodyPurchases',CACHE='advertising-purchases:snapshot',TTL=300000,STALE=30*86400000;let mem=null;
const db=()=>{if(!window.customerSupabase)throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase};
const can=a=>window.PermissionEngine?.can?.(SCREEN,a)??window.CustomerPermissions?.canScreen?.(SCREEN,a)??false;
const req=a=>{if(!can(a))throw new Error('لا توجد صلاحية '+a+' على العهد والمشتريات.')};
const unwrap=async(q,m)=>{const{data,error}=await q;if(error)throw new Error(`${m}: ${error.message}`);return data};
const ns=async()=>`user:${window.KYUMOfflineSessionStore?.currentUserId?.()||'anonymous'}`;
async function network(){const[purchases,suppliers,employees,projects,items]=await Promise.all([
unwrap(db().from('adv_purchases').select('*,supplier:adv_suppliers(id,supplier_code,name),employee:adv_employees(id,employee_code,name),project:adv_projects(id,project_number,project_name),lines:adv_purchase_lines(id,line_no,item_id,quantity,unit_cost,line_total,item:adv_items(id,item_code,name))').order('created_at',{ascending:false}).limit(1000),'تعذر تحميل المشتريات'),
unwrap(db().from('adv_suppliers').select('id,supplier_code,name,is_active').eq('is_active',true).order('name'),'تعذر تحميل الموردين'),
unwrap(db().from('adv_employees').select('id,employee_code,name,can_have_custody,is_active').eq('is_active',true).eq('can_have_custody',true).order('name'),'تعذر تحميل موظفي العهد'),
unwrap(db().from('adv_projects').select('id,project_number,project_name,status,financial_closed_at').is('financial_closed_at',null).neq('status','مغلق ماليًا').order('created_at',{ascending:false}),'تعذر تحميل المشاريع'),
unwrap(db().from('adv_items').select('id,item_code,name,is_active').eq('is_active',true).order('name'),'تعذر تحميل الأصناف')]);
const x={purchases,suppliers,employees,projects,items,loadedAt:new Date().toISOString()};mem={x,t:Date.now()};await window.KYUMSmartCache?.set?.(CACHE,x,{namespace:await ns(),ttlMs:86400000,staleMaxMs:STALE,source:'supabase',schemaVersion:1}).catch(()=>{});return x}
async function snapshot({force=false}={}){req('view');if(!force&&mem&&Date.now()-mem.t<TTL)return mem.x;if(!force){const c=await window.KYUMSmartCache?.get?.(CACHE,{namespace:await ns(),allowStale:true,allowStaleAnyAge:true,staleMaxMs:STALE}).catch(()=>null);if(c?.hit){mem={x:c.data,t:Date.now()};if(navigator.onLine!==false)network().catch(()=>{});return c.data}}return network()}
async function clear(){mem=null;await window.KYUMSmartCache?.removePrefix?.(CACHE,{namespace:await ns()}).catch(()=>{})}
const uuid=()=>crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const online=()=>{if(navigator.onLine===false)throw new Error('اعتماد المشتريات يحتاج اتصالًا بالخادم لأن المخزون والعهدة وتكلفة المشروع تُحدّث ذريًا.')};
async function post(x){req('add');online();const{data,error}=await db().rpc('adv_post_purchase',{p_purchase_date:x.purchase_date||null,p_supplier_id:x.supplier_id||null,p_employee_id:x.employee_id||null,p_destination_type:x.destination_type,p_project_id:x.project_id||null,p_payment_source:x.payment_source,p_invoice_number:x.invoice_number||null,p_reference_number:x.reference_number||null,p_notes:x.notes||null,p_lines:x.lines,p_client_transaction_id:uuid()});if(error)throw new Error(error.message);await clear();return data}
async function reverse(id,reason){req('delete');online();const{data,error}=await db().rpc('adv_reverse_purchase',{p_purchase_id:id,p_reason:reason,p_client_transaction_id:uuid()});if(error)throw new Error(error.message);await clear();return data}
window.AdvertisingPurchasesService=Object.freeze({snapshot,post,reverse,can,invalidate:clear});
})();