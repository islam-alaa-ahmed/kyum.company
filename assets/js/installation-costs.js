(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`SAR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
  const can=action=>window.PermissionEngine?.can?.('installationCosts',action)===true||window.CustomerPermissions?.can?.('installationCosts',action)===true;
  let state={data:null,loaded:false};

  function setStatus(text,type=''){
    const el=$('installationCostsStatus');if(!el)return;el.textContent=text||'';el.classList.toggle('hidden',!text);el.dataset.type=type;
  }
  function nowDefaults(){const d=new Date();return {year:d.getFullYear(),month:d.getMonth()+1}}
  function selectedPeriod(){return {year:Number($('installationCostsYear')?.value||nowDefaults().year),month:Number($('installationCostsMonth')?.value||nowDefaults().month)}}
  function annualKey(name,categoryId){return `${name}::${categoryId}`}
  function maps(){
    const d=state.data||{},annual=new Map(),monthly=new Map(),assignments=new Map();
    (d.annual||[]).forEach(x=>annual.set(annualKey(x.technician_name,x.category_id),Number(x.annual_total||0)));
    (d.monthly||[]).forEach(x=>monthly.set(annualKey(x.technician_name,x.category_id),Number(x.amount||0)));
    (d.assignments||[]).forEach(x=>assignments.set(x.technician_name,x.installation_team_id||''));
    return {annual,monthly,assignments};
  }
  function effective(name,categoryId,m){const k=annualKey(name,categoryId);return m.monthly.has(k)?m.monthly.get(k):round((m.annual.get(k)||0)/12)}
  function technicianMonthlyTotal(name,m){return (state.data?.categories||[]).reduce((sum,c)=>sum+effective(name,c.id,m),0)}
  function technicianAnnualTotal(name,m){return (state.data?.categories||[]).reduce((sum,c)=>sum+(m.annual.get(annualKey(name,c.id))||0),0)}

  function fillPeriodSelectors(){
    const y=$('installationCostsYear'),m=$('installationCostsMonth');if(!y||!m)return;const n=nowDefaults(),currentY=Number(y.value||n.year),currentM=Number(m.value||n.month);
    y.innerHTML='';for(let year=n.year-3;year<=n.year+3;year++){const o=document.createElement('option');o.value=year;o.textContent=year;y.appendChild(o)}y.value=String(currentY);
    const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];m.innerHTML=months.map((x,i)=>`<option value="${i+1}">${x}</option>`).join('');m.value=String(currentM);
  }

  function renderKpis(m){
    const techs=state.data?.technicians||[],teams=state.data?.teams||[];
    const monthly=techs.reduce((s,n)=>s+technicianMonthlyTotal(n,m),0),annual=techs.reduce((s,n)=>s+technicianAnnualTotal(n,m),0);
    const assignedTeams=new Set(techs.map(n=>m.assignments.get(n)).filter(Boolean));
    $('installationCostsKpiTechnicians').textContent=String(techs.length);
    $('installationCostsKpiTeams').textContent=String(assignedTeams.size);
    $('installationCostsKpiAnnual').textContent=money(annual);
    $('installationCostsKpiMonth').textContent=money(monthly);
    $('installationCostsKpiAverageTeam').textContent=money(assignedTeams.size?monthly/assignedTeams.size:0);
    $('installationCostsTeamHint').textContent=teams.length?'تكلفة كل فرقة محسوبة من مجموع الفنيين المسندين لها في الشهر المحدد.':'لا توجد فرق تركيب نشطة حاليًا.';
  }

  function renderTeams(m){
    const data=state.data||{},teamMap=new Map((data.teams||[]).map(t=>[String(t.id),{id:String(t.id),name:t.name,count:0,total:0}]));let unassigned={id:'',name:'غير موزعين على فرقة',count:0,total:0};
    (data.technicians||[]).forEach(name=>{const id=String(m.assignments.get(name)||''),target=teamMap.get(id)||unassigned;target.count++;target.total+=technicianMonthlyTotal(name,m)});
    const rows=[...teamMap.values(),unassigned].filter(x=>x.count>0);
    $('installationCostsTeamSummaryBody').innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${x.count}</td><td>${money(x.total)}</td><td>${money(x.count?x.total/x.count:0)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">لا توجد بيانات فرق لهذا الشهر.</td></tr>';
  }

  function renderTable(m){
    const d=state.data||{},cats=d.categories||[],techs=d.technicians||[],editable=can('edit');
    $('installationCostsTableHead').innerHTML=`<tr><th>الفني</th><th>الفرقة</th>${cats.map(c=>`<th>${esc(c.name)}<small>شهري</small></th>`).join('')}<th>إجمالي الشهر</th><th>الإجراءات</th></tr>`;
    const teamOptions=`<option value="">غير موزع</option>${(d.teams||[]).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}`;
    $('installationCostsTableBody').innerHTML=techs.length?techs.map(name=>{
      const teamId=String(m.assignments.get(name)||'');
      const cells=cats.map(c=>{const k=annualKey(name,c.id),value=effective(name,c.id,m),over=m.monthly.has(k);return `<td data-label="${esc(c.name)}"><div class="installation-cost-cell"><input type="number" min="0" step="0.01" value="${value.toFixed(2)}" data-cost-monthly data-technician="${esc(name)}" data-category="${esc(c.id)}" ${editable?'':'disabled'}><small class="${over?'is-overridden':''}">${over?'معدل لهذا الشهر':`من الإجمالي: ${money(m.annual.get(k)||0)}`}</small></div></td>`}).join('');
      return `<tr><td data-label="الفني"><strong>${esc(name)}</strong></td><td data-label="الفرقة"><select data-cost-team data-technician="${esc(name)}" ${editable?'':'disabled'}>${teamOptions}</select></td>${cells}<td data-label="إجمالي الشهر"><strong>${money(technicianMonthlyTotal(name,m))}</strong></td><td data-label="الإجراءات"><div class="installation-cost-actions"><button type="button" class="secondary-btn" data-cost-annual-open="${esc(name)}">الإجمالي السنوي</button>${editable?`<button type="button" class="ghost-btn" data-cost-reset-month="${esc(name)}">استعادة من الإجمالي</button>`:''}</div></td></tr>`;
    }).join(''):'<tr><td colspan="99" class="empty-cell">لا توجد أسماء فنيين مسجلة في نظام التركيبات.</td></tr>';
    document.querySelectorAll('[data-cost-team]').forEach(sel=>{sel.value=String(m.assignments.get(sel.dataset.technician)||'')});
  }

  function renderCategoryManager(){
    const list=$('installationCostCategoryList');if(!list)return;const deletable=can('delete');
    list.innerHTML=(state.data?.categories||[]).map(c=>`<div class="installation-cost-category-row"><span><strong>${esc(c.name)}</strong><small>${c.is_system?'بند أساسي':'بند مضاف'}</small></span>${!c.is_system&&deletable?`<button class="danger-btn" type="button" data-cost-category-delete="${esc(c.id)}">حذف</button>`:''}</div>`).join('')||'<p class="empty-cell">لا توجد بنود.</p>';
  }

  function render(){if(!state.data)return;const m=maps();renderKpis(m);renderTeams(m);renderTable(m);renderCategoryManager()}

  async function load(){
    const p=selectedPeriod();setStatus('جاري تحميل تكلفة قسم التركيبات...');
    try{state.data=await window.InstallationsServiceSafe.installationCostWorkspace(p.year,p.month);state.loaded=true;render();setStatus('')}
    catch(e){setStatus(e.message||'تعذر تحميل تكلفة قسم التركيبات.','error')}
  }

  function openAnnual(name){
    const d=state.data||{},m=maps(),dialog=$('installationCostAnnualDialog');$('installationCostAnnualTechnician').textContent=name;$('installationCostAnnualTechnicianName').value=name;
    $('installationCostAnnualBody').innerHTML=(d.categories||[]).map(c=>{const v=m.annual.get(annualKey(name,c.id))||0;return `<tr><td><strong>${esc(c.name)}</strong></td><td><input type="number" min="0" step="0.01" value="${Number(v).toFixed(2)}" data-cost-annual-input data-category="${esc(c.id)}" ${can('edit')?'':'disabled'}></td><td>${money(v/12)}</td></tr>`}).join('');
    const total=technicianAnnualTotal(name,m);$('installationCostAnnualTotal').textContent=money(total);$('installationCostAnnualMonthly').textContent=money(total/12);dialog?.showModal();
  }

  async function saveAnnualDialog(){
    const name=$('installationCostAnnualTechnicianName').value,p=selectedPeriod(),inputs=[...document.querySelectorAll('[data-cost-annual-input]')];setStatus('جاري حفظ الإجمالي السنوي...');
    try{for(const input of inputs)await window.InstallationsServiceSafe.saveInstallationCostAnnual({year:p.year,technicianName:name,categoryId:input.dataset.category,annualTotal:Number(input.value||0)});$('installationCostAnnualDialog')?.close();await load();setStatus('تم حفظ الإجمالي السنوي وتحديث التكلفة الشهرية.','success')}
    catch(e){setStatus(e.message,'error')}
  }

  async function addCategory(){
    const input=$('installationCostCategoryName'),name=input?.value.trim();if(!name)return;setStatus('جاري إضافة بند التكلفة...');try{await window.InstallationsServiceSafe.saveInstallationCostCategory({name});input.value='';await load();setStatus('تمت إضافة بند التكلفة.','success')}catch(e){setStatus(e.message,'error')}
  }

  async function copyPrevious(){
    const p=selectedPeriod();if(!confirm('سيتم نسخ تعديلات التكلفة وتوزيع الفرق من الشهر السابق إلى الشهر المحدد. متابعة؟'))return;setStatus('جاري نسخ بيانات الشهر السابق...');try{const r=await window.InstallationsServiceSafe.copyPreviousInstallationCostMonth(p.year,p.month);await load();setStatus(`تم نسخ ${r.monthly} قيمة شهرية و${r.assignments} توزيع فرقة.`,'success')}catch(e){setStatus(e.message,'error')}
  }

  function bind(){
    fillPeriodSelectors();
    window.addEventListener('kyum-view-changed',e=>{if(e.detail?.view==='installationCosts')load()});
    document.addEventListener('click',async e=>{
      if(e.target.closest('[data-view="installationCosts"]'))setTimeout(load,0);
      const annual=e.target.closest('[data-cost-annual-open]');if(annual){openAnnual(annual.dataset.costAnnualOpen);return}
      const reset=e.target.closest('[data-cost-reset-month]');if(reset){const p=selectedPeriod();if(!confirm(`استعادة تكلفة ${reset.dataset.costResetMonth} لهذا الشهر من الإجمالي السنوي؟`))return;try{await window.InstallationsServiceSafe.clearInstallationCostMonth({year:p.year,month:p.month,technicianName:reset.dataset.costResetMonth});await load();setStatus('تمت استعادة تكلفة الشهر من الإجمالي السنوي.','success')}catch(err){setStatus(err.message,'error')}return}
      const del=e.target.closest('[data-cost-category-delete]');if(del){if(!confirm('حذف بند التكلفة سيحذف قيمه التاريخية أيضًا. هل تريد المتابعة؟'))return;try{await window.InstallationsServiceSafe.removeInstallationCostCategory(del.dataset.costCategoryDelete);await load();setStatus('تم حذف بند التكلفة.','success')}catch(err){setStatus(err.message,'error')}return}
    });
    $('installationCostsYear')?.addEventListener('change',load);$('installationCostsMonth')?.addEventListener('change',load);$('refreshInstallationCostsBtn')?.addEventListener('click',load);
    $('copyPreviousInstallationCostsBtn')?.addEventListener('click',copyPrevious);
    $('openInstallationCostCategoryDialog')?.addEventListener('click',()=>{$('installationCostCategoryDialog')?.showModal()});
    $('closeInstallationCostCategoryDialog')?.addEventListener('click',()=>$('installationCostCategoryDialog')?.close());$('addInstallationCostCategoryBtn')?.addEventListener('click',addCategory);
    $('closeInstallationCostAnnualDialog')?.addEventListener('click',()=>$('installationCostAnnualDialog')?.close());$('saveInstallationCostAnnualBtn')?.addEventListener('click',saveAnnualDialog);
    $('installationCostsTableBody')?.addEventListener('change',async e=>{
      const p=selectedPeriod();
      if(e.target.matches('[data-cost-team]')){try{await window.InstallationsServiceSafe.saveInstallationCostTeamAssignment({year:p.year,month:p.month,technicianName:e.target.dataset.technician,teamId:e.target.value||null});await load();setStatus('تم تحديث توزيع الفني على الفرقة.','success')}catch(err){setStatus(err.message,'error')}}
      if(e.target.matches('[data-cost-monthly]')){try{await window.InstallationsServiceSafe.saveInstallationCostMonth({year:p.year,month:p.month,technicianName:e.target.dataset.technician,categoryId:e.target.dataset.category,amount:Number(e.target.value||0)});await load();setStatus('تم حفظ تعديل تكلفة الشهر فقط.','success')}catch(err){setStatus(err.message,'error')}}
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bind):bind();
})();
