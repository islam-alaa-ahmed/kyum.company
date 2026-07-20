// KYUM Phase 07 — Reference Data Supabase Service
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

  async function unwrap(request, fallbackMessage) {
    const { data, error } = await request;
    if (error) {
      if (error.code === "23505") {
        throw new Error("لا يمكن الحفظ لأن القيمة مسجلة مسبقًا.");
      }
      throw new Error(`${fallbackMessage}: ${error.message}`);
    }
    return data;
  }

  async function listRepresentatives(includeInactive = true) {
    let query = client()
      .from("sales_representatives")
      .select("id, representative_code, full_name, phone, email, is_active, created_at")
      .order("full_name", { ascending: true });

    if (!includeInactive) query = query.eq("is_active", true);
    return unwrap(query, "تعذر تحميل المندوبين");
  }

  async function saveRepresentative(record) {
    requirePermission("representatives", record?.id ? "edit" : "add");
    const payload = {
      representative_code: record.representative_code.trim(),
      full_name: record.full_name.trim(),
      phone: record.phone?.trim() || null,
      email: record.email?.trim() || null,
      is_active: Boolean(record.is_active)
    };

    if (record.id) {
      const rows = await unwrap(
        client().from("sales_representatives").update(payload).eq("id", record.id).select().single(),
        "تعذر تعديل المندوب"
      );
      await audit("update", "sales_representatives", record.id, payload);
      return rows;
    }

    const rows = await unwrap(
      client().from("sales_representatives").insert(payload).select().single(),
      "تعذر إضافة المندوب"
    );
    await audit("insert", "sales_representatives", rows.id, payload);
    return rows;
  }

  async function listReference(table, includeInactive = true) {
    let query = client()
      .from(table)
      .select("id, name, is_active, created_at")
      .order("name", { ascending: true });

    if (!includeInactive) query = query.eq("is_active", true);
    return unwrap(query, "تعذر تحميل البيانات المرجعية");
  }

  async function saveReference(table, record) {
    requirePermission("settings", record?.id ? "edit" : "add");
    const payload = {
      name: record.name.trim(),
      is_active: Boolean(record.is_active)
    };

    if (record.id) {
      const row = await unwrap(
        client().from(table).update(payload).eq("id", record.id).select().single(),
        "تعذر تعديل البيانات المرجعية"
      );
      await audit("update", table, record.id, payload);
      return row;
    }

    const row = await unwrap(
      client().from(table).insert(payload).select().single(),
      "تعذر إضافة البيانات المرجعية"
    );
    await audit("insert", table, row.id, payload);
    return row;
  }

  async function audit(action, entityType, entityId, newData) {
    try {
      await client().from("audit_logs").insert({
        user_id: (await client().auth.getUser()).data.user?.id || null,
        action,
        entity_type: entityType,
        entity_id: String(entityId || ""),
        new_data: newData,
        metadata: { source: "kyum-crm-web", phase: "07" }
      });
    } catch (error) {
      console.warn("Audit log skipped:", error);
    }
  }

  window.ReferenceDataService = Object.freeze({
    listRepresentatives,
    saveRepresentative,
    listInterests: (includeInactive = true) =>
      listReference("interest_categories", includeInactive),
    saveInterest: record => saveReference("interest_categories", record),
    listReasons: (includeInactive = true) =>
      listReference("no_sale_reasons", includeInactive),
    saveReason: record => saveReference("no_sale_reasons", record)
  });
})();