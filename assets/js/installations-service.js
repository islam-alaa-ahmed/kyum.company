(function(){
  function db(){if(!window.customerSupabase) throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase}
  async function fetchPaged(factory,pageSize=500){const all=[];for(let start=0;;start+=pageSize){const {data,error}=await factory(start,start+pageSize-1);if(error)throw error;const page=data||[];all.push(...page);if(page.length<pageSize)break}return all}
  function requireAction(action,screen='installationRequests'){const p=window.CustomerPermissions;if(p?.requireAction && !p.requireAction(screen,action,{silent:true})) throw new Error('ليس لديك صلاحية لتنفيذ هذا الإجراء.');}
  function normalize(row){return {id:row.id,requestNumber:row.request_number,customerOrderNumber:row.customer_order_number||'',customerId:row.customer_id,customerName:row.customer?.customer_name||'',customerPhone:row.customer?.phone||'',quotationId:row.quotation_id,quotationNumber:row.quotation?.quotation_number||'',representativeId:row.representative_id,representativeName:row.representative?.full_name||'',scheduledDate:row.scheduled_date||'',scheduledTime:row.scheduled_time||'',timeSlot:row.time_slot||'',status:row.status||'بانتظار المراجعة',priority:row.priority||'عادية',installationAddress:row.installation_address||'',customerMapUrl:row.customer_map_url||'',neighborhoodId:row.neighborhood_id||'',city:row.customer?.city||'',district:row.customer?.district||'',description:row.description||'',notes:row.notes||'',totalServicesCount:Number(row.total_services_count||0),totalServicesAmount:Number(row.total_services_amount||0),services:row.services||[],createdAt:row.created_at||'',updatedAt:row.updated_at||''}}
  async function list(){requireAction('view');const [data,serviceRows]=await Promise.all([fetchPaged((from,to)=>db().from('installation_requests').select('*,customer:customers(id,customer_name,phone,address,city,district,representative_id),quotation:quotations!installation_requests_quotation_id_fkey(id,quotation_number),representative:sales_representatives(id,full_name)').order('created_at',{ascending:false}).range(from,to)),fetchPaged((from,to)=>db().from('installation_request_services').select('installation_request_id,quantity,unit_price,line_total,service:installation_service_types(id,name)').range(from,to),1000)]);const byRequest=new Map();serviceRows.forEach(x=>{const arr=byRequest.get(x.installation_request_id)||[];arr.push({serviceTypeId:x.service?.id||'',serviceName:x.service?.name||'',quantity:Number(x.quantity||0),unitPrice:Number(x.unit_price||0),lineTotal:Number(x.line_total||0)});byRequest.set(x.installation_request_id,arr)});return data.map(row=>normalize({...row,services:byRequest.get(row.id)||[]}))}
  async function loadInstallationCustomers(){
    try {
      return await fetchPaged((from,to)=>db().from('customers').select('id,customer_number,customer_name,phone,address,region,city,district,representative_id').order('customer_name').range(from,to));
    } catch (error) {
      const message=String(error?.message||'').toLowerCase();
      const schemaMismatch=message.includes('customer_number')&&(message.includes('column')||message.includes('schema cache')||message.includes('does not exist'));
      if(!schemaMismatch) throw error;
      const rows=await fetchPaged((from,to)=>db().from('customers').select('id,customer_name,phone,address,region,city,district,representative_id').order('customer_name').range(from,to));
      return rows.map(row=>({...row,customer_number:''}));
    }
  }
  async function options(){
    const tasks={
      customers:loadInstallationCustomers(),
      quotations:fetchPaged((from,to)=>db().from('quotations').select('id,quotation_number,customer_order_number,customer_id,status,amount,installation_request_id').eq('status','مقبول').order('quotation_date',{ascending:false}).range(from,to)),
      regions:fetchPaged((from,to)=>db().from('installation_regions').select('id,name,is_active').eq('is_active',true).order('name').range(from,to)),
      cities:fetchPaged((from,to)=>db().from('installation_cities').select('id,region_id,name,is_active').eq('is_active',true).order('name').range(from,to)),
      neighborhoods:fetchPaged((from,to)=>db().from('installation_neighborhoods').select('id,region_id,city_id,name,city,region,is_active').eq('is_active',true).order('name').range(from,to)),
      serviceTypes:fetchPaged((from,to)=>db().from('installation_service_types').select('id,name,default_price').eq('is_active',true).order('name').range(from,to))
    };
    const keys=Object.keys(tasks);
    const settled=await Promise.allSettled(keys.map(key=>tasks[key]));
    const result={customers:[],quotations:[],regions:[],cities:[],neighborhoods:[],serviceTypes:[],errors:{}};
    settled.forEach((entry,index)=>{
      const key=keys[index];
      if(entry.status==='fulfilled') result[key]=entry.value;
      else result.errors[key]=entry.reason?.message||String(entry.reason||'تعذر تحميل البيانات.');
    });
    return result;
  }
  async function validateNeighborhoodIntegrity(neighborhoodId){
    if(!neighborhoodId)throw new Error('اختر الحي الخاص بطلب التركيب.');
    const {data:neighborhood,error:neighborhoodError}=await db().from('installation_neighborhoods').select('id,region_id,city_id,name,is_active').eq('id',neighborhoodId).eq('is_active',true).maybeSingle();
    if(neighborhoodError||!neighborhood)throw new Error('الحي المختار غير موجود أو غير نشط.');
    if(!neighborhood.region_id||!neighborhood.city_id)throw new Error('بيانات الحي غير مكتملة: يجب ربط الحي بمنطقة ومدينة معتمدتين.');
    const [{data:city,error:cityError},{data:region,error:regionError}]=await Promise.all([
      db().from('installation_cities').select('id,region_id,name,is_active').eq('id',neighborhood.city_id).eq('is_active',true).maybeSingle(),
      db().from('installation_regions').select('id,name,is_active').eq('id',neighborhood.region_id).eq('is_active',true).maybeSingle()
    ]);
    if(cityError||!city)throw new Error('مدينة الحي المختار غير موجودة أو غير نشطة.');
    if(regionError||!region)throw new Error('منطقة الحي المختار غير موجودة أو غير نشطة.');
    if(String(city.region_id)!==String(region.id))throw new Error('سلامة العنوان مرفوضة: المدينة لا تتبع المنطقة المرتبطة بالحي.');
    if(String(neighborhood.city_id)!==String(city.id)||String(neighborhood.region_id)!==String(region.id))throw new Error('سلامة العنوان مرفوضة: الحي لا يتبع المدينة والمنطقة المعتمدتين.');
    return {neighborhood,city,region};
  }
  function normalizeGoogleMapsUrl(value){const url=String(value||'').trim();if(!url)return '';let parsed;try{parsed=new URL(url)}catch(_){throw new Error('رابط موقع العميل غير صحيح. استخدم رابط مشاركة من Google Maps.')}const host=parsed.hostname.toLowerCase();const valid=(host==='maps.app.goo.gl'||host==='maps.google.com'||host==='www.google.com'||host==='google.com'||host==='goo.gl')&&(host!=='goo.gl'||parsed.pathname.toLowerCase().startsWith('/maps'));if(parsed.protocol!=='https:'||!valid)throw new Error('استخدم رابط Google Maps آمن يبدأ بـ https.');return parsed.toString()}
  async function createRequest(payload){requireAction('add','installationRequestNew');if(!payload.customerId)throw new Error('اختر العميل.');if(payload.quotationId){const {data:quotation,error:quotationError}=await db().from('quotations').select('id,customer_id,status,installation_request_id').eq('id',payload.quotationId).maybeSingle();if(quotationError)throw new Error('تعذر التحقق من عرض السعر: '+quotationError.message);if(!quotation||quotation.customer_id!==payload.customerId)throw new Error('عرض السعر لا يخص العميل المحدد.');if(quotation.status!=='مقبول')throw new Error('لا يمكن إنشاء طلب تركيب إلا من عرض سعر مقبول.');if(quotation.installation_request_id)throw new Error('تم إنشاء طلب تركيب لهذا العرض بالفعل.');}const geo=await validateNeighborhoodIntegrity(payload.neighborhoodId);if(!Array.isArray(payload.services)||!payload.services.length)throw new Error('أضف خدمة واحدة على الأقل.');const services=payload.services.map(x=>({service_type_id:x.serviceTypeId,quantity:Number(x.quantity),unit_price:Number(x.unitPrice)}));if(services.some(x=>!x.service_type_id||!Number.isInteger(x.quantity)||x.quantity<1||!Number.isFinite(x.unit_price)||x.unit_price<0))throw new Error('راجع نوع الخدمة والعدد والسعر في جميع الخدمات.');const {data,error}=await db().rpc('create_installation_request_with_services',{p_customer_id:payload.customerId,p_quotation_id:payload.quotationId||null,p_representative_id:payload.representativeId||null,p_neighborhood_id:geo.neighborhood.id,p_priority:payload.priority||'عادية',p_installation_address:geo.neighborhood.name||payload.installationAddress||null,p_customer_order_number:payload.customerOrderNumber||null,p_customer_map_url:normalizeGoogleMapsUrl(payload.customerMapUrl)||null,p_notes:payload.notes||null,p_services:services});if(error)throw new Error('تعذر إنشاء طلب التركيب: '+error.message);return Array.isArray(data)?data[0]:data}
  async function updateRequest(payload){
    requireAction('edit','installationRequests');
    if(!payload.id)throw new Error('معرّف طلب التركيب مطلوب.');
    if(!payload.customerId)throw new Error('اختر العميل.');
    if(!payload.neighborhoodId)throw new Error('اختر العنوان.');
    const geo=await validateNeighborhoodIntegrity(payload.neighborhoodId);
    if(!Array.isArray(payload.services)||!payload.services.length)throw new Error('أضف خدمة واحدة على الأقل.');
    const services=payload.services.map(x=>({service_type_id:x.serviceTypeId,quantity:Number(x.quantity),unit_price:Number(x.unitPrice)}));
    if(services.some(x=>!x.service_type_id||!Number.isInteger(x.quantity)||x.quantity<1||!Number.isFinite(x.unit_price)||x.unit_price<0))throw new Error('راجع نوع الخدمة والعدد والسعر في جميع الخدمات.');
    const {data,error}=await db().rpc('update_installation_request_with_services',{
      p_request_id:payload.id,
      p_customer_id:payload.customerId,
      p_quotation_id:payload.quotationId||null,
      p_representative_id:payload.representativeId||null,
      p_neighborhood_id:geo.neighborhood.id,
      p_priority:payload.priority||'عادية',
      p_installation_address:geo.neighborhood.name||payload.installationAddress||null,
      p_customer_order_number:payload.customerOrderNumber||null,
      p_customer_map_url:normalizeGoogleMapsUrl(payload.customerMapUrl)||null,
      p_notes:payload.notes||null,
      p_services:services
    });
    if(error)throw new Error('تعذر حفظ تعديلات طلب التركيب: '+error.message);
    return Array.isArray(data)?data[0]:data;
  }

  async function updateRequestServices(requestId,services){
    const canRequests=window.CustomerPermissions?.canScreen?.('installationRequests','edit')===true;
    const canSchedule=window.CustomerPermissions?.canScreen?.('installationSchedule','edit')===true;
    if(!canRequests&&!canSchedule)throw new Error('ليس لديك صلاحية تعديل خدمات طلبات التركيبات.');
    if(!requestId)throw new Error('معرّف طلب التركيب مطلوب.');
    if(!Array.isArray(services)||!services.length)throw new Error('أضف خدمة واحدة على الأقل.');
    const normalized=services.map(x=>({service_type_id:x.serviceTypeId,quantity:Number(x.quantity),unit_price:Number(x.unitPrice)}));
    if(normalized.some(x=>!x.service_type_id||!Number.isInteger(x.quantity)||x.quantity<1||!Number.isFinite(x.unit_price)||x.unit_price<0))throw new Error('راجع نوع الخدمة والعدد والسعر في جميع الخدمات.');
    const {data:row,error:loadError}=await db().from('installation_requests').select('id,customer_id,quotation_id,representative_id,neighborhood_id,priority,installation_address,customer_order_number,customer_map_url,notes').eq('id',requestId).single();
    if(loadError||!row)throw new Error('تعذر تحميل بيانات طلب التركيب قبل حفظ الخدمات: '+(loadError?.message||'الطلب غير موجود.'));
    const {data,error}=await db().rpc('update_installation_request_with_services',{
      p_request_id:row.id,p_customer_id:row.customer_id,p_quotation_id:row.quotation_id||null,p_representative_id:row.representative_id||null,p_neighborhood_id:row.neighborhood_id,p_priority:row.priority||'عادية',p_installation_address:row.installation_address||null,p_customer_order_number:row.customer_order_number||null,p_customer_map_url:row.customer_map_url||null,p_notes:row.notes||null,p_services:normalized
    });
    if(error)throw new Error('تعذر حفظ خدمات طلب التركيب: '+error.message);
    return Array.isArray(data)?data[0]:data;
  }


  async function requestEditDetail(requestId){
    const canRequests=window.CustomerPermissions?.canScreen?.('installationRequests','view')===true;
    const canSchedule=window.CustomerPermissions?.canScreen?.('installationSchedule','view')===true;
    if(!canRequests&&!canSchedule)throw new Error('ليس لديك صلاحية عرض طلبات التركيبات.');
    if(!requestId)throw new Error('معرّف طلب التركيب مطلوب.');
    const [{data:row,error:rowError},{data:serviceRows,error:serviceError}]=await Promise.all([
      db().from('installation_requests').select('*,customer:customers(id,customer_name,phone,address,city,district,representative_id),quotation:quotations!installation_requests_quotation_id_fkey(id,quotation_number),representative:sales_representatives(id,full_name)').eq('id',requestId).single(),
      db().from('installation_request_services').select('id,service_type_id,quantity,unit_price,line_total,service:installation_service_types(id,name)').eq('installation_request_id',requestId).order('created_at',{ascending:true})
    ]);
    if(rowError||!row)throw new Error('تعذر تحميل بيانات طلب التركيب: '+(rowError?.message||'الطلب غير موجود.'));
    if(serviceError)throw new Error('تعذر تحميل خدمات طلب التركيب: '+serviceError.message);
    return normalize({...row,services:(serviceRows||[]).map(x=>({id:x.id,serviceTypeId:x.service_type_id||x.service?.id||'',serviceName:x.service?.name||'',name:x.service?.name||'',quantity:Number(x.quantity||0),unitPrice:Number(x.unit_price||0),lineTotal:Number(x.line_total||0)}))});
  }

  async function requestEditOptions(customerId){
    const tasks=[
      fetchPaged((from,to)=>db().from('installation_regions').select('id,name,is_active').eq('is_active',true).order('name').range(from,to)),
      fetchPaged((from,to)=>db().from('installation_cities').select('id,region_id,name,is_active').eq('is_active',true).order('name').range(from,to)),
      fetchPaged((from,to)=>db().from('installation_neighborhoods').select('id,region_id,city_id,name,city,region,is_active').eq('is_active',true).order('name').range(from,to)),
      fetchPaged((from,to)=>db().from('installation_service_types').select('id,name,default_price').eq('is_active',true).order('name').range(from,to)),
      customerId?fetchPaged((from,to)=>db().from('quotations').select('id,quotation_number,customer_order_number,customer_id,status,amount,installation_request_id').eq('customer_id',customerId).eq('status','مقبول').order('quotation_date',{ascending:false}).range(from,to)):Promise.resolve([])
    ];
    const [regions,cities,neighborhoods,serviceTypes,quotations]=await Promise.all(tasks);
    return {regions,cities,neighborhoods,serviceTypes,quotations};
  }

  async function updateRequestContextServices(requestId,payload={}){
    const canRequests=window.CustomerPermissions?.canScreen?.('installationRequests','edit')===true;
    const canSchedule=window.CustomerPermissions?.canScreen?.('installationSchedule','edit')===true;
    if(!canRequests&&!canSchedule)throw new Error('ليس لديك صلاحية تعديل طلبات التركيبات.');
    if(!requestId)throw new Error('معرّف طلب التركيب مطلوب.');
    if(!payload.neighborhoodId)throw new Error('اختر الحي الخاص بطلب التركيب.');
    const geo=await validateNeighborhoodIntegrity(payload.neighborhoodId);
    if(!Array.isArray(payload.services)||!payload.services.length)throw new Error('أضف خدمة واحدة على الأقل.');
    const normalized=payload.services.map(x=>({service_type_id:x.serviceTypeId,quantity:Number(x.quantity),unit_price:Number(x.unitPrice)}));
    if(normalized.some(x=>!x.service_type_id||!Number.isInteger(x.quantity)||x.quantity<1||!Number.isFinite(x.unit_price)||x.unit_price<0))throw new Error('راجع نوع الخدمة والعدد والسعر في جميع الخدمات.');
    const {data:row,error:loadError}=await db().from('installation_requests').select('id,customer_id,quotation_id,representative_id,priority,installation_address,notes').eq('id',requestId).single();
    if(loadError||!row)throw new Error('تعذر تحميل بيانات طلب التركيب قبل الحفظ: '+(loadError?.message||'الطلب غير موجود.'));
    const quotationId=payload.quotationId||null;
    if(quotationId){
      const {data:quotation,error:quotationError}=await db().from('quotations').select('id,customer_id,status,installation_request_id').eq('id',quotationId).maybeSingle();
      if(quotationError)throw new Error('تعذر التحقق من عرض السعر: '+quotationError.message);
      if(!quotation||String(quotation.customer_id)!==String(row.customer_id))throw new Error('عرض السعر لا يخص عميل طلب التركيب.');
      if(quotation.status!=='مقبول')throw new Error('لا يمكن ربط طلب التركيب إلا بعرض سعر مقبول.');
      if(quotation.installation_request_id&&String(quotation.installation_request_id)!==String(requestId))throw new Error('عرض السعر مرتبط بطلب تركيب آخر بالفعل.');
    }
    const {data,error}=await db().rpc('update_installation_request_with_services',{
      p_request_id:row.id,p_customer_id:row.customer_id,p_quotation_id:quotationId,p_representative_id:row.representative_id||null,p_neighborhood_id:geo.neighborhood.id,p_priority:row.priority||'عادية',p_installation_address:geo.neighborhood.name||row.installation_address||null,p_customer_order_number:String(payload.customerOrderNumber||'').trim()||null,p_customer_map_url:normalizeGoogleMapsUrl(payload.customerMapUrl)||null,p_notes:row.notes||null,p_services:normalized
    });
    if(error)throw new Error('تعذر حفظ بيانات وخدمات طلب التركيب: '+error.message);
    return Array.isArray(data)?data[0]:data;
  }

  async function save(payload){requireAction(payload.id?'edit':'add',payload.id?'installationRequests':'installationRequestNew');if(!payload.id)return createRequest(payload);const record={customer_id:payload.customerId,quotation_id:payload.quotationId||null,representative_id:payload.representativeId||null,scheduled_date:payload.scheduledDate||null,time_slot:payload.timeSlot||null,status:payload.status,priority:payload.priority,installation_address:payload.installationAddress||null,customer_map_url:normalizeGoogleMapsUrl(payload.customerMapUrl)||null,description:payload.description||null,notes:payload.notes||null};const {data,error}=await db().from('installation_requests').update(record).eq('id',payload.id).select('id').single();if(error)throw new Error('تعذر حفظ طلب التركيب: '+error.message);return data}
  async function remove(id){requireAction('delete');const {error}=await db().from('installation_requests').delete().eq('id',id);if(error)throw new Error('تعذر حذف طلب التركيب: '+error.message)}
  async function technicians(){requireAction('view','installationSchedule');const {data,error}=await db().from('installation_technicians').select('*').order('full_name');if(error)throw new Error('تعذر تحميل الفنيين: '+error.message);return (data||[]).map(r=>({id:r.id,name:r.full_name,phone:r.phone||'',specialty:r.specialty||'',city:r.city||'',status:r.status||'متاح'}))}
  async function scheduleTeams(){requireAction('view','installationSchedule');const {data,error}=await db().from('installation_teams').select('id,name,status').neq('status','غير نشطة').order('name');if(error)throw new Error('تعذر تحميل فرق التركيبات: '+error.message);return data||[]}
  async function technicianNameSuggestions(){requireAction('view','installationSchedule');const {data,error}=await db().from('installation_technician_name_suggestions').select('name').eq('is_active',true).order('name');if(error)throw new Error('تعذر تحميل أسماء الفنيين المقترحة: '+error.message);return (data||[]).map(r=>r.name).filter(Boolean)}
  async function scheduleContextSnapshot(requestIds=[]){
    const ids=[...new Set((requestIds||[]).filter(Boolean))];
    if(!ids.length)return new Map();
    const {data:requestRows,error:requestError}=await db().from('installation_requests').select('id,neighborhood_id,customer_map_url,customer_order_number,quotation_id').in('id',ids);
    if(requestError)throw new Error('تعذر تحميل أحدث بيانات طلبات الجدولة: '+requestError.message);
    const neighborhoodIds=[...new Set((requestRows||[]).map(x=>x.neighborhood_id).filter(Boolean))];
    const quotationIds=[...new Set((requestRows||[]).map(x=>x.quotation_id).filter(Boolean))];
    const [neighborhoodResult,quotationResult]=await Promise.all([
      neighborhoodIds.length?db().from('installation_neighborhoods').select('id,name').in('id',neighborhoodIds):Promise.resolve({data:[],error:null}),
      quotationIds.length?db().from('quotations').select('id,quotation_number').in('id',quotationIds):Promise.resolve({data:[],error:null})
    ]);
    if(neighborhoodResult.error)throw new Error('تعذر تحميل الأحياء الحالية لطلبات الجدولة: '+neighborhoodResult.error.message);
    if(quotationResult.error)throw new Error('تعذر تحميل عروض السعر الحالية لطلبات الجدولة: '+quotationResult.error.message);
    const neighborhoods=new Map((neighborhoodResult.data||[]).map(x=>[String(x.id),x.name||'']));
    const quotations=new Map((quotationResult.data||[]).map(x=>[String(x.id),x.quotation_number||'']));
    return new Map((requestRows||[]).map(x=>[String(x.id),{
      neighborhoodId:x.neighborhood_id||'',
      neighborhoodName:neighborhoods.get(String(x.neighborhood_id||''))||'',
      customerMapUrl:x.customer_map_url||'',
      customerOrderNumber:x.customer_order_number||'',
      quotationId:x.quotation_id||'',
      quotationNumber:quotations.get(String(x.quotation_id||''))||''
    }]));
  }

  async function scheduleList(){
    requireAction('view','installationSchedule');
    const [{data,error},{data:visits,error:visitError},{data:visitLines,error:lineError}]=await Promise.all([
      db().rpc('get_installation_schedule_global'),
      db().from('installation_execution_visits').select('id,installation_request_id,visit_no,scheduled_date,scheduled_time,installation_team_id,technician_name,status,team:installation_teams(id,name)').in('status',['مجدولة','قيد التنفيذ','بانتظار التأكيد']).order('visit_no'),
      db().from('installation_execution_visit_services').select('visit_id,request_service_id,scheduled_quantity')
    ]);
    if(error)throw new Error('تعذر تحميل الرؤية العامة لجدول التركيبات: '+error.message);
    if(visitError&&visitError.code!=='42P01')throw new Error('تعذر تحميل زيارات التركيبات: '+visitError.message);
    if(lineError&&lineError.code!=='42P01')throw new Error('تعذر تحميل كميات زيارات التركيبات: '+lineError.message);
    const rawRows=Array.isArray(data)?data:[];
    const contextMap=await scheduleContextSnapshot(rawRows.map(r=>r.id));
    const base=rawRows.map(r=>{
      const context=contextMap.get(String(r.id))||{};
      return {
      id:r.id,scheduleEntryId:r.id,visitId:'',visitNo:0,requestNumber:r.request_number,customerOrderNumber:context.customerOrderNumber??r.customer_order_number??'',customerName:r.customer_name||'',customerPhone:r.customer_phone||'',customerMasked:r.customer_masked===true,representativeId:r.representative_id||'',representativeName:r.representative_name||'',scheduledDate:r.scheduled_date||'',scheduledTime:r.scheduled_time||'',timeSlot:r.time_slot||'',status:r.status||'جديد',priority:r.priority||'عادية',technicianId:r.technician_id||'',technicianName:r.technician_name||'',technicianStatus:r.technician_status||'',teamId:r.team_id||'',teamName:r.team_name||'',installationAddress:context.neighborhoodName||r.installation_address||'',neighborhoodId:context.neighborhoodId||'',neighborhoodName:context.neighborhoodName||'',customerMapUrl:context.customerMapUrl||'',quotationId:context.quotationId||'',quotationNumber:context.quotationNumber||'',totalServicesCount:Number(r.total_services_count||0),totalServicesAmount:Number(r.total_services_amount||0),services:(Array.isArray(r.services)?r.services:[]).map(x=>({id:x.id||'',name:x.name||'خدمة',quantity:Number(x.quantity||0),unitPrice:Number(x.unit_price||0),lineTotal:Number(x.line_total||0)})),assignmentNotes:r.assignment_notes||'',canOperate:r.can_operate===true
      };
    });
    if(visitError||lineError||!(visits||[]).length)return base;
    const byRequest=new Map(base.map(x=>[x.id,x])),lineMap=new Map();
    (visitLines||[]).forEach(x=>{const arr=lineMap.get(x.visit_id)||[];arr.push(x);lineMap.set(x.visit_id,arr)});
    const visitRequestIds=new Set((visits||[]).map(v=>v.installation_request_id));
    const expanded=[];
    for(const row of base){
      if(!visitRequestIds.has(row.id)){expanded.push(row);continue;}
      const own=(visits||[]).filter(v=>v.installation_request_id===row.id);
      own.forEach(v=>{
        const allocations=new Map((lineMap.get(v.id)||[]).map(x=>[x.request_service_id,Number(x.scheduled_quantity||0)]));
        const services=row.services.map(x=>{const q=allocations.has(x.id)?allocations.get(x.id):0;return {...x,quantity:q,lineTotal:q*Number(x.unitPrice||0)}}).filter(x=>x.quantity>0);
        expanded.push({...row,scheduleEntryId:v.id,visitId:v.id,visitNo:Number(v.visit_no||0),scheduledDate:v.scheduled_date||'',scheduledTime:String(v.scheduled_time||'').slice(0,5),teamId:v.installation_team_id||row.teamId,teamName:v.team?.name||row.teamName,technicianName:v.technician_name||row.technicianName,status:v.status||row.status,services,totalServicesCount:services.reduce((a,x)=>a+Number(x.quantity||0),0),totalServicesAmount:services.reduce((a,x)=>a+Number(x.lineTotal||0),0)});
      });
    }
    return expanded;
  }

  async function schedulePlan(requestId){
    requireAction('view','installationSchedule');
    const [{data:visits,error},{data:requestServices,error:serviceError}]=await Promise.all([
      db().from('installation_execution_visits').select('id,visit_no,scheduled_date,scheduled_time,installation_team_id,technician_name,status').eq('installation_request_id',requestId).in('status',['مجدولة','قيد التنفيذ','بانتظار التأكيد']).order('visit_no'),
      db().from('installation_request_services').select('id,quantity,unit_price,line_total,service:installation_service_types(id,name)').eq('installation_request_id',requestId).order('id')
    ]);
    if(error&&error.code!=='42P01')throw new Error('تعذر تحميل خطة الزيارات: '+error.message);
    if(serviceError)throw new Error('تعذر تحميل خدمات الطلب: '+serviceError.message);
    const ids=(visits||[]).map(x=>x.id);let lines=[];
    if(ids.length){const result=await db().from('installation_execution_visit_services').select('visit_id,request_service_id,scheduled_quantity').in('visit_id',ids);if(result.error&&result.error.code!=='42P01')throw new Error('تعذر تحميل توزيع كميات الزيارات: '+result.error.message);lines=result.data||[];}
    return {
      services:(requestServices||[]).map(x=>({id:x.id,name:x.service?.name||'خدمة',quantity:Number(x.quantity||0),unitPrice:Number(x.unit_price||0),lineTotal:Number(x.line_total||0)})),
      visits:(visits||[]).map(v=>({...v,scheduled_time:String(v.scheduled_time||'').slice(0,5),lines:lines.filter(x=>x.visit_id===v.id).map(x=>({requestServiceId:x.request_service_id,quantity:Number(x.scheduled_quantity||0)}))}))
    };
  }

  async function assignMultiDay(payload){
    requireAction('edit','installationSchedule');
    if(!payload.id||!Array.isArray(payload.visits)||payload.visits.length<2)throw new Error('أضف يومين على الأقل لتقسيم الطلب.');
    const visits=payload.visits.map(v=>({scheduled_date:v.scheduledDate,scheduled_time:v.scheduledTime,team_id:v.teamId,technician_name:String(v.technicianName||'').trim(),services:(v.services||[]).map(x=>({request_service_id:x.requestServiceId,quantity:Number(x.quantity||0)}))}));
    for(const v of visits){if(!v.scheduled_date||!v.scheduled_time||!v.team_id||!v.technician_name)throw new Error('أكمل التاريخ والوقت والفرقة والفني لكل يوم.');}
    const {data,error}=await db().rpc('schedule_installation_request_multi_day',{p_request_id:payload.id,p_visits:visits,p_assignment_notes:payload.assignmentNotes||null});
    if(error)throw new Error('تعذر حفظ الجدولة متعددة الأيام: '+error.message);
    return data;
  }

  async function scheduleDayLocks(dateFrom,dateTo){requireAction('view','installationSchedule');const {data,error}=await db().rpc('get_installation_schedule_day_locks',{p_date_from:dateFrom,p_date_to:dateTo});if(error)throw new Error('تعذر تحميل حالة أيام الجدولة: '+error.message);return (data||[]).map(r=>({date:r.schedule_date,isLocked:r.is_locked===true,lockedBy:r.locked_by_name||'',lockedAt:r.locked_at||''}))}
  async function setScheduleDayLock(scheduleDate,isLocked){requireAction('edit','installationSchedule');const {data,error}=await db().rpc('set_installation_schedule_day_lock',{p_schedule_date:scheduleDate,p_is_locked:!!isLocked});if(error)throw new Error('تعذر تحديث حالة يوم الجدولة: '+error.message);return data}
  async function technicianBookedTimes(scheduleDate,technicianName,excludeRequestId){requireAction('view','installationSchedule');if(!scheduleDate||!String(technicianName||'').trim())return [];const {data,error}=await db().rpc('get_installation_technician_booked_times',{p_schedule_date:scheduleDate,p_technician_name:String(technicianName).trim(),p_exclude_request_id:excludeRequestId||null});if(error)throw new Error('تعذر تحميل المواعيد المحجوزة للفني: '+error.message);return (data||[]).map(r=>({time:String(r.scheduled_time||'').slice(0,5),requestNumber:r.request_number||''}))}
  async function cancelSchedule(requestId){requireAction('edit','installationSchedule');if(!requestId)throw new Error('معرّف طلب التركيب مطلوب.');const {data,error}=await db().rpc('cancel_installation_request_schedule',{p_request_id:requestId});if(error)throw new Error('تعذر إلغاء جدولة طلب التركيب: '+error.message);return data}
  async function assign(payload){requireAction('edit','installationSchedule');const technicianName=String(payload.technicianName||'').trim();if(!payload.scheduledDate)throw new Error('تاريخ التركيب مطلوب.');if(!payload.scheduledTime)throw new Error('وقت التركيب مطلوب.');if(!/^([01]\d|2[01]):00$/.test(payload.scheduledTime)||Number(payload.scheduledTime.slice(0,2))<10)throw new Error('وقت التركيب يجب أن يكون من 10 صباحًا حتى 9 مساءً.');if(!technicianName)throw new Error('اسم الفني مطلوب.');const normalizedName=technicianName.toLocaleLowerCase('ar').replace(/\s+/g,' ').trim();const {error:suggestionError}=await db().from('installation_technician_name_suggestions').upsert({name:technicianName,normalized_name:normalizedName,is_active:true},{onConflict:'normalized_name'});if(suggestionError)throw new Error('تعذر حفظ اسم الفني في قائمة المقترحات: '+suggestionError.message);if(!payload.teamId)throw new Error('اختر فرقة التركيبات.');const [{data:locked,error:lockError},{data:booked,error:bookedError}]=await Promise.all([db().rpc('is_installation_schedule_day_locked',{p_schedule_date:payload.scheduledDate}),db().rpc('get_installation_technician_booked_times',{p_schedule_date:payload.scheduledDate,p_technician_name:technicianName,p_exclude_request_id:payload.id||null})]);if(lockError)throw new Error('تعذر التحقق من حالة يوم الجدولة: '+lockError.message);if(locked===true)throw new Error('هذا اليوم مغلق. افتح اليوم أولًا قبل الجدولة.');if(bookedError)throw new Error('تعذر التحقق من موعد الفني: '+bookedError.message);if((booked||[]).some(x=>String(x.scheduled_time||'').slice(0,5)===String(payload.scheduledTime).slice(0,5)))throw new Error('هذا الموعد محجوز للفني المحدد. اختر موعدًا آخر.');const record={scheduled_date:payload.scheduledDate,scheduled_time:payload.scheduledTime,time_slot:null,installation_team_id:payload.teamId,assigned_technician_name:technicianName,technician_id:null,status:'مسند',assignment_notes:payload.assignmentNotes||null};const {error}=await db().from('installation_requests').update(record).eq('id',payload.id);if(error)throw new Error('تعذر حفظ الجدولة والإسناد: '+error.message)}
  async function saveTechnician(payload){requireAction(payload.id?'edit':'add','installationSchedule');const record={full_name:payload.name,phone:payload.phone||null,specialty:payload.specialty||null,city:payload.city||null,status:payload.status||'متاح'};let q=payload.id?db().from('installation_technicians').update(record).eq('id',payload.id):db().from('installation_technicians').insert(record);const {error}=await q;if(error)throw new Error('تعذر حفظ بيانات الفني: '+error.message)}
  async function removeTechnician(id){requireAction('delete','installationSchedule');const {error}=await db().from('installation_technicians').delete().eq('id',id);if(error)throw new Error('تعذر حذف الفني: '+error.message)}

  async function executionWorkspace(){
    requireAction('view','installationExecution');
    const [requestResult,visitResult,lineResult,currentResult]=await Promise.all([
      db().from('installation_requests').select('*,customer:customers(id,customer_name,phone),team:installation_teams(id,name,status),representative:sales_representatives(id,full_name),services:installation_request_services(id,quantity,unit_price,line_total,service_type:installation_service_types(id,name))').or('installation_team_id.not.is.null,assigned_technician_name.not.is.null').order('scheduled_date',{ascending:true,nullsFirst:false}).order('scheduled_time',{ascending:true,nullsFirst:false}),
      db().from('installation_execution_visits').select('id,installation_request_id,visit_no,scheduled_date,scheduled_time,installation_team_id,technician_name,status,team:installation_teams(id,name)').in('status',['مجدولة','قيد التنفيذ','بانتظار التأكيد']).order('scheduled_date',{ascending:true}).order('scheduled_time',{ascending:true}),
      db().from('installation_execution_visit_services').select('visit_id,request_service_id,scheduled_quantity'),
      db().rpc('get_current_installation_execution_request_id')
    ]);
    if(requestResult.error)throw new Error('تعذر تحميل مهام التنفيذ: '+requestResult.error.message);
    if(visitResult.error&&visitResult.error.code!=='42P01')throw new Error('تعذر تحميل زيارات التنفيذ: '+visitResult.error.message);
    if(lineResult.error&&lineResult.error.code!=='42P01')throw new Error('تعذر تحميل خدمات زيارات التنفيذ: '+lineResult.error.message);
    if(currentResult.error)throw new Error('تعذر تحديد الطلب الحالي: '+currentResult.error.message);
    const currentId=currentResult.data;
    const requests=requestResult.data||[],visits=visitResult.data||[],visitLines=lineResult.data||[];
    const lineMap=new Map();
    visitLines.forEach(x=>{const a=lineMap.get(x.visit_id)||[];a.push(x);lineMap.set(x.visit_id,a)});
    const visitsByRequest=new Map();
    visits.forEach(v=>{const a=visitsByRequest.get(v.installation_request_id)||[];a.push(v);visitsByRequest.set(v.installation_request_id,a)});
    const normalizeRequest=(r)=>({
      id:r.id,requestNumber:r.request_number,customerName:r.customer?.customer_name||'',customerPhone:r.customer?.phone||'',representativeId:r.representative_id||'',representativeName:r.representative?.full_name||'',scheduledDate:r.scheduled_date||'',scheduledTime:String(r.scheduled_time||'').slice(0,5),status:r.status||'مسند',priority:r.priority||'عادية',technicianName:r.assigned_technician_name||'',teamId:r.installation_team_id||'',teamName:r.team?.name||'',installationAddress:r.installation_address||'',customerMapUrl:r.customer_map_url||'',assignmentNotes:r.assignment_notes||'',requestNotes:r.notes||'',displayNotes:r.assignment_notes||r.notes||'',executionNotes:r.execution_notes||'',selectedForExecutionAt:r.selected_for_execution_at||'',selectedForExecutionBy:r.selected_for_execution_by||'',isCurrentUserSelection:Boolean(currentId&&r.id===currentId),mapOpenedAt:r.map_opened_at||'',onRouteAt:r.on_route_at||'',arrivedAt:r.arrived_at||'',startedAt:r.started_at||'',completedAt:r.completed_at||'',totalServicesCount:Number(r.total_services_count||0),totalServicesAmount:Number(r.total_services_amount||0),services:(r.services||[]).map(x=>({id:x.id,name:x.service_type?.name||'خدمة',quantity:Number(x.quantity||0),unitPrice:Number(x.unit_price||0),lineTotal:Number(x.line_total||0)}))
    });
    const output=[];
    requests.forEach(r=>{
      const base=normalizeRequest(r),own=visitsByRequest.get(r.id)||[];
      if(!own.length){output.push(base);return;}
      own.forEach(v=>{
        const allocations=new Map((lineMap.get(v.id)||[]).map(x=>[x.request_service_id,Number(x.scheduled_quantity||0)]));
        const allocated=base.services.map(x=>{const quantity=allocations.has(x.id)?allocations.get(x.id):0;return {...x,quantity,lineTotal:quantity*Number(x.unitPrice||0)}}).filter(x=>x.quantity>0);
        const services=allocated.length?allocated:base.services;
        output.push({...base,scheduleEntryId:v.id,visitId:v.id,visitNo:Number(v.visit_no||0),scheduledDate:v.scheduled_date||base.scheduledDate,scheduledTime:String(v.scheduled_time||base.scheduledTime||'').slice(0,5),teamId:v.installation_team_id||base.teamId,teamName:v.team?.name||base.teamName,technicianName:v.technician_name||base.technicianName,visitStatus:v.status||'',services,totalServicesCount:services.reduce((a,x)=>a+Number(x.quantity||0),0),totalServicesAmount:services.reduce((a,x)=>a+Number(x.lineTotal||0),0)});
      });
    });
    return output;
  }
  async function executionIdentity(){
    requireAction('view','installationExecution');
    const profile=window.CustomerAuth?.getState?.().profile||{};
    const role=String(profile.role||'').trim();
    const [{data:binding,error:bindingError},{data:scope,error:scopeError}]=await Promise.all([
      db().from('installation_user_technician_bindings').select('installation_team_id,technician_name,team:installation_teams(id,name)').maybeSingle(),
      db().from('installation_data_access_profiles').select('access_mode').maybeSingle()
    ]);
    if(bindingError&&bindingError.code!=='PGRST116')throw new Error('تعذر تحميل هوية فني التركيبات: '+bindingError.message);
    if(scopeError&&scopeError.code!=='PGRST116'&&scopeError.code!=='42P01')throw new Error('تعذر تحميل نطاق تنفيذ التركيبات: '+scopeError.message);
    const accessMode=role==='super_admin'?'all':String(scope?.access_mode||'own').trim().toLowerCase();
    const isTechnicianRole=role==='viewer';
    const technicianName=String(binding?.technician_name||'').trim();
    const teamId=String(binding?.installation_team_id||'').trim();
    const lockIdentity=Boolean(isTechnicianRole&&accessMode==='own'&&technicianName&&teamId);
    return {
      role,
      accessMode,
      lockIdentity,
      teamId,
      teamName:binding?.team?.name||'',
      technicianName,
      canEdit:Boolean(window.CustomerPermissions?.canAction?.('installationExecution','edit')),
      canObserveInProgress:['super_admin','customer_service','sales_manager','sales_supervisor','sales_representative','viewer'].includes(role)
    };
  }
  async function selectExecutionRequest(id){requireAction('edit','installationExecution');const {error}=await db().rpc('select_installation_execution_request',{p_request_id:id});if(error)throw new Error('تعذر اختيار الطلب الحالي: '+error.message)}
  async function recordMapOpened(id){requireAction('edit','installationExecution');const {error}=await db().rpc('record_installation_map_opened',{p_request_id:id});if(error)throw new Error('تعذر تسجيل فتح موقع العميل: '+error.message)}
  async function uploadExecutionFile(requestId,file){if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('صيغة الصورة غير مدعومة.');if(file.size>10485760)throw new Error('حجم الصورة يجب ألا يتجاوز 10 ميجابايت.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=`${requestId}/execution/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error:up}=await db().storage.from('installation-evidence').upload(path,file,{contentType:file.type,upsert:false});if(up)throw new Error('تعذر رفع صورة التنفيذ: '+up.message);const {error}=await db().from('installation_execution_files').insert({installation_request_id:requestId,storage_path:path,original_name:file.name,mime_type:file.type,file_size:file.size});if(error)throw new Error('تعذر تسجيل صورة التنفيذ: '+error.message);return path}
  async function advanceExecution(payload){requireAction('edit','installationExecution');const allowed=['في الطريق','وصل إلى العميل','قيد التنفيذ','مكتمل'];if(!allowed.includes(payload.nextStatus))throw new Error('مرحلة التنفيذ غير مسموحة.');if(payload.nextStatus==='مكتمل'&&payload.photos?.length)for(const f of payload.photos)await uploadExecutionFile(payload.id,f);const {error}=await db().rpc('advance_installation_execution_stage',{p_request_id:payload.id,p_next_status:payload.nextStatus,p_notes:payload.notes||null});if(error)throw new Error('تعذر تحديث مرحلة التنفيذ: '+error.message)}
  async function completionList(){requireAction('view','installationCompletion');const [requests,reports,files,invoices,serviceRows]=await Promise.all([fetchPaged((from,to)=>db().from('installation_requests').select('*,customer:customers(id,customer_name,phone),technician:installation_technicians(id,full_name),representative:sales_representatives(id,full_name),team:installation_teams(id,name)').eq('status','مكتمل').order('completed_at',{ascending:false,nullsFirst:false}).range(from,to)),fetchPaged((from,to)=>db().from('installation_completion_reports').select('*').range(from,to)),fetchPaged((from,to)=>db().from('installation_completion_files').select('*').range(from,to),1000),fetchPaged((from,to)=>db().from('sales_invoices').select('installation_request_id,status').eq('source_type','installation').neq('status','ملغاة').range(from,to),1000),fetchPaged((from,to)=>db().from('installation_request_services').select('installation_request_id,quantity,line_total,service:installation_service_types(default_cost)').range(from,to),1000)]);const invoicedIds=new Set(invoices.map(x=>x.installation_request_id).filter(Boolean));const reportMap=new Map(reports.map(x=>[x.installation_request_id,x]));const filesMap=new Map(),amountMap=new Map(),costMap=new Map();files.forEach(f=>{const arr=filesMap.get(f.installation_request_id)||[];arr.push(f);filesMap.set(f.installation_request_id,arr)});serviceRows.forEach(x=>{amountMap.set(x.installation_request_id,(amountMap.get(x.installation_request_id)||0)+Number(x.line_total||0));costMap.set(x.installation_request_id,(costMap.get(x.installation_request_id)||0)+(Number(x.quantity||0)*Number(x.service?.default_cost||0)))});return requests.filter(r=>!invoicedIds.has(r.id)).map(r=>({id:r.id,requestNumber:r.request_number,customerOrderNumber:r.customer_order_number||'',customerName:r.customer?.customer_name||'',customerPhone:r.customer?.phone||'',technicianName:r.assigned_technician_name||r.technician?.full_name||'',representativeId:r.representative_id||r.representative?.id||'',representativeName:r.representative?.full_name||'',teamName:r.team?.name||'',installationAddress:r.installation_address||'',completedAt:r.completed_at||'',invoiceAmount:Number(r.total_services_amount||amountMap.get(r.id)||0),installationExpenses:Number(costMap.get(r.id)||0),report:reportMap.get(r.id)||null,files:filesMap.get(r.id)||[]}))}
  async function uploadCompletionFile(requestId,fileKind,file){
    if(!file)return null;
    if(!['before','after','delivery_authorization'].includes(fileKind))throw new Error('نوع مرفق محضر التركيب غير مدعوم.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP.');
    if(file.size<1||file.size>10485760)throw new Error('حجم الصورة يجب أن يكون بين 1 بايت و10 ميجابايت.');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=`${requestId}/completion/${fileKind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const {error:uploadError}=await db().storage.from('installation-evidence').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw new Error('تعذر رفع مرفق محضر التركيب: '+uploadError.message);
    const {error:recordError}=await db().from('installation_completion_files').insert({installation_request_id:requestId,file_kind:fileKind,storage_path:path,original_name:file.name,mime_type:file.type,file_size:file.size});
    if(recordError){
      await db().storage.from('installation-evidence').remove([path]);
      throw new Error('تعذر تسجيل مرفق محضر التركيب: '+recordError.message);
    }
    return path;
  }
  async function saveCompletion(payload){
    requireAction('edit','installationCompletion');
    requireAction('add','salesInvoices');
    if(!payload?.id)throw new Error('معرّف طلب التركيب مطلوب.');
    const workSummary=String(payload.workSummary||'').trim();
    const recipientName=String(payload.recipientName||'').trim();
    const invoiceNumber=String(payload.invoiceNumber||'').trim();
    const invoiceDate=String(payload.invoiceDate||'').trim();
    if(!workSummary)throw new Error('ملخص الأعمال المنفذة مطلوب.');
    if(!recipientName)throw new Error('اسم مستلم الأعمال مطلوب.');
    if(!/^\d{9}$/.test(invoiceNumber))throw new Error('رقم الفاتورة يجب أن يتكون من 9 أرقام إنجليزية بالضبط.');
    if(!invoiceDate)throw new Error('تاريخ الفاتورة مطلوب.');
    const report={installation_request_id:payload.id,work_summary:workSummary,recipient_name:recipientName,invoice_number:invoiceNumber,invoice_date:invoiceDate,recipient_role:null,customer_notes:null,signed_at:null};
    const {error:reportError}=await db().from('installation_completion_reports').upsert(report,{onConflict:'installation_request_id'});
    if(reportError)throw new Error('تعذر حفظ محضر إكمال التركيب: '+reportError.message);
    const {error:invoiceSyncError}=await db().rpc('sync_sales_invoice_from_installation',{p_installation_request_id:payload.id});
    if(invoiceSyncError)throw new Error('تم حفظ المحضر لكن تعذر تسجيل فاتورة المبيعات: '+invoiceSyncError.message);
    const jobs=[];
    for(const file of (payload.beforePhotos||[]))jobs.push(uploadCompletionFile(payload.id,'before',file));
    for(const file of (payload.afterPhotos||[]))jobs.push(uploadCompletionFile(payload.id,'after',file));
    if(payload.deliveryAuthorizationFile)jobs.push(uploadCompletionFile(payload.id,'delivery_authorization',payload.deliveryAuthorizationFile));
    for(const job of jobs)await job;
    return true;
  }
  async function signedFileUrl(path,expiresIn=900){const {data,error}=await db().storage.from('installation-evidence').createSignedUrl(path,expiresIn);if(error)throw new Error('تعذر فتح المرفق: '+error.message);return data?.signedUrl||''}
  async function exceptionList(){requireAction('view','installationExceptions');const [{data:requests,error:re},{data:revisits,error:ve}]=await Promise.all([db().from('installation_requests').select('*,customer:customers(id,customer_name,phone),technician:installation_technicians(id,full_name)').in('status',['مؤجل','متعذر']).order('last_status_changed_at',{ascending:false,nullsFirst:false}),db().from('installation_revisits').select('*').order('created_at',{ascending:false})]);if(re)throw new Error('تعذر تحميل استثناءات التركيبات: '+re.message);if(ve)throw new Error('تعذر تحميل إعادة الزيارات: '+ve.message);const map=new Map();(revisits||[]).forEach(v=>{if(!map.has(v.installation_request_id)||v.status==='مجدولة')map.set(v.installation_request_id,v)});return (requests||[]).map(r=>({id:r.id,requestNumber:r.request_number,customerName:r.customer?.customer_name||'',customerPhone:r.customer?.phone||'',technicianId:r.technician_id||'',technicianName:r.assigned_technician_name||r.technician?.full_name||'',scheduledDate:r.scheduled_date||'',status:r.status||'',failureReason:r.execution_failure_reason||'',executionNotes:r.execution_notes||'',activeRevisit:(()=>{const v=map.get(r.id);return v?{id:v.id,scheduledDate:v.scheduled_date||'',timeSlot:v.time_slot||'',technicianId:v.technician_id||'',actionType:v.action_type||'إعادة زيارة',notes:v.notes||'',status:v.status||'مجدولة'}:null})()}))}
  async function saveRevisit(payload){requireAction('edit','installationExceptions');if(!payload.scheduledDate||!payload.technicianId)throw new Error('تاريخ إعادة الزيارة والفني مطلوبان.');const {data:existing,error:ee}=await db().from('installation_revisits').select('id').eq('installation_request_id',payload.requestId).eq('status','مجدولة').maybeSingle();if(ee)throw new Error('تعذر التحقق من إعادة الزيارة: '+ee.message);const record={installation_request_id:payload.requestId,scheduled_date:payload.scheduledDate,time_slot:payload.timeSlot,technician_id:payload.technicianId,action_type:payload.actionType||'إعادة زيارة',notes:payload.notes||null,status:'مجدولة'};let q=existing?.id?db().from('installation_revisits').update(record).eq('id',existing.id):db().from('installation_revisits').insert(record);const {error}=await q;if(error)throw new Error('تعذر حفظ إعادة الزيارة: '+error.message);const {error:ue}=await db().from('installation_requests').update({scheduled_date:payload.scheduledDate,time_slot:payload.timeSlot,technician_id:payload.technicianId,status:'مسند',assignment_notes:payload.notes||null}).eq('id',payload.requestId);if(ue)throw new Error('تم حفظ الزيارة لكن تعذر تحديث طلب التركيب: '+ue.message)}
  async function operationalReport(filters={}){
    requireAction('view','installationReports');
    let q=db().from('installation_requests').select('id,request_number,status,scheduled_date,installation_team_id,technician_id,assigned_technician_name,representative_id,total_services_amount,started_at,completed_at,execution_failure_reason,customer:customers(id,customer_name),technician:installation_technicians(id,full_name),team:installation_teams(id,name),representative:sales_representatives(id,full_name)');
    if(filters.dateFrom)q=q.gte('scheduled_date',filters.dateFrom);
    if(filters.dateTo)q=q.lte('scheduled_date',filters.dateTo);
    if(filters.technicianId)q=q.eq('technician_id',filters.technicianId);
    if(filters.teamId)q=q.eq('installation_team_id',filters.teamId);
    if(filters.representativeId)q=q.eq('representative_id',filters.representativeId);
    if(filters.status)q=q.eq('status',filters.status);
    const [{data:rows,error:re},{data:revisits,error:ve},{data:techs,error:te},{data:teams,error:tme},{data:reps,error:rpe},{data:invoices,error:ie},{data:services,error:se}]=await Promise.all([
      q.order('scheduled_date',{ascending:false,nullsFirst:false}),
      db().from('installation_revisits').select('installation_request_id'),
      db().from('installation_technicians').select('id,full_name').order('full_name'),
      db().from('installation_teams').select('id,name').order('name'),
      db().from('sales_representatives').select('id,full_name').order('full_name'),
      db().from('sales_invoices').select('installation_request_id,invoice_number,invoice_amount,installation_expenses,invoice_date,status').eq('source_type','installation').neq('status','ملغاة'),
      db().from('installation_request_services').select('installation_request_id,quantity,line_total,service:installation_service_types(default_cost)')
    ]);
    if(re)throw new Error('تعذر تحميل تقرير التركيبات: '+re.message);
    if(ve)throw new Error('تعذر تحميل بيانات إعادة الزيارة: '+ve.message);
    if(te||tme||rpe)throw new Error('تعذر تحميل قوائم تصفية تقارير التركيبات.');
    if(ie)throw new Error('تعذر تحميل القيم المالية للفواتير: '+ie.message);
    if(se)throw new Error('تعذر تحميل تكاليف خدمات التركيبات: '+se.message);
    const revisitCount=new Map();(revisits||[]).forEach(v=>revisitCount.set(v.installation_request_id,(revisitCount.get(v.installation_request_id)||0)+1));
    const invoiceMap=new Map();(invoices||[]).forEach(x=>invoiceMap.set(x.installation_request_id,x));
    const serviceAmount=new Map(),serviceCost=new Map(),serviceQuantity=new Map();(services||[]).forEach(x=>{serviceAmount.set(x.installation_request_id,(serviceAmount.get(x.installation_request_id)||0)+Number(x.line_total||0));serviceCost.set(x.installation_request_id,(serviceCost.get(x.installation_request_id)||0)+Number(x.quantity||0)*Number(x.service?.default_cost||0));serviceQuantity.set(x.installation_request_id,(serviceQuantity.get(x.installation_request_id)||0)+Number(x.quantity||0));});
    const normalized=(rows||[]).map(r=>{const inv=invoiceMap.get(r.id);const revenue=Number(inv?.invoice_amount??r.total_services_amount??serviceAmount.get(r.id)??0);const expenses=Number(inv?.installation_expenses??serviceCost.get(r.id)??0);const profit=revenue-expenses;const duration=r.started_at&&r.completed_at?(new Date(r.completed_at)-new Date(r.started_at))/60000:null;return {id:r.id,requestNumber:r.request_number,customerName:r.customer?.customer_name||'',representativeId:r.representative_id||'',representativeName:r.representative?.full_name||'غير محدد',teamId:r.installation_team_id||'',teamName:r.team?.name||'غير مسند',technicianId:r.technician_id||'',technicianName:r.assigned_technician_name||r.technician?.full_name||'غير مسند',status:r.status||'',scheduledDate:r.scheduled_date||'',failureReason:r.execution_failure_reason||'',startedAt:r.started_at||'',completedAt:r.completed_at||'',durationMinutes:Number.isFinite(duration)&&duration>=0?duration:null,revisitCount:revisitCount.get(r.id)||0,invoiceNumber:inv?.invoice_number||'',invoiceDate:inv?.invoice_date||'',invoiceStatus:inv?.status||'',isInvoiced:Boolean(inv),revenue,expenses,profit,margin:revenue?profit/revenue*100:0,requestedQuantity:Number(serviceQuantity.get(r.id)||0),executedQuantity:(r.status==='مكتمل'||Boolean(inv))?Number(serviceQuantity.get(r.id)||0):0,remainingQuantity:(r.status==='مكتمل'||Boolean(inv))?0:Number(serviceQuantity.get(r.id)||0),executionRate:(r.status==='مكتمل'||Boolean(inv))?100:0};});
    const sum=(arr,key)=>arr.reduce((a,x)=>a+Number(x[key]||0),0),avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
    const total=normalized.length,completed=normalized.filter(r=>r.status==='مكتمل'||r.isInvoiced).length,revisitTotal=normalized.filter(r=>r.revisitCount>0).length,revenue=sum(normalized,'revenue'),expenses=sum(normalized,'expenses'),profit=revenue-expenses;
    const durations=normalized.map(r=>r.durationMinutes).filter(Number.isFinite);
    const summary={total,completed,revenue,expenses,profit,margin:revenue?Math.round(profit/revenue*1000)/10:0,completionRate:total?Math.round(completed/total*100):0,revisitRate:total?Math.round(revisitTotal/total*100):0,averageDurationMinutes:avg(durations)};
    function aggregate(keyName,labelName){const map=new Map();normalized.forEach(r=>{const key=r[keyName]||'none',x=map.get(key)||{id:key,name:r[labelName]||'غير محدد',total:0,completed:0,exceptions:0,revisits:0,revenue:0,expenses:0,profit:0,durations:[]};x.total++;if(r.status==='مكتمل'||r.isInvoiced)x.completed++;if(['مؤجل','متعذر'].includes(r.status))x.exceptions++;if(r.revisitCount)x.revisits+=r.revisitCount;x.revenue+=r.revenue;x.expenses+=r.expenses;x.profit+=r.profit;if(Number.isFinite(r.durationMinutes))x.durations.push(r.durationMinutes);map.set(key,x)});return [...map.values()].map(x=>({...x,averageDurationMinutes:avg(x.durations),completionRate:x.total?Math.round(x.completed/x.total*100):0,averageOrderValue:x.total?x.revenue/x.total:0})).sort((a,b)=>b.profit-a.profit)}
    const reasonMap=new Map();normalized.filter(r=>r.failureReason).forEach(r=>reasonMap.set(r.failureReason,(reasonMap.get(r.failureReason)||0)+1));
    return {summary,rows:normalized,byRepresentative:aggregate('representativeId','representativeName'),byTeam:aggregate('teamId','teamName'),byTechnician:aggregate('technicianId','technicianName'),failureReasons:[...reasonMap.entries()].map(([reason,count])=>({reason,count})).sort((a,b)=>b.count-a.count),technicians:(techs||[]).map(t=>({id:t.id,name:t.full_name})),teams:(teams||[]).map(t=>({id:t.id,name:t.name})),representatives:(reps||[]).map(r=>({id:r.id,name:r.full_name}))};
  }


  async function installationSummaryReport(filters={}){
    requireAction('view','installationReports');
    const selectedTeams=Array.isArray(filters.teamIds)?new Set(filters.teamIds.filter(Boolean).map(String)):new Set(),teamFilterApplied=filters.teamFilterApplied===true;
    let visitsQuery=db().from('installation_execution_visits').select('id,installation_request_id,scheduled_date,scheduled_time,installation_team_id,technician_name,status,team:installation_teams(id,name),request:installation_requests(id,request_number,representative_id,status,scheduled_date,scheduled_time,assigned_technician_name,total_services_amount,on_route_at,map_opened_at,arrived_at,started_at,completed_at,customer:customers(id,customer_name,phone),representative:sales_representatives(id,full_name))');
    let requestsQuery=db().from('installation_requests').select('id,request_number,scheduled_date,scheduled_time,installation_team_id,assigned_technician_name,representative_id,status,total_services_amount,on_route_at,map_opened_at,arrived_at,started_at,completed_at,customer:customers(id,customer_name,phone),team:installation_teams(id,name),representative:sales_representatives(id,full_name)');
    if(filters.date){visitsQuery=visitsQuery.eq('scheduled_date',filters.date);requestsQuery=requestsQuery.eq('scheduled_date',filters.date)}
    const [{data:visits,error:ve},{data:scheduledRequests,error:sre},{data:teams,error:te},{data:reps,error:re}]=await Promise.all([
      visitsQuery.order('scheduled_date',{ascending:true}),
      requestsQuery.order('scheduled_date',{ascending:true}),
      db().from('installation_teams').select('id,name').order('name'),
      db().from('sales_representatives').select('id,full_name').order('full_name')
    ]);
    if(ve)throw new Error('تعذر تحميل زيارات ملخص التركيبات: '+ve.message);
    if(sre)throw new Error('تعذر تحميل الطلبات المجدولة لملخص التركيبات: '+sre.message);
    if(te||re)throw new Error('تعذر تحميل فلاتر ملخص التركيبات.');
    const inScope=(row,representativeId,teamId)=>(!filters.representativeId||String(representativeId||'')===String(filters.representativeId))&&(!teamFilterApplied||selectedTeams.has(String(teamId||'')));
    const scopedVisits=(visits||[]).filter(v=>inScope(v,v.request?.representative_id,v.installation_team_id));
    const scopedRequests=(scheduledRequests||[]).filter(r=>inScope(r,r.representative_id,r.installation_team_id));

    // A request scheduled through the multi-day workflow must be represented by its visit rows only.
    // Check all candidate single-day request IDs for any execution visit, not only visits on the selected date,
    // so the request row can never double-count a multi-day schedule.
    const candidateRequestIds=[...new Set(scopedRequests.map(r=>r.id).filter(Boolean))];
    let requestsWithVisits=new Set();
    if(candidateRequestIds.length){
      const {data:anyVisits,error:ave}=await db().from('installation_execution_visits').select('installation_request_id').in('installation_request_id',candidateRequestIds);
      if(ave)throw new Error('تعذر التحقق من نوع جدولة طلبات ملخص التركيبات: '+ave.message);
      requestsWithVisits=new Set((anyVisits||[]).map(v=>String(v.installation_request_id||'')).filter(Boolean));
    }
    const singleDayRequests=scopedRequests.filter(r=>!requestsWithVisits.has(String(r.id||'')));
    if(!scopedVisits.length&&!singleDayRequests.length)return {rows:[],executionGroups:[],summary:{teams:0,visits:0,quantity:0,value:0,expenses:0,profit:0,average:0},teams:(teams||[]).map(x=>({id:x.id,name:x.name})),representatives:(reps||[]).map(x=>({id:x.id,name:x.full_name}))};

    const visitIds=scopedVisits.map(v=>v.id).filter(Boolean);
    const requestIds=[...new Set([...scopedVisits.map(v=>v.installation_request_id),...singleDayRequests.map(r=>r.id)].filter(Boolean))];
    const visitLinesResult=visitIds.length?await db().from('installation_execution_visit_services').select('visit_id,request_service_id,scheduled_quantity').in('visit_id',visitIds):{data:[],error:null};
    const requestServicesResult=requestIds.length?await db().from('installation_request_services').select('id,installation_request_id,quantity,unit_price,line_total,service:installation_service_types(id,name,default_price,default_cost)').in('installation_request_id',requestIds):{data:[],error:null};
    const {data:visitLines,error:vle}=visitLinesResult,{data:requestServices,error:rse}=requestServicesResult;
    if(vle)throw new Error('تعذر تحميل كميات خدمات الزيارات: '+vle.message);
    if(rse)throw new Error('تعذر تحميل خدمات طلبات التركيبات: '+rse.message);

    const visitMap=new Map(scopedVisits.map(v=>[v.id,v])),serviceMap=new Map((requestServices||[]).map(x=>[x.id,x])),servicesByRequest=new Map(),grouped=new Map();
    for(const service of requestServices||[]){const key=String(service.installation_request_id||'');const list=servicesByRequest.get(key)||[];list.push(service);servicesByRequest.set(key,list)}
    const addLine=(teamId,teamName,entryKey,serviceName,quantity,unitPrice,unitCost)=>{
      quantity=Number(quantity||0);unitPrice=Number(unitPrice||0);unitCost=Number(unitCost||0);if(quantity<=0)return;
      const value=quantity*unitPrice,expenses=quantity*unitCost,profit=value-expenses;
      teamId=String(teamId||'unassigned');teamName=teamName||'غير مسند';serviceName=serviceName||'خدمة غير محددة';
      let team=grouped.get(teamId);if(!team){team={id:teamId,name:teamName,visitIds:new Set(),services:new Map(),quantity:0,value:0,expenses:0,profit:0};grouped.set(teamId,team)}
      team.visitIds.add(entryKey);team.quantity+=quantity;team.value+=value;team.expenses+=expenses;team.profit+=profit;
      let item=team.services.get(serviceName);if(!item){item={name:serviceName,entryKeys:new Set(),quantity:0,value:0,expenses:0,profit:0};team.services.set(serviceName,item)}item.entryKeys.add(entryKey);item.quantity+=quantity;item.value+=value;item.expenses+=expenses;item.profit+=profit;
    };

    // Multi-day schedules: use the quantity allocated to each execution visit.
    for(const line of visitLines||[]){
      const visit=visitMap.get(line.visit_id),service=serviceMap.get(line.request_service_id);if(!visit||!service)continue;
      const unitPrice=Number(service.unit_price??service.service?.default_price??(Number(service.quantity||0)?Number(service.line_total||0)/Number(service.quantity||1):0));
      addLine(visit.installation_team_id,visit.team?.name,'visit:'+visit.id,service.service?.name,Number(line.scheduled_quantity||0),unitPrice,Number(service.service?.default_cost||0));
    }

    // Single-day schedules: there is no execution-visit row, so use the request's scheduled date/team
    // and the original request-service quantity/value as the reporting source.
    for(const request of singleDayRequests){
      for(const service of servicesByRequest.get(String(request.id||''))||[]){
        const quantity=Number(service.quantity||0);
        const unitPrice=Number(service.unit_price??service.service?.default_price??(quantity?Number(service.line_total||0)/quantity:0));
        addLine(request.installation_team_id,request.team?.name,'request:'+request.id,service.service?.name,quantity,unitPrice,Number(service.service?.default_cost||0));
      }
    }

    const rows=[...grouped.values()].map(team=>({id:team.id,name:team.name,visits:team.visitIds.size,quantity:team.quantity,value:team.value,expenses:team.expenses,profit:team.profit,average:team.quantity?team.value/team.quantity:0,services:[...team.services.values()].map(x=>({name:x.name,executions:x.entryKeys.size,quantity:x.quantity,value:x.value,expenses:x.expenses,profit:x.profit,average:x.quantity?x.value/x.quantity:0})).sort((a,b)=>b.value-a.value)})).sort((a,b)=>b.value-a.value);
    const executionGrouped=new Map();
    const pushExecution=(teamId,teamName,entryKey,request,scheduledDate,scheduledTime,technicianName,services)=>{
      teamId=String(teamId||'unassigned');teamName=teamName||'غير مسند';
      const normalizedServices=(services||[]).filter(x=>Number(x.quantity||0)>0).map(x=>({name:x.name||'خدمة غير محددة',quantity:Number(x.quantity||0),value:Number(x.value||0),expenses:Number(x.expenses||0),profit:Number(x.profit||0)}));
      const value=normalizedServices.reduce((a,x)=>a+x.value,0),expenses=normalizedServices.reduce((a,x)=>a+x.expenses,0);
      const item={entryKey,requestId:request?.id||'',requestNumber:request?.request_number||'',customerName:request?.customer?.customer_name||'',customerPhone:request?.customer?.phone||'',representativeName:request?.representative?.full_name||'',teamId,teamName,technicianName:technicianName||request?.assigned_technician_name||'',scheduledDate:scheduledDate||request?.scheduled_date||'',scheduledTime:String(scheduledTime||request?.scheduled_time||'').slice(0,5),status:request?.status||'',services:normalizedServices,value,expenses,profit:value-expenses,onRouteAt:request?.on_route_at||'',mapOpenedAt:request?.map_opened_at||'',arrivedAt:request?.arrived_at||'',startedAt:request?.started_at||'',completedAt:request?.completed_at||''};
      let group=executionGrouped.get(teamId);if(!group){group={id:teamId,name:teamName,orders:[]};executionGrouped.set(teamId,group)}group.orders.push(item);
    };
    for(const visit of scopedVisits){
      const serviceLines=[];
      for(const line of visitLines||[]){if(String(line.visit_id)!==String(visit.id))continue;const service=serviceMap.get(line.request_service_id);if(!service)continue;const quantity=Number(line.scheduled_quantity||0);if(quantity<=0)continue;const unitPrice=Number(service.unit_price??service.service?.default_price??(Number(service.quantity||0)?Number(service.line_total||0)/Number(service.quantity||1):0)),unitCost=Number(service.service?.default_cost||0);serviceLines.push({name:service.service?.name,quantity,value:quantity*unitPrice,expenses:quantity*unitCost,profit:quantity*(unitPrice-unitCost)})}
      pushExecution(visit.installation_team_id,visit.team?.name,'visit:'+visit.id,visit.request,visit.scheduled_date,visit.scheduled_time,visit.technician_name,serviceLines);
    }
    for(const request of singleDayRequests){
      const serviceLines=(servicesByRequest.get(String(request.id||''))||[]).map(service=>{const quantity=Number(service.quantity||0),unitPrice=Number(service.unit_price??service.service?.default_price??(quantity?Number(service.line_total||0)/quantity:0)),unitCost=Number(service.service?.default_cost||0);return {name:service.service?.name,quantity,value:quantity*unitPrice,expenses:quantity*unitCost,profit:quantity*(unitPrice-unitCost)}});
      pushExecution(request.installation_team_id,request.team?.name,'request:'+request.id,request,request.scheduled_date,request.scheduled_time,request.assigned_technician_name,serviceLines);
    }
    const executionGroups=[...executionGrouped.values()].map(group=>({...group,orders:group.orders.sort((a,b)=>String(a.scheduledTime||'').localeCompare(String(b.scheduledTime||''))||String(a.requestNumber||'').localeCompare(String(b.requestNumber||''),'ar'))})).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
    const totalQuantity=rows.reduce((a,x)=>a+x.quantity,0),totalValue=rows.reduce((a,x)=>a+x.value,0),totalExpenses=rows.reduce((a,x)=>a+x.expenses,0),totalProfit=totalValue-totalExpenses;
    return {rows,executionGroups,summary:{teams:rows.length,visits:scopedVisits.length+singleDayRequests.length,quantity:totalQuantity,value:totalValue,expenses:totalExpenses,profit:totalProfit,average:totalQuantity?totalValue/totalQuantity:0},teams:(teams||[]).map(x=>({id:x.id,name:x.name})),representatives:(reps||[]).map(x=>({id:x.id,name:x.full_name}))};
  }

  async function settingsCatalog(){requireAction('view','installationSettings');const [services,teams,neighborhoods,regions,cities]=await Promise.all([db().from('installation_service_types').select('*').order('name'),db().from('installation_teams').select('*').order('name'),db().from('installation_neighborhoods').select('*').order('name'),db().from('installation_regions').select('id,name,is_active').order('name'),db().from('installation_cities').select('id,region_id,name,is_active').order('name')]);if(services.error)throw new Error('تعذر تحميل الخدمات: '+services.error.message);if(teams.error)throw new Error('تعذر تحميل فرق التركيبات: '+teams.error.message);if(neighborhoods.error)throw new Error('تعذر تحميل الأحياء: '+neighborhoods.error.message);if(regions.error||cities.error)throw new Error('تعذر تحميل المناطق والمدن. شغّل Migration المرحلة أولًا.');return {services:services.data||[],teams:teams.data||[],neighborhoods:neighborhoods.data||[],regions:regions.data||[],cities:cities.data||[]}}
  async function saveSettingItem(type,payload){
    requireAction(payload.id?'edit':'add','installationSettings');
    if(type==='neighborhood'){
      if(!payload.regionId)throw new Error('اختر المنطقة من القائمة النشطة.');
      if(!payload.cityId)throw new Error('اختر المدينة التابعة للمنطقة.');
      const [{data:region,error:regionError},{data:city,error:cityError}]=await Promise.all([
        db().from('installation_regions').select('id,name,is_active').eq('id',payload.regionId).eq('is_active',true).maybeSingle(),
        db().from('installation_cities').select('id,region_id,name,is_active').eq('id',payload.cityId).eq('is_active',true).maybeSingle()
      ]);
      if(regionError||!region)throw new Error('المنطقة المختارة غير متاحة أو غير نشطة.');
      if(cityError||!city)throw new Error('المدينة المختارة غير متاحة أو غير نشطة.');
      if(String(city.region_id)!==String(region.id))throw new Error('المدينة المختارة لا تتبع المنطقة المحددة.');
      payload.region=region.name||'';
      payload.city=city.name||'';
    }
    const map={service:{table:'installation_service_types',record:{name:payload.name,default_price:Number(payload.price||0),default_cost:Number(payload.cost||0),is_active:payload.isActive!==false}},team:{table:'installation_teams',record:{name:payload.name,leader_name:payload.leaderName||null,phone:payload.phone||null,city:payload.city||null,status:payload.status||'متاحة'}},neighborhood:{table:'installation_neighborhoods',record:{name:payload.name,city:payload.city||null,region:payload.region||null,city_id:payload.cityId||null,region_id:payload.regionId||null,is_active:payload.isActive!==false}}};
    const cfg=map[type];if(!cfg)throw new Error('نوع بيانات غير مدعوم.');
    let q=payload.id?db().from(cfg.table).update(cfg.record).eq('id',payload.id):db().from(cfg.table).insert(cfg.record);
    const {error}=await q;if(error)throw new Error('تعذر حفظ البيانات: '+error.message)
  }
  async function toggleSettingItem(type,id,isActive){requireAction('edit','installationSettings');const table=type==='service'?'installation_service_types':type==='neighborhood'?'installation_neighborhoods':'installation_teams';const record=type==='team'?{status:isActive?'متاحة':'غير نشطة'}:{is_active:!!isActive};const {error}=await db().from(table).update(record).eq('id',id);if(error)throw new Error('تعذر تحديث الحالة: '+error.message)}
  async function removeSettingItem(type,id){requireAction('delete','installationSettings');const table=type==='service'?'installation_service_types':type==='neighborhood'?'installation_neighborhoods':'installation_teams';const {error}=await db().from(table).delete().eq('id',id);if(error)throw new Error('تعذر حذف البيانات؛ قد تكون مرتبطة بطلبات قائمة. '+error.message)}

  async function getSettings(){requireAction('view','installationSettings');const {data,error}=await db().from('installation_settings').select('*').eq('id',1).maybeSingle();if(error)throw new Error('تعذر تحميل إعدادات التركيبات: '+error.message);const r=data||{};return {morningLabel:r.morning_label||'صباحية',eveningLabel:r.evening_label||'مسائية',slaDays:Number(r.sla_days??1),defaultPriority:r.default_priority||'عادية',requireCompletionReport:r.require_completion_report!==false}}
  async function saveSettings(payload){requireAction('edit','installationSettings');const record={id:1,morning_label:payload.morningLabel,evening_label:payload.eveningLabel,sla_days:payload.slaDays,default_priority:payload.defaultPriority,require_completion_report:!!payload.requireCompletionReport,updated_at:new Date().toISOString()};const {error}=await db().from('installation_settings').upsert(record,{onConflict:'id'});if(error)throw new Error('تعذر حفظ إعدادات التركيبات: '+error.message)}
  window.InstallationsService={list,options,requestEditDetail,requestEditOptions,createRequest,updateRequest,updateRequestServices,updateRequestContextServices,save,remove,technicians,scheduleTeams,technicianNameSuggestions,scheduleList,schedulePlan,assignMultiDay,cancelSchedule,scheduleDayLocks,setScheduleDayLock,technicianBookedTimes,assign,saveTechnician,removeTechnician,executionWorkspace,executionIdentity,selectExecutionRequest,recordMapOpened,advanceExecution,completionList,saveCompletion,signedFileUrl,exceptionList,saveRevisit,operationalReport,installationSummaryReport,getSettings,saveSettings,settingsCatalog,saveSettingItem,toggleSettingItem,removeSettingItem};
  window.dispatchEvent(new CustomEvent('kyum-installations-service-ready'));
})();
