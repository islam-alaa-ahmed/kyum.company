(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={exceptions:[],technicians:[],reportRows:[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>d?new Intl.DateTimeFormat('ar-EG-u-ca-gregory',{year:'numeric',month:'short',day:'numeric'}).format(new Date(d)):'—';
  function status(el,msg,type=''){if(!el)return;el.textContent=msg||'';el.classList.toggle('hidden',!msg);el.dataset.type=type;}
  function can(screen,action='view'){const p=window.CustomerPermissions;return !p?.can || p.can(screen,action)!==false;}

  async function loadExceptions(){
    const box=$('installationExceptionsStatus'); status(box,'جاري تحميل الاستثناءات...');
    try{
      const [rows,techs]=await Promise.all([window.InstallationsServiceSafe.exceptionList(),window.InstallationsServiceSafe.technicians()]);
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
    $('installationRevisitDate').value=r.activeRevisit?.scheduledDate||'';$('installationRevisitTimeSlot').value=r.activeRevisit?.timeSlot||'صباحي';
    $('installationRevisitTechnician').value=r.activeRevisit?.technicianId||r.technicianId||'';$('installationRevisitAction').value=r.activeRevisit?.actionType||'إعادة زيارة';$('installationRevisitNotes').value=r.activeRevisit?.notes||'';
    status($('installationRevisitFormStatus'),'');$('installationRevisitDialog').showModal();
  }
  async function saveRevisit(e){
    e.preventDefault();const box=$('installationRevisitFormStatus');status(box,'جاري الحفظ...');
    try{await window.InstallationsServiceSafe.saveRevisit({requestId:$('installationRevisitRequestId').value,scheduledDate:$('installationRevisitDate').value,timeSlot:$('installationRevisitTimeSlot').value,technicianId:$('installationRevisitTechnician').value,actionType:$('installationRevisitAction').value,notes:$('installationRevisitNotes').value.trim()});$('installationRevisitDialog').close();await loadExceptions();}
    catch(err){status(box,err.message||'تعذر حفظ إعادة الزيارة.','error');}
  }

  const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'SAR',minimumFractionDigits:2}).format(Number(v||0));
  const num=v=>new Intl.NumberFormat('en-US').format(Number(v||0));
  function fillReportOptions(data){
    const configs=[['installationReportsRepresentativeFilter',data.representatives,'كل المندوبين'],['installationReportsTeamFilter',data.teams,'كل الفرق'],['installationReportsTechnicianFilter',data.technicians,'كل الفنيين']];
    configs.forEach(([id,rows,label])=>{const el=$(id);if(!el)return;const current=el.value;el.innerHTML=`<option value="">${label}</option>`+(rows||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');el.value=current;});
  }
  async function loadReports(){
    const box=$('installationReportsStatus');status(box,'جاري إعداد التقارير المالية والتشغيلية...');
    try{const data=await window.InstallationsServiceSafe.operationalReport({dateFrom:$('installationReportsDateFrom')?.value||'',dateTo:$('installationReportsDateTo')?.value||'',representativeId:$('installationReportsRepresentativeFilter')?.value||'',teamId:$('installationReportsTeamFilter')?.value||'',technicianId:$('installationReportsTechnicianFilter')?.value||'',status:$('installationReportsStatusFilter')?.value||''});state.reportRows=data.rows;state.reportData=data;state.technicians=data.technicians;fillTechs();fillReportOptions(data);renderReport(data);status(box,'');}
    catch(e){status(box,e.message||'تعذر إعداد تقارير التركيبات.','error');}
  }
  const empty=(cols,msg='لا توجد بيانات للفترة المحددة.')=>`<tr><td colspan="${cols}" class="empty-cell">${msg}</td></tr>`;
  function renderReport(data){
    const s=data.summary;
    $('installationReportsKpiTotal').textContent=num(s.total);$('installationReportsKpiCompleted').textContent=num(s.completed);$('installationReportsKpiRevenue').textContent=money(s.revenue);$('installationReportsKpiExpenses').textContent=money(s.expenses);$('installationReportsKpiProfit').textContent=money(s.profit);$('installationReportsKpiMargin').textContent=`${s.margin}%`;$('installationReportsKpiCompletionRate').textContent=`${s.completionRate}%`;$('installationReportsKpiRevisitRate').textContent=`${s.revisitRate}%`;$('installationReportsKpiDuration').textContent=s.averageDurationMinutes==null?'—':`${num(s.averageDurationMinutes)} دقيقة`;
    $('installationFinancialReportBody').innerHTML=data.rows.length?data.rows.map(r=>`<tr><td>${esc(r.requestNumber)}</td><td>${esc(r.customerName)}</td><td>${esc(r.representativeName)}</td><td>${esc(r.teamName)}</td><td>${esc(r.technicianName)}</td><td>${esc(r.status)}</td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td class="${r.profit<0?'negative-value':'positive-value'}">${money(r.profit)}</td><td>${fmt(r.completedAt||r.scheduledDate)}</td></tr>`).join(''):empty(10);
    $('installationRepresentativeReportBody').innerHTML=data.byRepresentative.length?data.byRepresentative.map(r=>`<tr><td>${esc(r.name)}</td><td>${num(r.total)}</td><td>${num(r.completed)}</td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td>${money(r.profit)}</td><td>${money(r.averageOrderValue)}</td><td>${r.completionRate}%</td></tr>`).join(''):empty(8);
    $('installationTeamReportBody').innerHTML=data.byTeam.length?data.byTeam.map(r=>`<tr><td>${esc(r.name)}</td><td>${num(r.total)}</td><td>${num(r.completed)}</td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td>${money(r.profit)}</td><td>${r.averageDurationMinutes==null?'—':num(r.averageDurationMinutes)+' دقيقة'}</td><td>${num(r.revisits)}</td><td>${r.completionRate}%</td></tr>`).join(''):empty(9);
    $('installationTechnicianReportBody').innerHTML=data.byTechnician.length?data.byTechnician.map(r=>`<tr><td>${esc(r.name)}</td><td>${num(r.total)}</td><td>${num(r.completed)}</td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td>${money(r.profit)}</td><td>${num(r.exceptions)}</td><td>${num(r.revisits)}</td><td>${r.completionRate}%</td></tr>`).join(''):empty(9);
    $('installationInvoiceReportBody').innerHTML=data.rows.length?data.rows.map(r=>`<tr><td>${esc(r.requestNumber)}</td><td>${esc(r.invoiceNumber||'—')}</td><td>${esc(r.customerName)}</td><td>${esc(r.representativeName)}</td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td>${money(r.profit)}</td><td>${fmt(r.invoiceDate)}</td><td><span class="status-badge">${r.isInvoiced?'مفوتر':'غير مفوتر'}</span></td></tr>`).join(''):empty(9);
    const max=Math.max(1,...data.rows.map(r=>Math.max(0,r.profit)));$('installationProfitabilityBars').innerHTML=data.rows.length?data.rows.slice().sort((a,b)=>b.profit-a.profit).slice(0,12).map(r=>`<div class="installation-profitability-row"><div><strong>${esc(r.requestNumber)}</strong><span>${esc(r.customerName)}</span></div><div class="installation-profitability-track"><span style="width:${Math.max(2,Math.round(Math.max(0,r.profit)/max*100))}%"></span></div><strong>${money(r.profit)}</strong></div>`).join(''):'<p class="empty-cell">لا توجد بيانات ربحية.</p>';
    const reasons=$('installationFailureReasonsReport');reasons.innerHTML=data.failureReasons.length?data.failureReasons.map(r=>`<div><span>${esc(r.reason)}</span><strong>${r.count}</strong></div>`).join(''):'<p class="empty-cell">لا توجد أسباب تعثر مسجلة.</p>';
  }
  function exportCsv(){
    const rows=state.reportRows;if(!rows.length)return;
    const head=['رقم الطلب','العميل','المندوب','الفرقة','الفني','الحالة','قيمة الفاتورة','مصاريف التركيب','صافي الربح','رقم الفاتورة','تاريخ الفاتورة','تاريخ التنفيذ','إعادة الزيارة'];
    const lines=[head,...rows.map(r=>[r.requestNumber,r.customerName,r.representativeName,r.teamName,r.technicianName,r.status,r.revenue,r.expenses,r.profit,r.invoiceNumber,r.invoiceDate,r.completedAt||r.scheduledDate,r.revisitCount])].map(a=>a.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`installation-financial-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
  }
  function bind(){
    ['installationExceptionsSearch','installationExceptionsStatusFilter','installationExceptionsReasonFilter'].forEach(id=>$(id)?.addEventListener(id.endsWith('Search')?'input':'change',renderExceptions));
    $('refreshInstallationExceptionsBtn')?.addEventListener('click',loadExceptions);$('resetInstallationExceptionsFilters')?.addEventListener('click',()=>{['installationExceptionsSearch','installationExceptionsStatusFilter','installationExceptionsReasonFilter'].forEach(id=>{$(id).value=''});renderExceptions();});
    $('installationExceptionsCards')?.addEventListener('click',e=>{const b=e.target.closest('[data-installation-revisit]');if(b)openRevisit(b.dataset.installationRevisit);});
    $('installationRevisitForm')?.addEventListener('submit',saveRevisit);['closeInstallationRevisitDialog','cancelInstallationRevisit'].forEach(id=>$(id)?.addEventListener('click',()=>$('installationRevisitDialog').close()));
    $('refreshInstallationReportsBtn')?.addEventListener('click',loadReports);$('exportInstallationReportsBtn')?.addEventListener('click',exportCsv);
    ['installationReportsDateFrom','installationReportsDateTo','installationReportsRepresentativeFilter','installationReportsTeamFilter','installationReportsTechnicianFilter','installationReportsStatusFilter'].forEach(id=>$(id)?.addEventListener('change',loadReports));
    $('resetInstallationReportsFilters')?.addEventListener('click',()=>{['installationReportsDateFrom','installationReportsDateTo','installationReportsRepresentativeFilter','installationReportsTeamFilter','installationReportsTechnicianFilter','installationReportsStatusFilter'].forEach(id=>{$(id).value=''});loadReports();});
    document.querySelectorAll('[data-installation-report-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-installation-report-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-installation-report-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.installationReportPanel!==btn.dataset.installationReportTab));}));
    document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(!nav)return;if(nav.dataset.view==='installationExceptions')loadExceptions();if(nav.dataset.view==='installationReports')loadReports();});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bind):bind();
})();