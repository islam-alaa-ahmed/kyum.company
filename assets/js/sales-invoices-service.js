(()=>{
  "use strict";
  const db=()=>{if(!window.customerSupabase)throw new Error("اتصال Supabase غير جاهز.");return window.customerSupabase};
  const requireAction=(action)=>{if(!window.CustomerPermissions?.requireAction?.("salesInvoices",action,{silent:true}))throw new Error("ليس لديك صلاحية تنفيذ هذا الإجراء على فواتير المبيعات.")};
  const normalize=r=>({id:r.id,requestNumber:r.request_number||"—",customerName:r.customer?.customer_name||"—",invoiceNumber:r.invoice_number||"",invoiceAmount:Number(r.invoice_amount||0),installationExpenses:Number(r.installation_expenses||0),representativeName:r.representative?.full_name||"—",invoiceDate:r.invoice_date||"",sourceType:r.source_type||"quotation",status:r.status||"صادرة",quotationId:r.quotation_id||"",installationRequestId:r.installation_request_id||""});
  async function list(){requireAction("view");const {data,error}=await db().from("sales_invoices").select("id,request_number,invoice_number,invoice_amount,installation_expenses,invoice_date,source_type,status,quotation_id,installation_request_id,customer:customers(id,customer_name),representative:sales_representatives(id,full_name)").order("invoice_date",{ascending:false}).order("created_at",{ascending:false});if(error)throw new Error("تعذر تحميل فواتير المبيعات: "+error.message);return (data||[]).map(normalize)}
  async function createFromQuotation(quotationId){requireAction("add");const {data,error}=await db().rpc("create_sales_invoice_from_quotation",{p_quotation_id:quotationId});if(error)throw new Error("تعذر تحويل عرض السعر إلى فاتورة: "+error.message);return Array.isArray(data)?data[0]:data}
  window.SalesInvoicesService={list,createFromQuotation};
})();
