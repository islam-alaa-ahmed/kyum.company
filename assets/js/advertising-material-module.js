(function(){
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));let snap={projects:[],items:[],balances:[],movements:[],costs:[]},bound=false,currentReturn=null;
const can=a=>window.AdvertisingMaterialService?.can?.(a)??false,fmt=(n,d=3)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
function msg(x='',t=''){const e=$('advertisingMaterialIssueStatus');if(e){e.textContent=x;e.className=`data-status${x?'':' hidden'}${t?` ${t}`:''}`}}
function balance(itemId){return snap.balances.find(x=>String(x.item_id)===String(itemId))||{quantity_on_hand:0,average_cost:0,inventory_value:0}}
function activeReturns(issueId){return snap.movements.filter(x=>x.transaction_type==='project_return'&&!x.is_reversed&&String(x.reference_id)===String(issueId)).reduce((s,x)=>s+Number(x.quantity||0),0)}
function returnable(row){return Math.max(0,Number(row.quantity||0)-activeReturns(row.id))}
function projectCost(projectId){return snap.costs.filter(x=>String(x.project_id)===String(projectId)).reduce((s,x)=>s+Number(x.amount||0),0)}
function render(){
 const q=String($('advertisingMaterialSearch')?.value||'').trim().toLowerCase(),pid=$('advertisingMaterialProjectFilter')?.value||'';
 const rows=snap.movements.filter(x=>(!pid||String(x.project_id)===pid)&&(!q||[x.transaction_number,x.project?.project_number,x.project?.project_name,x.item?.item_code,x.item?.name,x.notes].some(v=>String(v||'').toLowerCase().includes(q))));
 $('advertisingMaterialIssueBtn')?.classList.toggle('hidden',!can('add'));
 $('advertisingMaterialMovementCount').textContent=`${rows.length} حركة`;
 $('advertisingMaterialCostTotal').textContent=`${fmt((pid?snap.costs.filter(x=>String(x.project_id)===pid):snap.costs).reduce((s,x)=>s+Number(x.amount||0),0),2)} ر.س`;
 $('advertisingMaterialTableBody').innerHTML=rows.length?rows.map(x=>{
  const ret=x.transaction_type==='project_issue'?returnable(x):0;
  const label={project_issue:'صرف للمشروع',project_return:'مرتجع للمخزون',reversal:'عكس حركة'}[x.transaction_type]||x.transaction_type;
  const amount=x.transaction_type==='project_return'?-Number(x.total_cost||0):Number(x.total_cost||0);
  return `<tr><td>${esc(x.transaction_number)}</td><td>${esc(x.transaction_date)}</td><td>${esc(x.project?.project_number||'—')}<br><small>${esc(x.project?.project_name||'')}</small></td><td>${esc(x.item?.name||'—')}</td><td>${esc(label)}</td><td>${fmt(x.quantity)}</td><td>${fmt(x.unit_cost,4)}</td><td>${fmt(amount,2)}</td><td>${x.transaction_type==='project_issue'?fmt(ret):'—'}</td><td><div class="row-actions">${x.is_reversed?'<span class="badge">معكوسة</span>':x.transaction_type==='project_issue'&&ret>0&&can('add')?`<button class="secondary-btn adv-material-small" type="button" data-adv-material-return="${esc(x.id)}">مرتجع</button>`:''}${!x.is_reversed&&['project_issue','project_return'].includes(x.transaction_type)&&can('delete')?`<button class="delete-btn" type="button" data-adv-material-reverse="${esc(x.id)}">عكس</button>`:''}</div></td></tr>`;
 }).join(''):'<tr><td colspan="10" class="empty-state">لا توجد حركات مواد مطابقة.</td></tr>';
 const stock=snap.items.filter(i=>!q||[i.item_code,i.name,i.category?.name].some(v=>String(v||'').toLowerCase().includes(q)));
 $('advertisingMaterialStockBody').innerHTML=stock.length?stock.map(i=>{const b=balance(i.id);return `<tr><td>${esc(i.item_code||'—')}</td><td>${esc(i.name)}</td><td>${esc(i.unit?.symbol||i.unit?.name||'—')}</td><td>${fmt(b.quantity_on_hand)}</td><td>${fmt(b.average_cost,4)}</td></tr>`}).join(''):'<tr><td colspan="5" class="empty-state">لا توجد أصناف.</td></tr>';
}
function fillProjectFilter(){const cur=$('advertisingMaterialProjectFilter')?.value||'';$('advertisingMaterialProjectFilter').innerHTML='<option value="">كل المشاريع المفتوحة</option>'+snap.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.project_number)} — ${esc(p.project_name)}</option>`).join('');$('advertisingMaterialProjectFilter').value=cur}
function itemDatalist(){return snap.items.map(i=>{const b=balance(i.id);return `<option value="${esc(i.item_code?`${i.item_code} — `:'')}${esc(i.name)}" data-id="${esc(i.id)}">الرصيد ${fmt(b.quantity_on_hand)}</option>`}).join('')}
function projectDatalist(){return snap.projects.map(p=>`<option value="${esc(p.project_number)} — ${esc(p.project_name)}" data-id="${esc(p.id)}">${esc(p.customer_name||'')}</option>`).join('')}
function lookup(listId,value){return [...document.querySelectorAll(`#${listId} option`)].find(o=>o.value===value)?.dataset.id||''}
async function load(force=false){msg('جاري تحميل صرف المواد...');try{snap=await window.AdvertisingMaterialService.snapshot({force});fillProjectFilter();render();msg('')}catch(e){msg(e.message||'تعذر تحميل البيانات.','error')}}
function openIssue(){
 if(!can('add'))return;
 $('advMaterialProjectList').innerHTML=projectDatalist();$('advMaterialItemList').innerHTML=itemDatalist();
 $('advMaterialProjectSearch').value='';$('advMaterialItemSearch').value='';$('advMaterialQuantity').value='';$('advMaterialDate').value=new Date().toISOString().slice(0,10);$('advMaterialNotes').value='';$('advMaterialStockHint').textContent='';
 $('advertisingMaterialIssueDialog').showModal();
}
function refreshStockHint(){const id=lookup('advMaterialItemList',$('advMaterialItemSearch').value);const b=balance(id);$('advMaterialStockHint').textContent=id?`الرصيد المتاح: ${fmt(b.quantity_on_hand)} — متوسط التكلفة: ${fmt(b.average_cost,4)} ر.س`:'الصنف غير موجود في القائمة الحالية.'}
async function saveIssue(e){
 e.preventDefault();const projectId=lookup('advMaterialProjectList',$('advMaterialProjectSearch').value),itemId=lookup('advMaterialItemList',$('advMaterialItemSearch').value);
 if(!projectId){msg('اختر مشروعًا من القائمة المفتوحة.','error');return}
 if(!itemId){msg('اختر صنفًا موجودًا أو استخدم إضافة صنف جديد.','error');return}
 const b=$('advertisingMaterialIssueSaveBtn');b.disabled=true;
 try{await window.AdvertisingMaterialService.issue({project_id:projectId,item_id:itemId,quantity:$('advMaterialQuantity').value,transaction_date:$('advMaterialDate').value,notes:$('advMaterialNotes').value});$('advertisingMaterialIssueDialog').close();await load(true);msg('تم صرف المواد وتحميل تكلفتها الفعلية على المشروع.','success')}catch(e){msg(e.message||'تعذر صرف المواد.','error')}finally{b.disabled=false}
}
function openReturn(id){
 const row=snap.movements.find(x=>String(x.id)===String(id));if(!row)return;currentReturn=row;const max=returnable(row);
 $('advMaterialReturnProject').value=`${row.project?.project_number||''} — ${row.project?.project_name||''}`;$('advMaterialReturnItem').value=row.item?.name||'';$('advMaterialReturnAvailable').value=fmt(max);$('advMaterialReturnQuantity').max=String(max);$('advMaterialReturnQuantity').value='';$('advMaterialReturnDate').value=new Date().toISOString().slice(0,10);$('advMaterialReturnNotes').value='';$('advertisingMaterialReturnDialog').showModal();
}
async function saveReturn(e){
 e.preventDefault();if(!currentReturn)return;const b=$('advertisingMaterialReturnSaveBtn');b.disabled=true;
 try{await window.AdvertisingMaterialService.returnMaterial({issue_transaction_id:currentReturn.id,quantity:$('advMaterialReturnQuantity').value,transaction_date:$('advMaterialReturnDate').value,notes:$('advMaterialReturnNotes').value});$('advertisingMaterialReturnDialog').close();currentReturn=null;await load(true);msg('تم إرجاع المواد للمخزون وتخفيض تكلفة المشروع بالقيمة الأصلية للصرف.','success')}catch(e){msg(e.message||'تعذر تسجيل المرتجع.','error')}finally{b.disabled=false}
}
async function reverse(id){
 const row=snap.movements.find(x=>String(x.id)===String(id));if(!row)return;const reason=prompt(`سبب عكس الحركة ${row.transaction_number}:`);if(reason===null)return;if(!reason.trim()){msg('سبب العكس مطلوب.','error');return}
 try{await window.AdvertisingMaterialService.reverse(row,reason);await load(true);msg('تم عكس حركة المواد والمخزون وقيد تكلفة المشروع معًا.','success')}catch(e){msg(e.message||'تعذر عكس الحركة.','error')}
}
function addItem(){
 if(!window.AdvertisingReferenceService?.can?.('add')){msg('لا توجد صلاحية إضافة صنف في البيانات المرجعية.','error');return}
 const raw=$('advMaterialItemSearch').value.trim(),name=raw.includes(' — ')?raw.split(' — ').slice(1).join(' — '):raw;
 window.AdvertisingReferenceModule?.openAddItem?.({name});
}
function bind(){
 if(bound)return;bound=true;
 $('advertisingMaterialSearch')?.addEventListener('input',render);$('advertisingMaterialProjectFilter')?.addEventListener('change',render);$('advertisingMaterialIssueBtn')?.addEventListener('click',openIssue);$('advMaterialItemSearch')?.addEventListener('input',refreshStockHint);$('advMaterialAddItemBtn')?.addEventListener('click',addItem);
 $('advertisingMaterialIssueForm')?.addEventListener('submit',saveIssue);$('advertisingMaterialReturnForm')?.addEventListener('submit',saveReturn);
 $('closeAdvertisingMaterialIssueDialog')?.addEventListener('click',()=>$('advertisingMaterialIssueDialog').close());$('cancelAdvertisingMaterialIssueDialog')?.addEventListener('click',()=>$('advertisingMaterialIssueDialog').close());$('closeAdvertisingMaterialReturnDialog')?.addEventListener('click',()=>$('advertisingMaterialReturnDialog').close());$('cancelAdvertisingMaterialReturnDialog')?.addEventListener('click',()=>$('advertisingMaterialReturnDialog').close());
 $('advertisingMaterialTableBody')?.addEventListener('click',e=>{const r=e.target.closest('[data-adv-material-return]'),x=e.target.closest('[data-adv-material-reverse]');if(r)openReturn(r.dataset.advMaterialReturn);if(x)void reverse(x.dataset.advMaterialReverse)});
 window.addEventListener('advertising-reference-saved',async e=>{if(e.detail?.type==='items'){await load(true);const row=e.detail.row;if(row?.id&&!String(row.id).startsWith('local:')){$('advMaterialItemList').innerHTML=itemDatalist();$('advMaterialItemSearch').value=`${row.item_code?`${row.item_code} — `:''}${row.name}`;refreshStockHint()}}});
 window.BusinessActivityService?.trackSearchInput?.($('advertisingMaterialSearch'),{sectionKey:'advertisingMaterialIssue',label:'بحث صرف مواد المشاريع',textType:'item'});
 window.addEventListener('online',()=>load(true));
}
function activate(){bind();if(!$('advertisingMaterialIssueView')?.classList.contains('hidden'))void load(false)}document.addEventListener('DOMContentLoaded',activate);window.addEventListener('kyum-view-changed',e=>{if(e.detail?.view==='advertisingMaterialIssue'||e.detail?.viewKey==='advertisingMaterialIssue')setTimeout(()=>load(false),0);else activate()});
window.AdvertisingMaterialModule=Object.freeze({load});
})();