// KYUM Phase 09 — Follow-ups Supabase Service
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
      if (error.code === "23503") {
        throw new Error("تعذر الحفظ بسبب ارتباط العميل أو المندوب أو سبب عدم البيع.");
      }
      throw new Error(`${fallbackMessage}: ${error.message}`);
    }
    return data;
  }

  function normalizeFollowup(row) {
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer?.customer_name || "",
      customerPhone: row.customer?.phone || "",
      contactDate: row.contact_date || "",
      method: row.contact_method || "",
      representative: row.representative?.full_name || "",
      representativeId: row.representative_id || row.representative?.id || null,
      result: row.contact_result || "",
      quotationNumber: row.quotation_number || "",
      noSaleReason: row.no_sale_reason?.name || "",
      noSaleReasonId: row.no_sale_reason_id || row.no_sale_reason?.id || null,
      nextFollowupDate: row.next_followup_date || "",
      completed: Boolean(row.is_completed),
      notes: row.notes || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  async function listFollowups() {
    const rows = await unwrap(
      client()
        .from("customer_followups")
        .select(`
          id,
          customer_id,
          contact_date,
          contact_method,
          representative_id,
          contact_result,
          quotation_number,
          no_sale_reason_id,
          next_followup_date,
          is_completed,
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
          no_sale_reason:no_sale_reasons (
            id,
            name
          )
        `)
        .order("contact_date", { ascending: false })
        .order("created_at", { ascending: false }),
      "تعذر تحميل المتابعات"
    );

    return (rows || []).map(normalizeFollowup);
  }

  async function updateCustomerSnapshot(record) {
    const customerPatch = {
      last_contact_date: record.contactDate || null
    };

    if (record.quotationNumber) {
      customerPatch.quotation_number = record.quotationNumber.trim();
    }

    if (record.noSaleReasonId) {
      customerPatch.no_sale_reason_id = record.noSaleReasonId;
    }

    await unwrap(
      client()
        .from("customers")
        .update(customerPatch)
        .eq("id", record.customerId),
      "تم حفظ المتابعة ولكن تعذر تحديث آخر تواصل للعميل"
    );
  }

  async function recalculateLastContact(customerId) {
    const latest = await unwrap(
      client()
        .from("customer_followups")
        .select("contact_date")
        .eq("customer_id", customerId)
        .order("contact_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1),
      "تعذر إعادة احتساب آخر تواصل"
    );

    await unwrap(
      client()
        .from("customers")
        .update({
          last_contact_date: latest?.[0]?.contact_date || null
        })
        .eq("id", customerId),
      "تعذر تحديث آخر تواصل للعميل"
    );
  }

  async function saveFollowup(record) {
    const { data: userData, error: userError } = await client().auth.getUser();
    if (userError) {
      throw new Error(`تعذر تحديد المستخدم الحالي: ${userError.message}`);
    }

    const payload = {
      customer_id: record.customerId,
      contact_date: record.contactDate,
      contact_method: record.method,
      representative_id: record.representativeId || null,
      contact_result: record.result,
      quotation_number: record.quotationNumber?.trim() || null,
      no_sale_reason_id: record.noSaleReasonId || null,
      next_followup_date: record.nextFollowupDate || null,
      is_completed: Boolean(record.completed),
      notes: record.notes?.trim() || null
    };

    let saved;
    if (record.id) {
      saved = await unwrap(
        client()
          .from("customer_followups")
          .update(payload)
          .eq("id", record.id)
          .select("id")
          .single(),
        "تعذر تعديل المتابعة"
      );
    } else {
      saved = await unwrap(
        client()
          .from("customer_followups")
          .insert({
            ...payload,
            created_by: userData.user?.id || null
          })
          .select("id")
          .single(),
        "تعذر إضافة المتابعة"
      );
    }

    await updateCustomerSnapshot(record);
    await audit(record.id ? "update" : "insert", saved.id, {
      customer_id: record.customerId,
      contact_date: record.contactDate,
      contact_method: record.method,
      contact_result: record.result,
      next_followup_date: record.nextFollowupDate || null,
      is_completed: Boolean(record.completed)
    });

    return saved.id;
  }

  async function deleteFollowup(record) {
    await unwrap(
      client()
        .from("customer_followups")
        .delete()
        .eq("id", record.id),
      "تعذر حذف المتابعة"
    );

    await recalculateLastContact(record.customerId);
    await audit("delete", record.id, {
      customer_id: record.customerId,
      contact_date: record.contactDate
    });
  }

  async function audit(action, entityId, newData) {
    try {
      const { data } = await client().auth.getUser();
      await client().from("audit_logs").insert({
        user_id: data.user?.id || null,
        action,
        entity_type: "customer_followups",
        entity_id: String(entityId || ""),
        new_data: newData,
        metadata: {
          source: "kyum-crm-web",
          phase: "09"
        }
      });
    } catch (error) {
      console.warn("Follow-up audit log skipped:", error);
    }
  }

  window.FollowupsService = Object.freeze({
    listFollowups,
    saveFollowup,
    deleteFollowup
  });
})();