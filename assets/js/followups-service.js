// KYUM Phase 09 — Follow-ups Supabase Service
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


  const FOLLOWUPS_CACHE_TTL_MS = 10 * 60 * 1000;
  const FOLLOWUPS_CACHE_STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000;
  const FOLLOWUPS_CACHE_SCHEMA_VERSION = 1;
  const followupRefreshes = new Map();

  async function currentFollowupNamespace() {
    const authState = window.CustomerAuth?.getState?.() || {};
    const userId = authState.user?.id || authState.session?.user?.id || authState.profile?.id;
    if (userId) return `user:${userId}`;
    try {
      const result = await client().auth.getSession();
      return `user:${result?.data?.session?.user?.id || "anonymous"}`;
    } catch (_) {
      return "user:anonymous";
    }
  }

  function followupScopeCacheKey(scope) {
    const ids = Array.isArray(scope?.representativeIds)
      ? [...scope.representativeIds].filter(Boolean).sort()
      : [];
    return `followups:${scope?.mode || "none"}:${ids.join(",") || "all"}`;
  }

  function emitFollowupCacheUpdate(data, source, cacheKey) {
    window.dispatchEvent(new CustomEvent("kyum-followup-cache-updated", {
      detail: { data, source, cacheKey, updatedAt: Date.now() }
    }));
  }

  async function persistFollowups(cacheKey, rows, namespace) {
    if (!window.KYUMSmartCache) return null;
    return window.KYUMSmartCache.set(cacheKey, rows, {
      namespace,
      ttlMs: FOLLOWUPS_CACHE_TTL_MS,
      staleMaxMs: FOLLOWUPS_CACHE_STALE_MAX_MS,
      source: "supabase",
      schemaVersion: FOLLOWUPS_CACHE_SCHEMA_VERSION
    });
  }

  async function invalidateFollowupCache() {
    if (!window.KYUMSmartCache) return;
    const namespace = await currentFollowupNamespace();
    await window.KYUMSmartCache.removePrefix("followups:", { namespace });
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

  function scopeStorageKey(profileId) { return `kyum_offline_scope_v1:${profileId}`; }
  function readCachedScope(profileId) {
    try {
      const value = JSON.parse(localStorage.getItem(scopeStorageKey(profileId)) || "null");
      return value?.scope || null;
    } catch (_) { return null; }
  }
  function writeCachedScope(profileId, scope) {
    try { localStorage.setItem(scopeStorageKey(profileId), JSON.stringify({ scope, updatedAt: Date.now() })); } catch (_) {}
    return scope;
  }

  async function resolveRepresentativeScope() {
    const profile = window.CustomerAuth?.getState?.().profile || null;
    if (!profile) return { mode: "none", representativeIds: [] };
    const cachedScope = readCachedScope(profile.id);
    if (navigator.onLine === false && cachedScope) return cachedScope;

    if (["super_admin", "sales_manager", "viewer"].includes(profile.role)) {
      return writeCachedScope(profile.id, { mode: "all", representativeIds: [] });
    }

    if (profile.role !== "sales_representative" || !profile.representative_id) {
      return { mode: "none", representativeIds: [] };
    }

    const ownId = profile.representative_id;
    const { data: accessProfile, error: profileError } = await client()
      .from("user_data_access_profiles")
      .select("access_mode")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (profileError) throw new Error(`تعذر تحميل نطاق البيانات: ${profileError.message}`);

    if ((accessProfile?.access_mode || "own") !== "selected") {
      return writeCachedScope(profile.id, { mode: "selected", representativeIds: [ownId] });
    }

    const { data: allowed, error: allowedError } = await client()
      .from("user_data_access_representatives")
      .select("representative_id")
      .eq("user_id", profile.id);
    if (allowedError) throw new Error(`تعذر تحميل المندوبين المسموحين: ${allowedError.message}`);

    return {
      mode: "selected",
      representativeIds: Array.from(new Set([
        ownId,
        ...(allowed || []).map(row => row.representative_id).filter(Boolean)
      ]))
    };
  }

  async function fetchFollowupsFromNetwork(scope, options = {}) {
    if (scope.mode === "none") return [];

    let request = client()
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
      .order("created_at", { ascending: false });

    if (options.updatedSince) request = request.gte("updated_at", options.updatedSince);
    if (scope.mode === "selected") {
      if (!scope.representativeIds.length) return [];
      request = request.in("representative_id", scope.representativeIds);
    }

    const rows = await unwrap(request, "تعذر تحميل المتابعات");
    return (rows || []).map(normalizeFollowup);
  }

  function sortFollowups(rows) {
    return [...(rows || [])].sort((a, b) => {
      const contactDiff = String(b?.contactDate || "").localeCompare(String(a?.contactDate || ""));
      if (contactDiff) return contactDiff;
      return (Date.parse(b?.createdAt || "") || 0) - (Date.parse(a?.createdAt || "") || 0);
    });
  }

  async function refreshFollowupsInBackground(scope, namespace, cacheKey, previousRows) {
    if (followupRefreshes.has(cacheKey)) return followupRefreshes.get(cacheKey);

    const refresh = (async () => {
      const result = window.KYUMSyncEngine
        ? await window.KYUMSyncEngine.sync({
            entity: "followups",
            namespace,
            scopeKey: cacheKey,
            cachedRows: previousRows,
            fetchFull: () => fetchFollowupsFromNetwork(scope),
            fetchDelta: since => fetchFollowupsFromNetwork(scope, { updatedSince: since }),
            sortRows: sortFollowups
          })
        : { rows: await fetchFollowupsFromNetwork(scope), mode: "full" };
      const rows = result.rows;
      await persistFollowups(cacheKey, rows, namespace);
      const previousHash = window.KYUMSmartCache?.hashValue?.(previousRows);
      const nextHash = window.KYUMSmartCache?.hashValue?.(rows);
      if (previousHash !== nextHash) {
        emitFollowupCacheUpdate(rows, `network-${result.mode}`, cacheKey);
      }
      return rows;
    })();

    followupRefreshes.set(cacheKey, refresh);
    try {
      return await refresh;
    } finally {
      followupRefreshes.delete(cacheKey);
    }
  }

  async function listFollowups(options = {}) {
    const scope = await resolveRepresentativeScope();
    if (scope.mode === "none") return [];

    const namespace = await currentFollowupNamespace();
    const cacheKey = followupScopeCacheKey(scope);
    const force = Boolean(options.force);
    let cached = null;

    if (!force && window.KYUMSmartCache) {
      cached = await window.KYUMSmartCache.get(cacheKey, {
        namespace,
        allowStale: true,
        staleMaxMs: FOLLOWUPS_CACHE_STALE_MAX_MS
      });
    }

    if (cached?.hit && Array.isArray(cached.data)) {
      if (navigator.onLine !== false) {
        refreshFollowupsInBackground(scope, namespace, cacheKey, cached.data).catch(error => {
          console.warn("Follow-up cache background refresh skipped:", error);
        });
      }
      return cached.data;
    }

    try {
      const result = window.KYUMSyncEngine
        ? await window.KYUMSyncEngine.sync({
            entity: "followups",
            namespace,
            scopeKey: cacheKey,
            cachedRows: cached?.data,
            fetchFull: () => fetchFollowupsFromNetwork(scope),
            fetchDelta: since => fetchFollowupsFromNetwork(scope, { updatedSince: since }),
            sortRows: sortFollowups,
            forceFull: true
          })
        : { rows: await fetchFollowupsFromNetwork(scope), mode: "full" };
      const rows = result.rows;
      await persistFollowups(cacheKey, rows, namespace);
      return rows;
    } catch (error) {
      if (cached?.data && Array.isArray(cached.data)) return cached.data;
      throw error;
    }
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

  async function saveFollowupOnline(record) {
    requirePermission("followups", record?.id ? "edit" : "add");
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

    await invalidateFollowupCache();
    return saved.id;
  }

  async function assertFollowupNotConflicted(record, baseUpdatedAt) {
    if (!record?.id || !baseUpdatedAt) return;
    const { data, error } = await client()
      .from("customer_followups")
      .select("id, updated_at")
      .eq("id", record.id)
      .maybeSingle();
    if (error) throw new Error(`تعذر التحقق من تعارض المتابعة: ${error.message}`);
    const serverTime = Date.parse(data?.updated_at || "") || 0;
    const baseTime = Date.parse(baseUpdatedAt || "") || 0;
    if (serverTime && baseTime && serverTime > baseTime + 1000) {
      throw new window.KYUMOfflineQueue.ConflictError("تم تعديل المتابعة على الخادم بعد آخر مزامنة.", {
        entityId: record.id, serverUpdatedAt: data.updated_at, baseUpdatedAt
      });
    }
  }

  async function queueFollowup(record) {
    const action = record?.id ? "update" : "create";
    const dependencies = [];
    if (String(record?.customerId || "").startsWith("local:")) {
      const parent = await window.KYUMOfflineQueue.findCreateOperationByLocalId(record.customerId);
      if (!parent) throw new Error("تعذر ربط المتابعة بالعميل المحلي المعلق.");
      dependencies.push(parent.id);
    }
    const queued = await window.KYUMOfflineQueue.enqueue({
      entity: "followups", action, payload: record, dependsOn: dependencies,
      baseUpdatedAt: record?.updatedAt || record?.updated_at || ""
    });
    return queued.localEntityId;
  }

  async function saveFollowup(record, context = {}) {
    requirePermission("followups", record?.id ? "edit" : "add");
    if (!context.skipOfflineQueue && navigator.onLine === false && window.KYUMOfflineQueue) {
      return queueFollowup(record);
    }
    // Do not auto-queue an online failure after transmission starts; the insert
    // may already be committed and replaying it could create a duplicate.
    return saveFollowupOnline(record);
  }

  async function deleteFollowup(record) {
    requirePermission("followups", "delete");
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
    await invalidateFollowupCache();
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

  window.KYUMSyncEngine?.register?.("followups", () => listFollowups());
  window.KYUMOfflineQueue?.register?.("followups", async (operation, helpers) => {
    const record = { ...operation.payload };
    if (String(record.customerId || "").startsWith("local:")) {
      const resolved = await helpers.resolveServerId(record.customerId, operation.namespace);
      if (!resolved) throw new Error("لم تتم مزامنة العميل المرتبط بالمتابعة بعد.");
      record.customerId = resolved;
    }
    if (operation.action === "update") await assertFollowupNotConflicted(record, operation.baseUpdatedAt);
    const id = await saveFollowupOnline(record);
    return { id };
  });

  window.FollowupsService = Object.freeze({
    listFollowups,
    saveFollowup,
    deleteFollowup,
    invalidateFollowupCache
  });
})();