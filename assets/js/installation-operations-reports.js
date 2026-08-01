(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={exceptions:[],technicians:[],reportRows:[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>d?new Intl.DateTimeFormat('ar-EG',{year:'numeric',month:'short',day:'numeric'}).format(new Date(d)):'—';
  function status(el,msg,type=''){if(!el)return;el.textContent=msg||'';el.classList.toggle('hidden',!msg);el.dataset.type=type;}
  function can(screen,action='view'){const p=window.CustomerPermissions;return !p?.can || p.can(screen,action)!==false;}

  async function loadExceptions(){
    const box=$('installationExceptionsStatus'); status(box,'جاري تحميل الاستثناءات...');
    try{
      const [rows,techs]=await Promise.all([window.InstallationsService.exceptionList(),window.InstallationsService.technicians()]);
      state.exceptions=rows;state.technicians=techs;fillTechs();renderExceptions();status(box,'');
    }catch(e){status(box,e.message||'تعذر تحميل الاستثناءات.','error');}
  }
  function fillTechs(){
    const selects=[$('installationRevisitTechnician'),$('installationReportsTechnicianFilter')];
    selects.forEach(sel=>{if(!sel)return;const first=sel.id==='installationRevisitTechnician'?'<option value="">اختر الفني</option>':'<option value="">كل الفنيين</option>';sel.innerHTML=first+state.technicians.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');});
  }
  function filteredExceptions(){
    const q=($('installationExceptionsSearch')?.value||'').trim().toLowerCase();
    const st=$('installationExceptionsStatusFilter')?.value||'';
    const reason=$('installationExceptionsReasonFilter')?.value||'';
    return state.exceptions.filter(r=>(!st||r.status===st)&&(!reason||r.failureReason===reason)&&(!q||[r.requestNumber,r.customerName,r.customerPhone,r.technicianName].some(x=>String(x||'').toLowerCase().includes(q))));
  }
  function renderExceptions(){
    const rows=filteredExceptions(), host=$('installationExceptionsCards');
    const all=state.exceptions;
    $('installationExceptionsKpiTotal').textContent=all.length;
    $('installationExceptionsKpiPending').textContent=all.filter(x=>!x.activeRevisit).length;
    $('installationExceptionsKpiScheduled').textContent=all.filter(x=>x.activeRevisit?.status==='مجدولة').length;
    $('installationExceptionsKpiClosed').textContent=all.filter(x=>x.activeRevisit?.status==='مغلقة').length;
    if(!rows.length){host.innerHTML='<div class="panel empty-cell">لا توجد استثناءات مطابقة.</div>';return;}
    host.innerHTML=rows.map(r=>`<article class="panel installation-exception-card">
      <div class="installation-exception-head"><div><strong>${esc(r.requestNumber)}</strong><span>${esc(r.customerName)}</span></div><span class="status-badge">${esc(r.status)}</span></div>
      <dl><div><dt>الفني</dt><dd>${esc(r.technicianName||'غير مسند')}</dd></div><div><dt>سبب التعثر</dt><dd>${esc(r.failureReason||'غير محدد')}</dd></div><div><dt>الموعد السابق</dt><dd>${fmt(r.scheduledDate)}</dd></div><div><dt>إعادة الزيارة</dt><dd>${r.activeRevisit?`${fmt(r.activeRevisit.scheduledDate)} — ${esc(r.activeRevisit.status)}`:'غير مجدولة'}</dd></div></dl>
      <p>${esc(r.executionNotes||'لا توجد ملاحظات تنفيذ.')}</p>
      <div class="installation-exception-actions">${can('installationExceptions','edit')?`<button class="primary-btn" type="button" data-installation-revisit="${esc(r.id)}">${r.activeRevisit?'تعديل إعادة الزيارة':'جدولة إعادة زيارة'}</button>`:''}</div>
    </article>`).join('');
  }
  function openRevisit(id){
    const r=state.exceptions.find(x=>String(x.id)===String(id));if(!r)return;
    $('installationRevisitRequestId').value=r.id;$('installationRevisitRequestLabel').textContent=`${r.requestNumber} — ${r.customerName}`;
    $('installationRevisitDate').value=r.activeRevisit?.scheduledDate||'';$('installationRevisitTimeSlot').value=r.activeRevisit?.timeSlot||'صباحية';
    $('installationRevisitTechnician').value=r.activeRevisit?.technicianId||r.technicianId||'';$('installationRevisitAction').value=r.activeRevisit?.actionType||'إعادة زيارة';$('installationRevisitNotes').value=r.activeRevisit?.notes||'';
    status($('installationRevisitFormStatus'),'');$('installationRevisitDialog').showModal();
  }
  async function saveRevisit(e){
    e.preventDefault();const box=$('installationRevisitFormStatus');status(box,'جاري الحفظ...');
    try{await window.InstallationsService.saveRevisit({requestId:$('installationRevisitRequestId').value,scheduledDate:$('installationRevisitDate').value,timeSlot:$('installationRevisitTimeSlot').value,technicianId:$('installationRevisitTechnician').value,actionType:$('installationRevisitAction').value,notes:$('installationRevisitNotes').value.trim()});$('installationRevisitDialog').close();await loadExceptions();}
    catch(err){status(box,err.message||'تعذر حفظ إعادة الزيارة.','error');}
  }

  async function loadReports(){
    const box=$('installationReportsStatus');status(box,'جاري إعداد التقرير...');
    try{const data=await window.InstallationsService.operationalReport({dateFrom:$('installationReportsDateFrom')?.value||'',dateTo:$('installationReportsDateTo')?.value||'',technicianId:$('installationReportsTechnicianFilter')?.value||''});state.reportRows=data.rows;state.technicians=data.technicians;fillTechs();renderReport(data);status(box,'');}
    catch(e){status(box,e.message||'تعذر إعداد تقرير التركيبات.','error');}
  }
  function renderReport(data){
    const s=data.summary;$('installationReportsKpiTotal').textContent=s.total;$('installationReportsKpiCompleted').textContent=s.completed;$('installationReportsKpiCompletionRate').textContent=`${s.completionRate}%`;$('installationReportsKpiRevisitRate').textContent=`${s.revisitRate}%`;$('installationReportsKpiDuration').textContent=s.averageDurationMinutes==null?'—':`${s.averageDurationMinutes} دقيقة`;
    const body=$('installationTechnicianReportBody');body.innerHTML=data.byTechnician.length?data.byTechnician.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.total}</td><td>${r.completed}</td><td>${r.exceptions}</td><td>${r.revisits}</td><td>${r.completionRate}%</td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">لا توجد بيانات للفترة المحددة.</td></tr>';
    const reasons=$('installationFailureReasonsReport');reasons.innerHTML=data.failureReasons.length?data.failureReasons.map(r=>`<div><span>${esc(r.reason)}</span><strong>${r.count}</strong></div>`).join(''):'<p class="empty-cell">لا توجد أسباب تعثر مسجلة.</p>';
  }
  function exportCsv(){
    const rows=state.reportRows;if(!rows.length)return;
    const head=['رقم الطلب','العميل','الفني','الحالة','تاريخ التركيب','سبب التعثر','عدد إعادة الزيارة'];
    const lines=[head,...rows.map(r=>[r.requestNumber,r.customerName,r.technicianName,r.status,r.scheduledDate,r.failureReason,r.revisitCount])].map(a=>a.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`installation-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
  }
  function bind(){
    ['installationExceptionsSearch','installationExceptionsStatusFilter','installationExceptionsReasonFilter'].forEach(id=>$(id)?.addEventListener(id.endsWith('Search')?'input':'change',renderExceptions));
    $('refreshInstallationExceptionsBtn')?.addEventListener('click',loadExceptions);$('resetInstallationExceptionsFilters')?.addEventListener('click',()=>{['installationExceptionsSearch','installationExceptionsStatusFilter','installationExceptionsReasonFilter'].forEach(id=>{$(id).value=''});renderExceptions();});
    $('installationExceptionsCards')?.addEventListener('click',e=>{const b=e.target.closest('[data-installation-revisit]');if(b)openRevisit(b.dataset.installationRevisit);});
    $('installationRevisitForm')?.addEventListener('submit',saveRevisit);['closeInstallationRevisitDialog','cancelInstallationRevisit'].forEach(id=>$(id)?.addEventListener('click',()=>$('installationRevisitDialog').close()));
    $('refreshInstallationReportsBtn')?.addEventListener('click',loadReports);$('exportInstallationReportsBtn')?.addEventListener('click',exportCsv);['installationReportsDateFrom','installationReportsDateTo','installationReportsTechnicianFilter'].forEach(id=>$(id)?.addEventListener('change',loadReports));
    $('resetInstallationReportsFilters')?.addEventListener('click',()=>{['installationReportsDateFrom','installationReportsDateTo','installationReportsTechnicianFilter'].forEach(id=>{$(id).value=''});loadReports();});
    document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(!nav)return;if(nav.dataset.view==='installationExceptions')loadExceptions();if(nav.dataset.view==='installationReports')loadReports();});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bind):bind();
})();
