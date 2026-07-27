// KYUM Phase 08 — Customers Supabase Service
(function () {

  function requirePermission(screenKey, action) {
    if (!window.CustomerPermissions?.requireAction?.(screenKey, action, { silent: true })) {
      throw new Error(`Permission denied: ${screenKey}.${action}`);
    }
  }
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
      contactPersonName: row.contact_person_name || "",
      phone: row.phone || "",
      region: row.region || "",
      city: row.city || "",
      district: row.district || "",
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
          contact_person_name,
          phone,
          region,
          city,
          district,
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
    const rows = await unwrap(
      client().rpc("check_customer_phone_ownership", {
        p_normalized_phone: normalizedPhone,
        p_exclude_customer_id: excludeId || null
      }),
      "تعذر التحقق من رقم الجوال"
    );

    const row = rows?.[0];
    if (!row?.phone_exists) return null;

    return {
      id: row.can_access ? row.customer_id : null,
      customer_name: row.customer_name || "",
      customer_type: row.can_access ? (row.customer_type || "") : "",
      contact_person_name: row.can_access ? (row.contact_person_name || "") : "",
      phone: normalizedPhone,
      representative_id: row.can_access ? (row.representative_id || null) : null,
      representative: row.representative_name
        ? { full_name: row.representative_name }
        : null,
      can_access: Boolean(row.can_access),
      outside_scope: !row.can_access
    };
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
    requirePermission("customers", record?.id ? "edit" : "add");
    const { data: userData, error: userError } = await client().auth.getUser();
    if (userError) throw new Error(`تعذر تحديد المستخدم الحالي: ${userError.message}`);

    const payload = {
      customer_name: record.name.trim(),
      customer_type: record.type,
      contact_person_name: record.type === "شركة"
        ? (record.contactPersonName?.trim() || null)
        : null,
      phone: record.phone,
      region: record.region?.trim() || null,
      city: record.city?.trim() || null,
      district: record.district?.trim() || null,
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
      contact_person_name: payload.contact_person_name,
      representative_id: payload.representative_id,
      interest_ids: record.interestIds
    });

    return saved.id;
  }

  async function deleteCustomer(customerId, customerName) {
    requirePermission("customers", "delete");
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


  async function saveImportedRequest(customerId, row) {
    if (!row.requestNumber) return { inserted: false, skipped: true };

    const { data: userData, error: userError } = await client().auth.getUser();
    if (userError) throw new Error(`تعذر تحديد المستخدم الحالي: ${userError.message}`);

    const payload = {
      customer_id: customerId,
      request_number: row.requestNumber.trim(),
      representative_id: row.representativeId || null,
      request_date: row.contactDate || new Date().toISOString().slice(0, 10),
      quotation_number: row.quotationNumber?.trim() || null,
      notes: row.notes?.trim() || null,
      source_row: row.sourceRow || null,
      created_by: userData.user?.id || null
    };

    const { error } = await client()
      .from("customer_requests")
      .insert(payload);

    if (error?.code === "23505") {
      return { inserted: false, skipped: true };
    }
    if (error) throw new Error(`تعذر حفظ طلب العميل: ${error.message}`);

    return { inserted: true, skipped: false };
  }

  async function importCustomers(rows, mode = "new_only", onProgress = null, options = {}) {
    requirePermission("customers", "add");
    if (mode === "upsert") requirePermission("customers", "edit");

    const chunkSize = Math.max(25, Math.min(Number(options.chunkSize) || 200, 500));
    const yieldDelay = Math.max(0, Number(options.yieldDelay) || 0);
    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      requestsInserted: 0,
      requestsSkipped: 0,
      failed: 0,
      errors: []
    };
    const customerIdByPhone = new Map();
    let processed = 0;

    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize);
      for (const row of chunk) {
        try {
          let customerId = customerIdByPhone.get(row.phone)
            || row.existingCustomer?.id
            || null;

          if (!customerId) {
            customerId = await saveCustomer({
              id: null,
              name: row.name,
              type: row.type,
              contactPersonName: row.contactPersonName,
              phone: row.phone,
              region: row.region,
              city: row.city,
              district: row.district,
              representativeId: row.representativeId,
              contactDate: row.contactDate,
              quotationNumber: row.quotationNumber,
              noSaleReasonId: row.noSaleReasonId,
              notes: row.notes,
              interestIds: row.interestIds
            });
            customerIdByPhone.set(row.phone, customerId);
            results.inserted += 1;
          } else if (row.existingCustomer && mode === "upsert" && !customerIdByPhone.has(row.phone)) {
            await saveCustomer({
              id: customerId,
              name: row.name,
              type: row.type,
              contactPersonName: row.contactPersonName,
              phone: row.phone,
              region: row.region,
              city: row.city,
              district: row.district,
              representativeId: row.representativeId,
              contactDate: row.contactDate,
              quotationNumber: row.quotationNumber,
              noSaleReasonId: row.noSaleReasonId,
              notes: row.notes,
              interestIds: row.interestIds
            });
            customerIdByPhone.set(row.phone, customerId);
            results.updated += 1;
          } else if (!row.requestNumber) {
            results.skipped += 1;
          } else {
            customerIdByPhone.set(row.phone, customerId);
          }

          if (row.requestNumber) {
            const requestResult = await saveImportedRequest(customerId, row);
            if (requestResult.inserted) results.requestsInserted += 1;
            else results.requestsSkipped += 1;
          }
        } catch (error) {
          results.failed += 1;
          results.errors.push({
            sourceRow: row.sourceRow,
            name: row.name,
            phone: row.phone,
            requestNumber: row.requestNumber || "",
            message: error instanceof Error ? error.message : String(error)
          });
        }
        processed += 1;
        onProgress?.(processed, rows.length, row, results);
      }
      if (offset + chunkSize < rows.length) {
        await new Promise(resolve => setTimeout(resolve, yieldDelay));
      }
    }
    return results;
  }


  window.CustomersService = Object.freeze({
    listCustomers,
    findByPhone,
    saveCustomer,
    deleteCustomer,
    importCustomers
  });
})();