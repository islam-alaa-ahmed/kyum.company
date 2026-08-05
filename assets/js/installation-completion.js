(()=>{
  "use strict";
  let rows=[];
  let current=null;
  let mode="installation";
  let quantityCurrent=null;
  let quantityTeams=[];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=v=>new Intl.NumberFormat("ar-SA-u-nu-latn",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(Number(v||0));
  function status(el,msg,type=""){if(!el)return;el.textContent=msg||"";el.classList.toggle("hidden",!msg);el.classList.toggle("error",type==="error")}
  function date(v){return v?new Date(v).toLocaleString("ar-SA",{calendar:"gregory",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"—"}
  function today(){const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
  function reps(){const map=new Map();rows.forEach(r=>{if(r.representativeId)map.set(r.representativeId,r.representativeName||"مندوب غير محدد")});return [...map].sort((a,b)=>a[1].localeCompare(b[1],"ar"))}
  function fillReps(){const el=$("installationCompletionRepresentativeFilter");if(!el)return;const val=el.value;el.innerHTML='<option value="">كل المندوبين المسموحين</option>'+reps().map(([id,n])=>`<option value="${esc(id)}">${esc(n)}</option>`).join("");el.value=[...el.options].some(o=>o.value===val)?val:""}
  function filtered(){const q=($("installationCompletionSearch")?.value||"").trim().toLowerCase(),rep=$("installationCompletionRepresentativeFilter")?.value||"",from=$("installationCompletionDateFrom")?.value||"",to=$("installationCompletionDateTo")?.value||"";return rows.filter(r=>(!q||[r.requestNumber,r.customerName,r.customerPhone,r.technicianName].join(" ").toLowerCase().includes(q))&&(!rep||r.representativeId===rep)&&(!from||String(r.completedAt).slice(0,10)>=from)&&(!to||String(r.completedAt).slice(0,10)<=to))}
  function can(action,screen){return Boolean(window.CustomerPermissions?.canAction?.(screen,action))}
  function render(){const list=filtered(),body=$("installationCompletionTableBody");$("installationCompletionKpiCompleted").textContent=rows.length;$("installationCompletionKpiReports").textContent=rows.filter(r=>r.report).length;$("installationCompletionKpiPending").textContent=rows.filter(r=>!r.report).length;$("installationCompletionKpiPhotos").textContent=rows.reduce((n,r)=>n+r.files.filter(f=>["before","after","delivery_authorization"].includes(f.file_kind)).length,0);body.innerHTML=list.length?list.map(r=>`<tr><td data-label="رقم الطلب"><strong>${esc(r.requestNumber)}</strong></td><td data-label="العميل">${esc(r.customerName||"—")}</td><td data-label="رقم العميل" dir="ltr">${esc(r.customerPhone||"—")}</td><td data-label="المندوب">${esc(r.representativeName||"—")}</td><td data-label="الفني">${esc(r.technicianName||"—")}</td><td data-label="الفرقة">${esc(r.teamName||"—")}</td><td data-label="تاريخ الإكمال">${esc(date(r.completedAt))}</td><td data-label="الحالة"><span class="installation-doc-status is-pending">${r.quantityConfirmed?"جاهز للتحويل":"بانتظار تأكيد التنفيذ"}</span></td><td data-label="الإجراءات"><div class="installation-completion-actions">${can("edit","installationCompletion")?(r.quantityConfirmed?(can("add","salesInvoices")?`<button class="primary-btn" type="button" data-installation-completion="${r.id}">تحويل إلى فاتورة</button>`:`<span class="field-hint">لا توجد صلاحية إضافة فاتورة</span>`):`<button class="primary-btn" type="button" data-confirm-installation-quantity="${r.id}">تأكيد الكمية المنفذة</button>`):`<span class="field-hint">لا توجد صلاحية تأكيد</span>`}</div></td></tr>`).join(""):'<tr class="installation-completion-empty-row"><td colspan="9"><div class="empty-state">لا توجد تركيبات مكتملة بانتظار التحويل إلى فاتورة.</div></td></tr>'}
  async function load(){status($("installationCompletionStatus"),"جاري تحميل التركيبات المكتملة...");try{rows=await window.InstallationsServiceSafe.completionList();fillReps();render();status($("installationCompletionStatus"),"")}catch(e){status($("installationCompletionStatus"),e.message,"error")}}
  function setMode(next){mode=next;const installation=mode==="installation";$("installationCompletionDialogTitle").textContent="تحويل إلى فاتورة";$("installationCompletionWorkSection").classList.toggle("hidden",!installation);$("installationEvidenceSection").classList.toggle("hidden",!installation);$("installationCompletionExistingFiles").classList.toggle("hidden",!installation);$("printInstallationCompletion").classList.add("hidden");$("installationCompletionWorkSummary").required=installation;$("installationCompletionRecipientName").required=installation;$("installationCompletionDeliveryAuthorization").required=false;$("saveInstallationCompletion").textContent="حفظ وتحويل إلى فاتورة"}
  async function showFiles(r){const box=$("installationCompletionExistingFiles");const labels={before:"قبل التركيب",after:"بعد التركيب",delivery_authorization:"إذن تسليم العميل",signature:"توقيع عميل قديم"};box.innerHTML=r.files?.length?r.files.map(f=>`<div class="installation-existing-file"><strong>${esc(labels[f.file_kind]||"مرفق")}</strong><small>${esc(f.original_name||"مرفق")}</small><button class="secondary-btn" type="button" data-open-installation-file="${esc(f.storage_path)}">فتح</button></div>`).join(""):"<p>لا توجد مرفقات محفوظة.</p>"}

  async function ensureQuantityTeams(){
    if(quantityTeams.length)return quantityTeams;
    quantityTeams=await window.InstallationsServiceSafe.scheduleTeams();
    const el=$("installationQuantityRescheduleTeam");
    if(el)el.innerHTML='<option value="">اختر الفرقة</option>'+quantityTeams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    return quantityTeams;
  }
  function quantityLineHtml(x){
    const scheduled=Number(x.scheduledCurrentQuantity||x.remainingQuantity||0);
    return `<article class="installation-quantity-line" data-service-line="${esc(x.requestServiceId)}">
      <div class="installation-quantity-line-head"><strong>${esc(x.serviceName)}</strong><span>${money(x.unitPrice)} للوحدة</span></div>
      <div class="installation-quantity-metrics">
        <span>المطلوب <b>${x.requestedQuantity}</b></span>
        <span>المجدول للزيارة <b>${scheduled}</b></span>
        <span>منفذ سابقًا <b>${x.executedQuantity}</b></span>
        <span>المتبقي قبل التأكيد <b>${x.remainingQuantity}</b></span>
      </div>
      <label>الكمية المنفذة في الزيارة الحالية
        <input class="installation-confirmed-qty" type="number" min="0" max="${x.remainingQuantity}" step="1" value="${Math.min(scheduled,x.remainingQuantity)}" data-request-service-id="${esc(x.requestServiceId)}" data-scheduled="${scheduled}" data-remaining="${x.remainingQuantity}">
      </label>
      <small class="installation-quantity-result"></small>
    </article>`;
  }
  function syncQuantityResults(){
    let remaining=0;
    document.querySelectorAll(".installation-confirmed-qty").forEach(input=>{
      const max=Number(input.dataset.remaining||0),value=Math.max(0,Number(input.value||0));
      const line=input.closest(".installation-quantity-line"),after=Math.max(max-value,0);
      remaining+=after;
      line?.querySelector(".installation-quantity-result")?.replaceChildren(document.createTextNode(`المتبقي بعد الاعتماد: ${after}`));
    });
    $("installationQuantityRemainingTotal").textContent=String(remaining);
    const hasRemaining=remaining>0;
    $("installationQuantityRemainingActionWrap").classList.toggle("hidden",!hasRemaining);
    if(!hasRemaining)$("installationQuantityRemainingAction").value="completed";
    syncQuantityAction();
  }
  function syncQuantityAction(){
    const action=$("installationQuantityRemainingAction").value;
    $("installationQuantityRescheduleFields").classList.toggle("hidden",action!=="reschedule_now");
    $("installationQuantityScheduleLaterNote").classList.toggle("hidden",action!=="schedule_later");
  }
  async function openQuantityConfirmation(r){
    if(!can("edit","installationCompletion"))return;
    quantityCurrent=r;
    await ensureQuantityTeams();
    $("installationQuantityRequestLabel").textContent=`${r.requestNumber} — ${r.customerName}`;
    $("installationQuantityLines").innerHTML=(r.quantities||[]).map(quantityLineHtml).join("")||'<p class="empty-state">لا توجد خدمات قابلة للتأكيد.</p>';
    $("installationQuantityRemainingAction").value="schedule_later";
    $("installationQuantityRescheduleDate").value=today();
    $("installationQuantityRescheduleTime").value="10:00";
    $("installationQuantityRescheduleTeam").value=r.teamId||"";
    $("installationQuantityRescheduleTechnician").value=r.technicianName||"";
    $("installationQuantityConfirmationNotes").value="";
    status($("installationQuantityConfirmationStatus"),"");
    syncQuantityResults();
    $("installationQuantityConfirmationDialog").showModal();
  }

  function openInstallation(r){if(!can("edit","installationCompletion")||!can("add","salesInvoices")){alert("لا توجد صلاحية تحويل التركيب إلى فاتورة.");return}setMode("installation");current=r;$("installationCompletionRequestId").value=r.id;$("installationCompletionRequestLabel").textContent=`${r.requestNumber} — ${r.customerName}`;$("installationCompletionCustomer").textContent=r.customerName||"—";$("installationCompletionTechnician").textContent=r.technicianName||"—";$("installationCompletionDate").textContent=date(r.completedAt);$("installationCompletionAddress").textContent=r.installationAddress||"—";$("installationCompletionWorkSummary").value=r.report?.work_summary||"";$("installationCompletionRecipientName").value=r.report?.recipient_name||"";$("installationCompletionCustomerOrderNumber").value=r.customerOrderNumber||r.requestNumber||"";$("installationCompletionInvoiceNumber").value=r.report?.invoice_number||"";$("installationCompletionInvoiceDate").value=r.report?.invoice_date||today();$("installationCompletionInvoiceAmount").value=Number(r.invoiceAmount||0).toFixed(2);$("installationCompletionInstallationExpenses").value=Number(r.installationExpenses||0).toFixed(2);$("installationCompletionBeforePhotos").value="";$("installationCompletionAfterPhotos").value="";$("installationCompletionDeliveryAuthorization").value="";showFiles(r);status($("installationCompletionFormStatus"),"");$("installationCompletionDialog").showModal()}
  function openQuotation(q){if(!can("add","salesInvoices")){alert("لا توجد صلاحية إضافة فواتير المبيعات.");return}setMode("quotation");current=q;$("installationCompletionRequestId").value=q.quotationId;$("installationCompletionRequestLabel").textContent=`${q.quotationCode||q.requestNumber} — ${q.customerName}`;$("installationCompletionCustomer").textContent=q.customerName||"—";$("installationCompletionTechnician").textContent="لا ينطبق";$("installationCompletionDate").textContent="عرض سعر مباشر";$("installationCompletionAddress").textContent=q.customerPhone||"—";$("installationCompletionWorkSummary").value="";$("installationCompletionRecipientName").value="";$("installationCompletionCustomerOrderNumber").value=q.requestNumber||q.quotationCode||"";$("installationCompletionInvoiceNumber").value="";$("installationCompletionInvoiceDate").value=today();$("installationCompletionInvoiceAmount").value=Number(q.invoiceAmount||0).toFixed(2);$("installationCompletionInstallationExpenses").value="0.00";status($("installationCompletionFormStatus"),"");$("installationCompletionDialog").showModal()}
  document.addEventListener("DOMContentLoaded",()=>{
    window.addEventListener("kyum-view-changed",e=>{if(e.detail?.view==="installationCompletion")load()});
    window.addEventListener("kyum-open-unified-invoice-conversion",e=>{if(e.detail?.sourceType==="quotation")openQuotation(e.detail)});
    $("refreshInstallationCompletionBtn")?.addEventListener("click",load);
    ["installationCompletionSearch","installationCompletionRepresentativeFilter","installationCompletionDateFrom","installationCompletionDateTo"].forEach(id=>$(id)?.addEventListener(id.includes("Search")?"input":"change",render));
    $("resetInstallationCompletionFilters")?.addEventListener("click",()=>{$("installationCompletionSearch").value="";$("installationCompletionRepresentativeFilter").value="";$("installationCompletionDateFrom").value="";$("installationCompletionDateTo").value="";render()});
    $("installationCompletionTableBody")?.addEventListener("click",e=>{
      const confirmBtn=e.target.closest("[data-confirm-installation-quantity]");
      if(confirmBtn){const r=rows.find(x=>x.id===confirmBtn.dataset.confirmInstallationQuantity);if(r)openQuantityConfirmation(r);return}
      const b=e.target.closest("[data-installation-completion]");
      if(b){const r=rows.find(x=>x.id===b.dataset.installationCompletion);if(r)openInstallation(r)}
    });
    $("installationCompletionExistingFiles")?.addEventListener("click",async e=>{const b=e.target.closest("[data-open-installation-file]");if(!b)return;b.disabled=true;try{const url=await window.InstallationsServiceSafe.signedFileUrl(b.dataset.openInstallationFile);window.open(url,"_blank","noopener,noreferrer")}catch(err){status($("installationCompletionFormStatus"),err.message,"error")}finally{b.disabled=false}});
    $("installationQuantityLines")?.addEventListener("input",e=>{if(e.target.matches(".installation-confirmed-qty"))syncQuantityResults()});
    $("installationQuantityRemainingAction")?.addEventListener("change",syncQuantityAction);
    $("closeInstallationQuantityConfirmation")?.addEventListener("click",()=>$("installationQuantityConfirmationDialog").close());
    $("cancelInstallationQuantityConfirmation")?.addEventListener("click",()=>$("installationQuantityConfirmationDialog").close());
    $("installationQuantityConfirmationForm")?.addEventListener("submit",async e=>{
      e.preventDefault();
      if(!quantityCurrent)return;
      const btn=$("saveInstallationQuantityConfirmation");
      btn.disabled=true;
      try{
        const lines=[...document.querySelectorAll(".installation-confirmed-qty")].map(input=>({
          requestServiceId:input.dataset.requestServiceId,
          scheduledQuantity:Number(input.dataset.scheduled||0),
          executedQuantity:Number(input.value||0)
        }));
        if(!lines.length)throw new Error("لا توجد خدمات لاعتمادها.");
        lines.forEach(x=>{const source=quantityCurrent.quantities.find(q=>q.requestServiceId===x.requestServiceId);if(x.executedQuantity<0||x.executedQuantity>Number(source?.remainingQuantity||0))throw new Error("الكمية المنفذة يجب ألا تتجاوز المتبقي من الطلب.");});
        const remaining=lines.reduce((n,x)=>{const source=quantityCurrent.quantities.find(q=>q.requestServiceId===x.requestServiceId);return n+Math.max(Number(source?.remainingQuantity||0)-x.executedQuantity,0)},0);
        let action=remaining===0?"completed":$("installationQuantityRemainingAction").value;
        let schedule=null;
        if(action==="reschedule_now"){
          schedule={
            scheduledDate:$("installationQuantityRescheduleDate").value,
            scheduledTime:$("installationQuantityRescheduleTime").value,
            teamId:$("installationQuantityRescheduleTeam").value,
            technicianName:$("installationQuantityRescheduleTechnician").value.trim(),
            assignmentNotes:"استكمال الكمية المتبقية بعد تأكيد التنفيذ"
          };
          if(!schedule.scheduledDate||!schedule.scheduledTime||!schedule.teamId||!schedule.technicianName)throw new Error("أكمل بيانات إعادة الجدولة.");
        }
        status($("installationQuantityConfirmationStatus"),"جاري اعتماد التنفيذ الفعلي...");
        await window.InstallationsServiceSafe.confirmActualQuantities({
          id:quantityCurrent.id,lines,remainingAction:action,schedule,
          notes:$("installationQuantityConfirmationNotes").value.trim()
        });
        $("installationQuantityConfirmationDialog").close();
        await load();
        window.dispatchEvent(new CustomEvent("kyum-installation-quantities-confirmed",{detail:{requestId:quantityCurrent.id,action}}));
      }catch(err){status($("installationQuantityConfirmationStatus"),err.message,"error")}
      finally{btn.disabled=false}
    });

    $("closeInstallationCompletionDialog")?.addEventListener("click",()=>$("installationCompletionDialog").close());
    $("cancelInstallationCompletion")?.addEventListener("click",()=>$("installationCompletionDialog").close());
    $("installationCompletionInvoiceNumber")?.addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,9)});
    $("installationCompletionForm")?.addEventListener("submit",async e=>{e.preventDefault();const btn=$("saveInstallationCompletion");btn.disabled=true;try{const invoiceNumber=$("installationCompletionInvoiceNumber").value.trim(),invoiceDate=$("installationCompletionInvoiceDate").value;if(!/^\d{9}$/.test(invoiceNumber))throw new Error("رقم الفاتورة يجب أن يتكون من 9 أرقام إنجليزية بالضبط.");if(!invoiceDate)throw new Error("تاريخ الفاتورة مطلوب.");status($("installationCompletionFormStatus"),"جاري حفظ الفاتورة...");if(mode==="quotation"){await window.SalesInvoicesService.createFromQuotation({quotationId:current.quotationId,invoiceNumber,invoiceDate});await window.QuotationsService?.invalidateCache?.();window.dispatchEvent(new CustomEvent("kyum-sales-invoice-created",{detail:{sourceType:"quotation"}}))}else{const deliveryFile=$("installationCompletionDeliveryAuthorization").files[0]||null,before=[...$("installationCompletionBeforePhotos").files],after=[...$("installationCompletionAfterPhotos").files],hasStoredDelivery=current.files.some(f=>f.file_kind==="delivery_authorization");if(before.length+after.length>12)throw new Error("الحد الأقصى 12 صورة لكل عملية.");if(!deliveryFile&&!hasStoredDelivery)throw new Error("صورة إذن تسليم العميل مطلوبة لإتمام التحويل.");await window.InstallationsServiceSafe.saveCompletion({id:current.id,workSummary:$("installationCompletionWorkSummary").value.trim(),recipientName:$("installationCompletionRecipientName").value.trim(),invoiceNumber,invoiceDate,beforePhotos:before,afterPhotos:after,deliveryAuthorizationFile:deliveryFile})}$("installationCompletionDialog").close();window.KYUMNavigation?.open?.("salesInvoices",{trustedNavigation:true});if(mode==="installation")await load()}catch(err){status($("installationCompletionFormStatus"),err.message,"error")}finally{btn.disabled=false}});
  });
})();
