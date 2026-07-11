// KYUM Phase 10 — Quotations Supabase Service
(function () {
  function client() {
    if (!window.customerSupabase) {
      throw new Error("اتصال Supabase غير جاهز.");
    }
    return window.customerSupabase;
  }

  async function unwrap(request, fallbackMessage) {
    const { data, error } = await request;

    if (error) {
      if (error.code === "23505") {
        throw new Error("رقم عرض السعر مسجل بالفعل ولا يمكن تكراره.");
      }

      if (error.code === "23503") {
        throw new Error("تعذر الحفظ بسبب ارتباط العميل أو المندوب أو سبب الرفض.");
      }

      throw new Error(`${fallbackMessage}: ${error.message}`);
    }

    return data;
  }

  function normalizeQuotation(row) {
    return {
      id: row.id,
      code: row.quotation_number || "",
      customerId: row.customer_id,
      customerName: row.customer?.customer_name || "",
      customerPhone: row.customer?.phone || "",
      representative: row.representative?.full_name || "",
      representativeId: row.representative_id || row.representative?.id || null,
      quotationDate: row.quotation_date || "",
      amount: Number(row.amount || 0),
      status: row.status || "تحت التجهيز",
      expiryDate: row.expiry_date || "",
      rejectionReason: row.rejection_reason?.name || "",
      rejectionReasonId: row.rejection_reason_id || row.rejection_reason?.id || null,
      description: row.description || "",
      notes: row.notes || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  async function listQuotations() {
    const rows = await unwrap(
      client()
        .from("quotations")
        .select(`
          id,
          quotation_number,
          customer_id,
          representative_id,
          quotation_date,
          amount,
          status,
          expiry_date,
          rejection_reason_id,
          description,
          notes,
          created_at,
          updated_at,
          customer:customers (
            id,
            customer_name,
            phone
          ),
          representative:sales_representatives (
            id,
            full_name
          ),
          rejection_reason:no_sale_reasons (
            id,
            name
          )
        `)
        .order("quotation_date", { ascending: false })
        .order("created_at", { ascending: false }),
      "تعذر تحميل عروض الأسعار"
    );

    return (rows || []).map(normalizeQuotation);
  }

  async function findByNumber(quotationNumber, excludeId = null) {
    let query = client()
      .from("quotations")
      .select("id, quotation_number")
      .ilike("quotation_number", quotationNumber.trim())
      .limit(1);

    if (excludeId) query = query.neq("id", excludeId);

    const rows = await unwrap(query, "تعذر التحقق من رقم عرض السعر");
    return rows?.[0] || null;
  }

  async function updateCustomerSnapshot(record) {
    const customerPatch = {
      quotation_number: record.code.trim()
    };

    if (record.status === "مرفوض" && record.rejectionReasonId) {
      customerPatch.no_sale_reason_id = record.rejectionReasonId;
    }

    await unwrap(
      client()
        .from("customers")
        .update(customerPatch)
        .eq("id", record.customerId),
      "تم حفظ العرض ولكن تعذر تحديث بيانات العميل"
    );
  }

  async function recalculateCustomerSnapshot(customerId) {
    const latest = await unwrap(
      client()
        .from("quotations")
        .select("quotation_number, status, rejection_reason_id")
        .eq("customer_id", customerId)
        .order("quotation_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1),
      "تعذر إعادة احتساب آخر عرض سعر للعميل"
    );

    const latestQuotation = latest?.[0] || null;
    const patch = {
      quotation_number: latestQuotation?.quotation_number || null
    };

    if (latestQuotation?.status === "مرفوض" && latestQuotation.rejection_reason_id) {
      patch.no_sale_reason_id = latestQuotation.rejection_reason_id;
    }

    await unwrap(
      client()
        .from("customers")
        .update(patch)
        .eq("id", customerId),
      "تعذر تحديث آخر عرض سعر للعميل"
    );
  }

  async function saveQuotation(record) {
    const { data: userData, error: userError } = await client().auth.getUser();

    if (userError) {
      throw new Error(`تعذر تحديد المستخدم الحالي: ${userError.message}`);
    }

    const payload = {
      quotation_number: record.code.trim(),
      customer_id: record.customerId,
      representative_id: record.representativeId || null,
      quotation_date: record.quotationDate,
      amount: Number(record.amount || 0),
      status: record.status,
      expiry_date: record.expiryDate || null,
      rejection_reason_id:
        record.status === "مرفوض" ? (record.rejectionReasonId || null) : null,
      description: record.description?.trim() || null,
      notes: record.notes?.trim() || null
    };

    let saved;

    if (record.id) {
      saved = await unwrap(
        client()
          .from("quotations")
          .update(payload)
          .eq("id", record.id)
          .select("id")
          .single(),
        "تعذر تعديل عرض السعر"
      );
    } else {
      saved = await unwrap(
        client()
          .from("quotations")
          .insert({
            ...payload,
            created_by: userData.user?.id || null
          })
          .select("id")
          .single(),
        "تعذر إضافة عرض السعر"
      );
    }

    await updateCustomerSnapshot(record);

    await audit(record.id ? "update" : "insert", saved.id, {
      quotation_number: payload.quotation_number,
      customer_id: payload.customer_id,
      representative_id: payload.representative_id,
      quotation_date: payload.quotation_date,
      amount: payload.amount,
      status: payload.status,
      expiry_date: payload.expiry_date,
      rejection_reason_id: payload.rejection_reason_id
    });

    return saved.id;
  }

  async function deleteQuotation(record) {
    await unwrap(
      client()
        .from("quotations")
        .delete()
        .eq("id", record.id),
      "تعذر حذف عرض السعر"
    );

    await recalculateCustomerSnapshot(record.customerId);

    await audit("delete", record.id, {
      quotation_number: record.code,
      customer_id: record.customerId
    });
  }

  async function audit(action, entityId, newData) {
    try {
      const { data } = await client().auth.getUser();

      await client().from("audit_logs").insert({
        user_id: data.user?.id || null,
        action,
        entity_type: "quotations",
        entity_id: String(entityId || ""),
        new_data: newData,
        metadata: {
          source: "kyum-crm-web",
          phase: "10"
        }
      });
    } catch (error) {
      console.warn("Quotation audit log skipped:", error);
    }
  }

  window.QuotationsService = Object.freeze({
    listQuotations,
    findByNumber,
    saveQuotation,
    deleteQuotation
  });
})();