(function(){
  const recent=new Map();
  const DEFAULT_DEDUPE_MS=30000;

  function client(){return window.customerSupabase||null}
  function normalizeQuery(value){return String(value||'').trim().replace(/\s+/g,' ')}
  function currentView(){return document.querySelector('.view.active')?.id?.replace(/^view-/,'')||''}
  function invalidate(){try{const d=new Date(),local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);window.KYUMOfflineReadCache?.invalidate?.(`daily-activity:${local}`)}catch(_){}}
  function dedupeKey(event){return [event.sectionKey,event.actionKey,event.entityType,event.entityId,event.details?.query_value,event.details?.outcome,event.details?.stage].map(x=>String(x||'')).join('|')}

  async function log(event={}){
    const db=client();if(!db?.rpc)return null;
    const key=event.dedupeKey||dedupeKey(event),now=Date.now(),ttl=Number(event.dedupeMs||DEFAULT_DEDUPE_MS);
    if(key){const prev=recent.get(key)||0;if(now-prev<ttl)return null;recent.set(key,now)}
    try{
      const {data,error}=await db.rpc('log_business_activity_event',{
        p_event_type:event.eventType||'activity',
        p_section_key:event.sectionKey||currentView()||'app',
        p_action_key:event.actionKey||'activity',
        p_entity_type:event.entityType||null,
        p_entity_id:event.entityId==null?null:String(event.entityId),
        p_entity_display_name:event.entityDisplayName||null,
        p_customer_id:event.customerId||null,
        p_customer_name:event.customerName||null,
        p_request_number:event.requestNumber||null,
        p_quotation_number:event.quotationNumber||null,
        p_invoice_number:event.invoiceNumber||null,
        p_details:{...(event.details||{}),source_label:event.details?.source_label||document.querySelector('.view.active h1,.view.active h2')?.textContent?.trim()||event.sectionKey||'البرنامج'}
      });
      if(error)throw error;invalidate();return data||null;
    }catch(error){console.warn('[BusinessActivity] log skipped',error);return null}
  }

  function inferSearchType(query,config={}){
    const q=normalizeQuery(query),digits=q.replace(/\D/g,'');
    if(config.fixedType)return config.fixedType;
    if(/^INS-\d/i.test(q))return 'request_number';
    if(/^(?:\+?966|0)?5\d{8}$/.test(digits)||/^05\d{8}$/.test(q))return 'phone';
    if(/^\d+$/.test(q))return config.numericType||'number';
    return config.textType||'name_or_text';
  }

  function trackSearchInput(input,config={}){
    if(!input||input.dataset.activitySearchBound==='1')return;
    input.dataset.activitySearchBound='1';let timer=null,lastCommitted='';
    const commit=trigger=>{
      const query=normalizeQuery(input.value);if(query.length<(config.minLength??2)||query===lastCommitted)return;
      lastCommitted=query;
      void log({eventType:'search',sectionKey:config.sectionKey||currentView(),actionKey:config.actionKey||'search',entityType:'search',entityId:config.id||input.id,entityDisplayName:config.label||input.placeholder||input.id,dedupeMs:30000,details:{search_type:inferSearchType(query,config),query_value:query,trigger,result_count:null,result_found:null}})
    };
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>commit('debounced_input'),config.debounceMs||900)});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);commit('enter')}});
    input.addEventListener('search',()=>{clearTimeout(timer);commit('search_event')});
  }

  const SEARCH_CONFIG={
    customerSearch:{sectionKey:'customers',label:'بحث العملاء',numericType:'customer_code',textType:'customer_name_or_representative'},
    followupSearch:{sectionKey:'followups',label:'بحث المتابعات',textType:'customer_name_phone_or_representative'},
    quotationSearch:{sectionKey:'quotations',label:'بحث عروض الأسعار',numericType:'quotation_or_customer_order_number',textType:'customer_or_representative'},
    salesInvoicesSearch:{sectionKey:'salesInvoices',label:'بحث فواتير المبيعات',numericType:'invoice_or_request_number',textType:'customer_or_representative'},
    representativesSearch:{sectionKey:'representatives',label:'بحث مندوبي المبيعات',numericType:'representative_code_or_phone',textType:'representative_name_or_email'},
    referenceCustomersSearch:{sectionKey:'referenceData',label:'بحث العملاء في البيانات المرجعية',numericType:'customer_code_or_phone',textType:'customer_name_or_contact'},
    newInstallationCustomerSearch:{sectionKey:'installationRequestNew',label:'بحث العميل لإضافة طلب تركيب',numericType:'customer_code_or_phone',textType:'customer_name'},
    quotationCustomerSearch:{sectionKey:'quotations',label:'بحث العميل لإضافة عرض سعر',fixedType:'customer_name_or_phone'},
    installationRequestSearch:{sectionKey:'installationRequests',label:'بحث طلبات التركيبات',numericType:'request_customer_or_quotation_number',textType:'customer_or_phone'},
    installationCompletionSearch:{sectionKey:'installationCompletion',label:'بحث تأكيد التركيبات',numericType:'request_or_customer_number',textType:'customer_or_technician'},
    installationExceptionsSearch:{sectionKey:'installationReports',label:'بحث استثناءات التركيبات',numericType:'request_number',textType:'customer_or_technician'},
    usersSearch:{sectionKey:'users',label:'بحث المستخدمين',textType:'user_name_or_email'},
    activitySearch:{sectionKey:'activityLog',label:'بحث سجل النشاط',textType:'user_or_action'},
    userAllowedRepresentativesSearch:{sectionKey:'users',label:'بحث مندوبي نطاق المستخدم',textType:'representative_name'},
    userInstallationRepresentativesSearch:{sectionKey:'users',label:'بحث مندوبي نطاق التركيبات',textType:'representative_name'},
    customerInterestSearch:{sectionKey:'customers',label:'بحث مجالات اهتمام العميل',fixedType:'interest_name'},
    customerRegionSearch:{sectionKey:'customers',label:'بحث مناطق العميل',fixedType:'region_name'},
    customerCitySearch:{sectionKey:'customers',label:'بحث مدن العميل',fixedType:'city_name'},
    customerDistrictSearch:{sectionKey:'customers',label:'بحث أحياء العميل',fixedType:'district_name'},
    newInstallationRegionSearch:{sectionKey:'installationRequestNew',label:'بحث مناطق طلب التركيب',fixedType:'region_name'},
    newInstallationCitySearch:{sectionKey:'installationRequestNew',label:'بحث مدن طلب التركيب',fixedType:'city_name'},
    newInstallationDistrictSearch:{sectionKey:'installationRequestNew',label:'بحث أحياء طلب التركيب',fixedType:'district_name'},
    installationServicesEditRegionSearch:{sectionKey:'installationRequests',label:'بحث مناطق تعديل طلب التركيب',fixedType:'region_name'},
    installationServicesEditCitySearch:{sectionKey:'installationRequests',label:'بحث مدن تعديل طلب التركيب',fixedType:'city_name'},
    installationServicesEditDistrictSearch:{sectionKey:'installationRequests',label:'بحث أحياء تعديل طلب التركيب',fixedType:'district_name'},
    installationAssignmentTechnicianName:{sectionKey:'installationSchedule',label:'بحث الفني للإسناد',fixedType:'technician_name'},
    userInstallationTechnicianName:{sectionKey:'users',label:'بحث الفني في نطاق المستخدم',fixedType:'technician_name'},
    installationCostTechnicianName:{sectionKey:'installationCosts',label:'بحث الفني في تكاليف التركيبات',fixedType:'technician_name'}
  };

  function bindKnownSearches(){Object.entries(SEARCH_CONFIG).forEach(([id,cfg])=>trackSearchInput(document.getElementById(id),{id,...cfg}))}
  document.addEventListener('DOMContentLoaded',bindKnownSearches);
  window.addEventListener('kyum-view-changed',()=>setTimeout(bindKnownSearches,0));

  window.BusinessActivityService=Object.freeze({log,trackSearchInput,bindKnownSearches,inferSearchType,normalizeQuery});
})();
