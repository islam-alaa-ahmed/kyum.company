// KYUM Phase 08 — Customers Supabase Service
(function () {
  function client() {
    if (!window.customerSupabase) {
      throw new Error("اتصال Supabase غير جاهز.");
    }
    return window.customerSupabase;
  }

  function normalizeCustomer(row) {
    const interestLinks = Array.isArray(row.customer_interests)
      ? row.customer_interests
      : [];

    return {
      id: row.id,
      customerNumber: row.customer_number || "",
      name: row.customer_name || "",
      type: row.customer_type || "",
      phone: row.phone || "",
      city: row.city || "",
      interests: interestLinks
        .map(link => link.interest?.name)
        .filter(Boolean),
      interestIds: interestLinks
        .map(link => link.interest_category_id || link.interest?.id)
        .filter(Boolean),
      representative: row.representative?.full_name || "",
      representativeId: row.representative_id || row.representative?.id || null,
      contactDate: row.last_contact_date || "",
      quotationNumber: row.quotation_number || "",
      noSaleReason: row.no_sale_reason?.name || "",
      noSaleReasonId: row.no_sale_reason_id || row.no_sale_reason?.id || null,
      notes: row.notes || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  async function unwrap(request, fallbackMessage) {
    const { data, error } = await request;
    if (error) {
      if (error.code === "23505") {
        throw new Error("رقم الجوال مسجل بالفعل لعميل آخر.");
      }
      if (error.code === "23503") {
        throw new Error("تعذر الحفظ بسبب ارتباط مرجعي غير صالح.");
      }
      throw new Error(`${fallbackMessage}: ${error.message}`);
    }
    return data;
  }

  async function listCustomers() {
    const data = await unwrap(
      client()
        .from("customers")
        .select(`
          id,
          customer_number,
          customer_name,
          customer_type,
          phone,
          city,
          representative_id,
          last_contact_date,
          quotation_number,
          no_sale_reason_id,
          notes,
          created_at,
          updated_at,
          representative:sales_representatives (
            id,
            representative_code,
            full_name
          ),
          no_sale_reason:no_sale_reasons (
            id,
            name
          ),
          customer_interests (
            interest_category_id,
            interest:interest_categories (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false }),
      "تعذر تحميل العملاء"
    );

    return (data || []).map(normalizeCustomer);
  }

  async function findByPhone(normalizedPhone, excludeId = null) {
    let query = client()
      .from("customers")
      .select("id, customer_name, phone")
      .eq("normalized_phone", normalizedPhone)
      .limit(1);

    if (excludeId) query = query.neq("id", excludeId);

    const rows = await unwrap(query, "تعذر التحقق من رقم الجوال");
    return rows?.[0] || null;
  }

  async function replaceInterests(customerId, interestIds) {
    await unwrap(
      client()
        .from("customer_interests")
        .delete()
        .eq("customer_id", customerId),
      "تعذر تحديث مجالات الاهتمام"
    );

    if (!interestIds.length) return;

    const rows = interestIds.map(interestId => ({
      customer_id: customerId,
      interest_category_id: interestId
    }));

    await unwrap(
      client().from("customer_interests").insert(rows),
      "تعذر حفظ مجالات الاهتمام"
    );
  }

  async function saveCustomer(record) {
    const { data: userData, error: userError } = await client().auth.getUser();
    if (userError) throw new Error(`تعذر تحديد المستخدم الحالي: ${userError.message}`);

    const payload = {
      customer_name: record.name.trim(),
      customer_type: record.type,
      phone: record.phone,
      city: record.city?.trim() || null,
      representative_id: record.representativeId || null,
      last_contact_date: record.contactDate || null,
      quotation_number: record.quotationNumber?.trim() || null,
      no_sale_reason_id: record.noSaleReasonId || null,
      notes: record.notes?.trim() || null
    };

    let saved;
    if (record.id) {
      saved = await unwrap(
        client()
          .from("customers")
          .update(payload)
          .eq("id", record.id)
          .select("id")
          .single(),
        "تعذر تعديل العميل"
      );
    } else {
      saved = await unwrap(
        client()
          .from("customers")
          .insert({
            ...payload,
            created_by: userData.user?.id || null
          })
          .select("id")
          .single(),
        "تعذر إضافة العميل"
      );
    }

    try {
      await replaceInterests(saved.id, record.interestIds);
    } catch (error) {
      if (!record.id) {
        await client().from("customers").delete().eq("id", saved.id);
      }
      throw error;
    }

    await audit(record.id ? "update" : "insert", saved.id, {
      customer_name: payload.customer_name,
      phone: payload.phone,
      customer_type: payload.customer_type,
      representative_id: payload.representative_id,
      interest_ids: record.interestIds
    });

    return saved.id;
  }

  async function deleteCustomer(customerId, customerName) {
    await unwrap(
      client().from("customers").delete().eq("id", customerId),
      "تعذر حذف العميل"
    );

    await audit("delete", customerId, {
      customer_name: customerName
    });
  }

  async function audit(action, entityId, newData) {
    try {
      const { data } = await client().auth.getUser();
      await client().from("audit_logs").insert({
        user_id: data.user?.id || null,
        action,
        entity_type: "customers",
        entity_id: String(entityId || ""),
        new_data: newData,
        metadata: {
          source: "kyum-crm-web",
          phase: "08"
        }
      });
    } catch (error) {
      console.warn("Customer audit log skipped:", error);
    }
  }

  window.CustomersService = Object.freeze({
    listCustomers,
    findByPhone,
    saveCustomer,
    deleteCustomer
  });
})();