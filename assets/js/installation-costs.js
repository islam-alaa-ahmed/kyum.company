(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`SAR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
  const can=action=>window.PermissionEngine?.can?.('installationCosts',action)===true||window.CustomerPermissions?.can?.('installationCosts',action)===true;
  let state={data:null,mode:'annual',loaded:false};

  function setStatus(text,type=''){const el=$('installationCostsStatus');if(!el)return;el.textContent=text||'';el.classList.toggle('hidden',!text);el.dataset.type=type}
  function nowDefaults(){const d=new Date();return {year:d.getFullYear(),month:d.getMonth()+1}}
  function selectedPeriod(){return {year:Number($('installationCostsYear')?.value||nowDefaults().year),month:Number($('installationCostsMonth')?.value||nowDefaults().month)}}
  function key(technicianId,categoryId){return `${technicianId}::${categoryId}`}
  function maps(){
    const d=state.data||{},annual=new Map(),monthly=new Map(),memberships=new Map();
    (d.annual||[]).forEach(x=>annual.set(key(x.technician_id,x.category_id),Number(x.annual_total||0)));
    (d.monthly||[]).forEach(x=>monthly.set(key(x.technician_id,x.category_id),Number(x.amount||0)));
    (d.memberships||[]).forEach(x=>memberships.set(String(x.technician_id),String(x.team_id)));
    return {annual,monthly,memberships};
  }
  function effective(tid,cid,m){const k=key(tid,cid);return m.monthly.has(k)?m.monthly.get(k):round((m.annual.get(k)||0)/12)}
  function techTotal(t,m,mode=state.mode){return (state.data?.categories||[]).reduce((sum,c)=>sum+(mode==='annual'?(m.annual.get(key(t.id,c.id))||0):effective(t.id,c.id,m)),0)}
  function periodLabel(){const p=selectedPeriod();return state.mode==='annual'?`سنة ${p.year}`:`${$('installationCostsMonth')?.selectedOptions?.[0]?.textContent||p.month} ${p.year}`}

  function fillPeriodSelectors(){
    const y=$('installationCostsYear'),m=$('installationCostsMonth');if(!y||!m)return;const n=nowDefaults(),cy=Number(y.value||n.year),cm=Number(m.value||n.month);
    y.innerHTML='';for(let year=n.year-3;year<=n.year+4;year++){const o=document.createElement('option');o.value=year;o.textContent=year;y.appendChild(o)}y.value=String(cy);
    const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];m.innerHTML=months.map((x,i)=>`<option value="${i+1}">${x}</option>`).join('');m.value=String(cm);
  }
  function syncModeUi(){
    document.querySelectorAll('[data-cost-mode]').forEach(b=>b.classList.toggle('active',b.dataset.costMode===state.mode));
    $('installationCostsMonthField')?.classList.toggle('hidden',state.mode==='annual');
    $('copyPreviousInstallationCostsBtn')?.classList.toggle('hidden',state.mode==='annual');
    if($('installationCostsTechnicianNote'))$('installationCostsTechnicianNote').textContent=state.mode==='annual'?'أدخل إجمالي تكلفة السنة لكل موظف حسب البنود.':'تكلفة الشهر تحسب من إجمالي السنة ويمكن تعديل الشهر الحالي بشكل مستقل.';
    if($('installationCostsTeamsNote'))$('installationCostsTeamsNote').textContent=`تكلفة كل فرقة حسب ${state.mode==='annual'?'تكلفة السنة':'الشهر المحدد'} للموظفين الموجودين داخلها.`;
  }
  function renderKpis(m){
    const techs=state.data?.technicians||[],teams=state.data?.teams||[];
    const annual=techs.reduce((s,t)=>s+techTotal(t,m,'annual'),0),monthly=techs.reduce((s,t)=>s+techTotal(t,m,'monthly'),0);
    $('installationCostsKpiTechnicians').textContent=String(techs.length);$('installationCostsKpiTeams').textContent=String(teams.length);
    $('installationCostsKpiAnnual').textContent=money(annual);$('installationCostsKpiMonth').textContent=money(monthly);
    const activeTotal=state.mode==='annual'?annual:monthly;$('installationCostsKpiAverageTeam').textContent=money(teams.length?activeTotal/teams.length:0);
    const lab=$('installationCostsKpiAverageTeamLabel');if(lab)lab.textContent=`متوسط تكلفة الفرقة — ${state.mode==='annual'?'سنوي':'شهري'}`;
  }
  function renderTechnicians(m){
    const d=state.data||{},cats=d.categories||[],techs=d.technicians||[],editable=can('edit'),deletable=can('delete');
    $('installationCostsTableHead').innerHTML=`<tr><th>الموظف</th>${cats.map(c=>`<th>${esc(c.name)}<small>${state.mode==='annual'?'سنوي':'شهري'}</small></th>`).join('')}<th>الإجمالي</th><th>الإجراءات</th></tr>`;
    $('installationCostsTableBody').innerHTML=techs.length?techs.map(t=>{
      const cells=cats.map(c=>{const k=key(t.id,c.id),annual=m.annual.get(k)||0,monthly=effective(t.id,c.id,m),over=m.monthly.has(k),value=state.mode==='annual'?annual:monthly;return `<td data-label="${esc(c.name)}"><div class="installation-cost-cell"><input type="number" min="0" step="0.01" value="${Number(value).toFixed(2)}" data-cost-value data-technician="${esc(t.id)}" data-category="${esc(c.id)}" ${editable?'':'disabled'}><small class="${state.mode==='monthly'&&over?'is-overridden':''}">${state.mode==='annual'?`شهري افتراضي: ${money(annual/12)}`:(over?'معدل لهذا الشهر':`من السنوي: ${money(annual)}`)}</small></div></td>`}).join('');
      return `<tr><td data-label="الموظف"><strong>${esc(t.name)}</strong></td>${cells}<td data-label="الإجمالي"><strong>${money(techTotal(t,m))}</strong></td><td data-label="الإجراءات"><div class="installation-cost-actions"><button type="button" class="secondary-btn" data-cost-tech-edit="${esc(t.id)}">تعديل</button>${state.mode==='monthly'&&editable?`<button type="button" class="ghost-btn" data-cost-reset-month="${esc(t.id)}">استعادة من السنوي</button>`:''}${deletable?`<button type="button" class="danger-btn" data-cost-tech-delete="${esc(t.id)}">حذف</button>`:''}</div></td></tr>`;
    }).join(''):'<tr><td colspan="99" class="empty-cell">لا يوجد موظفون في مركز تكلفة التركيبات. استخدم زر «إضافة موظف».</td></tr>';
  }
  function renderTeams(m){
    const d=state.data||{},teams=d.teams||[],techs=d.technicians||[],membership=m.memberships;
    $('installationCostTeamsGrid').innerHTML=teams.length?teams.map(team=>{
      const members=techs.filter(t=>membership.get(String(t.id))===String(team.id));const total=members.reduce((s,t)=>s+techTotal(t,m),0);
      return `<article class="panel installation-cost-team-card"><div class="installation-cost-team-card-head"><div><h4>${esc(team.name)}</h4><span>${members.length} موظف</span></div><strong>${money(total)}</strong></div><div class="installation-cost-team-members">${members.length?members.map(t=>`<div><span>${esc(t.name)}</span><strong>${money(techTotal(t,m))}</strong></div>`).join(''):'<p class="empty-cell">لا يوجد موظفون داخل الفرقة.</p>'}</div><div class="installation-cost-team-actions"><button class="secondary-btn" type="button" data-cost-team-members="${esc(team.id)}">إدارة الموظفين</button><button class="ghost-btn" type="button" data-cost-team-edit="${esc(team.id)}">تعديل الاسم</button>${can('delete')?`<button class="danger-btn" type="button" data-cost-team-delete="${esc(team.id)}">حذف الفرقة</button>`:''}</div></article>`;
    }).join(''):'<div class="panel installation-cost-empty-team"><p>لم يتم إنشاء فرق تكلفة بعد.</p></div>';
    const unassigned=techs.filter(t=>!membership.get(String(t.id)));$('installationCostsUnassigned').innerHTML=unassigned.length?`<strong>غير موزعين على فرق:</strong> ${unassigned.map(t=>esc(t.name)).join('، ')}`:'<span>كل الموظفين موزعون على فرق.</span>';
  }
  function renderCategoryManager(){const list=$('installationCostCategoryList');if(!list)return;const deletable=can('delete');list.innerHTML=(state.data?.categories||[]).map(c=>`<div class="installation-cost-category-row"><span><strong>${esc(c.name)}</strong><small>${c.is_system?'بند أساسي':'بند مضاف'}</small></span>${!c.is_system&&deletable?`<button class="danger-btn" type="button" data-cost-category-delete="${esc(c.id)}">حذف</button>`:''}</div>`).join('')||'<p class="empty-cell">لا توجد بنود.</p>'}
  function render(){if(!state.data)return;syncModeUi();const m=maps();renderKpis(m);renderTechnicians(m);renderTeams(m);renderCategoryManager()}

  async function load(){const p=selectedPeriod();setStatus('جاري تحميل تكلفة قسم التركيبات...');try{state.data=await window.InstallationsServiceSafe.installationCostWorkspace(p.year,p.month);state.loaded=true;render();setStatus('')}catch(e){setStatus(e.message||'تعذر تحميل تكلفة قسم التركيبات.','error')}}

  function openTechnician(id=''){const t=(state.data?.technicians||[]).find(x=>String(x.id)===String(id));$('installationCostTechnicianId').value=t?.id||'';$('installationCostTechnicianName').value=t?.name||'';$('installationCostTechnicianDialogTitle').textContent=t?'تعديل الموظف':'إضافة موظف';$('installationCostTechnicianDialog')?.showModal()}
  async function saveTechnician(){const id=$('installationCostTechnicianId').value||null,name=$('installationCostTechnicianName').value.trim();if(!name)return;setStatus('جاري حفظ الموظف...');try{await window.InstallationsServiceSafe.saveInstallationCostTechnician({id,name});$('installationCostTechnicianDialog')?.close();await load();setStatus('تم حفظ الموظف.','success')}catch(e){setStatus(e.message,'error')}}
  function openTeam(id=''){const t=(state.data?.teams||[]).find(x=>String(x.id)===String(id));$('installationCostTeamId').value=t?.id||'';$('installationCostTeamName').value=t?.name||'';$('installationCostTeamDialogTitle').textContent=t?'تعديل الفرقة':'إضافة فرقة';$('installationCostTeamDialog')?.showModal()}
  async function saveTeam(){const id=$('installationCostTeamId').value||null,name=$('installationCostTeamName').value.trim();if(!name)return;setStatus('جاري حفظ الفرقة...');try{await window.InstallationsServiceSafe.saveInstallationCostTeam({id,name});$('installationCostTeamDialog')?.close();await load();setStatus('تم حفظ الفرقة.','success')}catch(e){setStatus(e.message,'error')}}
  function openMembers(teamId){const team=(state.data?.teams||[]).find(x=>String(x.id)===String(teamId)),m=maps();$('installationCostTeamMembersId').value=teamId;$('installationCostTeamMembersTitle').textContent=`موظفو ${team?.name||'الفرقة'}`;$('installationCostTeamMembersList').innerHTML=(state.data?.technicians||[]).map(t=>`<label class="installation-cost-member-option"><input type="checkbox" value="${esc(t.id)}" ${m.memberships.get(String(t.id))===String(teamId)?'checked':''}><span>${esc(t.name)}</span>${m.memberships.get(String(t.id))&&m.memberships.get(String(t.id))!==String(teamId)?'<small>موزع حاليًا على فرقة أخرى وسيتم نقله.</small>':''}</label>`).join('')||'<p class="empty-cell">أضف موظفين أولًا.</p>';$('installationCostTeamMembersDialog')?.showModal()}
  async function saveMembers(){const teamId=$('installationCostTeamMembersId').value,ids=[...$('installationCostTeamMembersList').querySelectorAll('input:checked')].map(x=>x.value);setStatus('جاري تحديث موظفي الفرقة...');try{await window.InstallationsServiceSafe.saveInstallationCostTeamMembers({teamId,technicianIds:ids});$('installationCostTeamMembersDialog')?.close();await load();setStatus('تم تحديث موظفي الفرقة.','success')}catch(e){setStatus(e.message,'error')}}
  async function addCategory(){const input=$('installationCostCategoryName'),name=input?.value.trim();if(!name)return;setStatus('جاري إضافة بند التكلفة...');try{await window.InstallationsServiceSafe.saveInstallationCostCategory({name});input.value='';await load();setStatus('تمت إضافة بند التكلفة.','success')}catch(e){setStatus(e.message,'error')}}
  async function copyPrevious(){const p=selectedPeriod();if(!confirm('سيتم نسخ تعديلات التكلفة الشهرية من الشهر السابق إلى الشهر المحدد. متابعة؟'))return;setStatus('جاري نسخ بيانات الشهر السابق...');try{const r=await window.InstallationsServiceSafe.copyPreviousInstallationCostMonth(p.year,p.month);await load();setStatus(`تم نسخ ${r.monthly} قيمة شهرية.`,'success')}catch(e){setStatus(e.message,'error')}}

  function bind(){
    fillPeriodSelectors();syncModeUi();window.addEventListener('kyum-view-changed',e=>{if(e.detail?.view==='installationCosts')load()});
    document.addEventListener('click',async e=>{
      if(e.target.closest('[data-view="installationCosts"]'))setTimeout(load,0);
      const mode=e.target.closest('[data-cost-mode]');if(mode){state.mode=mode.dataset.costMode;render();return}
      const editTech=e.target.closest('[data-cost-tech-edit]');if(editTech){openTechnician(editTech.dataset.costTechEdit);return}
      const delTech=e.target.closest('[data-cost-tech-delete]');if(delTech){const t=(state.data?.technicians||[]).find(x=>String(x.id)===String(delTech.dataset.costTechDelete));if(confirm(`حذف الموظف ${t?.name||''} من مركز التكلفة وكل بيانات تكلفته التاريخية؟`)){try{await window.InstallationsServiceSafe.removeInstallationCostTechnician(delTech.dataset.costTechDelete);await load();setStatus('تم حذف الموظف من مركز التكلفة.','success')}catch(err){setStatus(err.message,'error')}}return}
      const reset=e.target.closest('[data-cost-reset-month]');if(reset){const p=selectedPeriod();if(!confirm('استعادة تكلفة هذا الموظف للشهر من القيم السنوية؟'))return;try{await window.InstallationsServiceSafe.clearInstallationCostMonth({year:p.year,month:p.month,technicianId:reset.dataset.costResetMonth});await load();setStatus('تمت استعادة تكلفة الشهر من السنوي.','success')}catch(err){setStatus(err.message,'error')}return}
      const editTeam=e.target.closest('[data-cost-team-edit]');if(editTeam){openTeam(editTeam.dataset.costTeamEdit);return}
      const members=e.target.closest('[data-cost-team-members]');if(members){openMembers(members.dataset.costTeamMembers);return}
      const delTeam=e.target.closest('[data-cost-team-delete]');if(delTeam){if(confirm('حذف الفرقة؟ سيتم فك توزيع موظفيها فقط ولن يتم حذف الموظفين أو تكلفتهم.')){try{await window.InstallationsServiceSafe.removeInstallationCostTeam(delTeam.dataset.costTeamDelete);await load();setStatus('تم حذف الفرقة.','success')}catch(err){setStatus(err.message,'error')}}return}
      const delCat=e.target.closest('[data-cost-category-delete]');if(delCat){if(!confirm('حذف بند التكلفة سيحذف قيمه التاريخية أيضًا. هل تريد المتابعة؟'))return;try{await window.InstallationsServiceSafe.removeInstallationCostCategory(delCat.dataset.costCategoryDelete);await load();setStatus('تم حذف بند التكلفة.','success')}catch(err){setStatus(err.message,'error')}}
    });
    $('installationCostsYear')?.addEventListener('change',load);$('installationCostsMonth')?.addEventListener('change',load);$('refreshInstallationCostsBtn')?.addEventListener('click',load);$('copyPreviousInstallationCostsBtn')?.addEventListener('click',copyPrevious);
    $('addInstallationCostTechnicianBtn')?.addEventListener('click',()=>openTechnician());$('saveInstallationCostTechnicianBtn')?.addEventListener('click',saveTechnician);$('closeInstallationCostTechnicianDialog')?.addEventListener('click',()=>$('installationCostTechnicianDialog')?.close());
    $('addInstallationCostTeamBtn')?.addEventListener('click',()=>openTeam());$('saveInstallationCostTeamBtn')?.addEventListener('click',saveTeam);$('closeInstallationCostTeamDialog')?.addEventListener('click',()=>$('installationCostTeamDialog')?.close());
    $('saveInstallationCostTeamMembersBtn')?.addEventListener('click',saveMembers);$('closeInstallationCostTeamMembersDialog')?.addEventListener('click',()=>$('installationCostTeamMembersDialog')?.close());
    $('openInstallationCostCategoryDialog')?.addEventListener('click',()=>{$('installationCostCategoryDialog')?.showModal()});$('closeInstallationCostCategoryDialog')?.addEventListener('click',()=>$('installationCostCategoryDialog')?.close());$('addInstallationCostCategoryBtn')?.addEventListener('click',addCategory);
    $('installationCostsTableBody')?.addEventListener('change',async e=>{if(!e.target.matches('[data-cost-value]'))return;const p=selectedPeriod(),payload={year:p.year,month:p.month,technicianId:e.target.dataset.technician,categoryId:e.target.dataset.category};try{if(state.mode==='annual')await window.InstallationsServiceSafe.saveInstallationCostAnnual({...payload,annualTotal:Number(e.target.value||0)});else await window.InstallationsServiceSafe.saveInstallationCostMonth({...payload,amount:Number(e.target.value||0)});await load();setStatus(state.mode==='annual'?'تم حفظ تكلفة السنة.':'تم حفظ تعديل الشهر.','success')}catch(err){setStatus(err.message,'error')}});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bind):bind();
})();
