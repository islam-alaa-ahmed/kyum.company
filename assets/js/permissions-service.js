(function () {
  const client = () => {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  };

  const PERMISSIONS_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  function permissionsNamespace(profile) {
    return `auth:${String(profile?.id || "anonymous")}`;
  }

  function isNetworkFailure(error) {
    const text = String(error?.message || error || "").toLowerCase();
    return !navigator.onLine || text.includes("failed to fetch") || text.includes("network") || text.includes("load failed");
  }

  async function readCachedPermissions(profile) {
    if (!window.KYUMSmartCache || !profile?.id) return null;
    const cached = await window.KYUMSmartCache.get(`permissions:${profile.role}`, {
      namespace: permissionsNamespace(profile),
      allowStale: true,
      staleMaxMs: PERMISSIONS_CACHE_MAX_AGE_MS
    });
    return cached.hit && Array.isArray(cached.data) ? cached.data : null;
  }

  async function cachePermissions(profile, rows) {
    if (!window.KYUMSmartCache || !profile?.id) return;
    await window.KYUMSmartCache.set(`permissions:${profile.role}`, rows, {
      namespace: permissionsNamespace(profile),
      ttlMs: 24 * 60 * 60 * 1000,
      staleMaxMs: PERMISSIONS_CACHE_MAX_AGE_MS,
      source: "supabase-role-permissions",
      schemaVersion: 1
    });
  }

  async function listScreens() {
    const { data, error } = await client().from("app_screens")
      .select("screen_key,screen_name,group_name,display_order,is_active")
      .eq("is_active", true).order("display_order");
    if (error) throw new Error(`تعذر تحميل الشاشات: ${error.message}`);
    return data || [];
  }

  async function getRolePermissions(role) {
    const { data, error } = await client().from("role_screen_permissions")
      .select("screen_key,can_view,can_add,can_edit,can_delete,can_export")
      .eq("role", role);
    if (error) throw new Error(`تعذر تحميل الصلاحيات: ${error.message}`);
    return data || [];
  }

  function canonicalize(rows) {
    return rows.map(row => ({
      screen_key: row.screen_key || row.screenKey,
      can_view: Boolean(row.can_view ?? row.canView),
      can_add: Boolean(row.can_add ?? row.canAdd),
      can_edit: Boolean(row.can_edit ?? row.canEdit),
      can_delete: Boolean(row.can_delete ?? row.canDelete),
      can_export: Boolean(row.can_export ?? row.canExport)
    })).sort((a, b) => a.screen_key.localeCompare(b.screen_key));
  }

  async function saveRolePermissions(role, permissions) {
    const rows = permissions.map(item => ({
      role,
      screen_key: item.screenKey,
      can_view: item.canView,
      can_add: item.canAdd,
      can_edit: item.canEdit,
      can_delete: item.canDelete,
      can_export: item.canExport,
      updated_at: new Date().toISOString()
    }));
    const { error } = await client().from("role_screen_permissions")
      .upsert(rows, { onConflict: "role,screen_key" });
    if (error) throw new Error(`تعذر حفظ الصلاحيات: ${error.message}`);

    const saved = await getRolePermissions(role);
    const expectedCanonical = canonicalize(rows);
    const savedCanonical = canonicalize(saved).filter(row => expectedCanonical.some(expected => expected.screen_key === row.screen_key));
    if (JSON.stringify(savedCanonical) !== JSON.stringify(expectedCanonical)) {
      throw new Error("تم إرسال الصلاحيات لكن تعذر التحقق من حفظ جميع التعديلات.");
    }
    return saved;
  }

  async function getCurrentUserPermissions() {
    const profile = window.CustomerAuth?.getState?.().profile;
    const role = profile?.role;
    if (!profile?.id || !role) throw new Error("ملف المستخدم أو الدور غير متاح.");
    if (role === "super_admin") return [];

    const cachedRows = await readCachedPermissions(profile);
    if (!navigator.onLine) {
      if (!cachedRows) throw new Error("لا توجد صلاحيات محفوظة لهذا المستخدم. يلزم فتح البرنامج مرة واحدة مع الإنترنت.");
      return cachedRows.map(row => Object.freeze({ ...row }));
    }

    try {
      const rows = await getRolePermissions(role);
      await cachePermissions(profile, rows);
      return rows.map(row => Object.freeze({ ...row }));
    } catch (error) {
      if (cachedRows && isNetworkFailure(error)) return cachedRows.map(row => Object.freeze({ ...row }));
      throw error;
    }
  }

  window.PermissionsService = Object.freeze({
    listScreens,
    getRolePermissions,
    saveRolePermissions,
    getCurrentUserPermissions
  });
})();
