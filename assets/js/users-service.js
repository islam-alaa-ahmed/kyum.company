(function () {

  function requirePermission(screenKey, action) {
    if (!window.CustomerPermissions?.requireAction?.(screenKey, action, { silent: true })) {
      throw new Error(`Permission denied: ${screenKey}.${action}`);
    }
  }

  const client = () => {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  };

  async function listUsers() {
    const { data, error } = await client()
      .from("user_profiles")
      .select("id,full_name,email,role,representative_id,is_active,must_change_password,last_login_at,created_at,representative:sales_representatives!user_profiles_representative_id_fkey(id,full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`تعذر تحميل المستخدمين: ${error.message}`);

    const users = data || [];
    if (!users.length) return users;

    const userIds = users.map(user => user.id);
    const [profilesResult, representativesResult] = await Promise.all([
      client().from("user_data_access_profiles")
        .select("user_id,access_mode")
        .in("user_id", userIds),
      client().from("user_data_access_representatives")
        .select("user_id,representative_id,representative:sales_representatives(id,full_name)")
        .in("user_id", userIds)
    ]);

    if (profilesResult.error) throw new Error(`تعذر تحميل نطاقات البيانات: ${profilesResult.error.message}`);
    if (representativesResult.error) throw new Error(`تعذر تحميل المندوبين المسموحين: ${representativesResult.error.message}`);

    const modeByUser = new Map((profilesResult.data || []).map(row => [row.user_id, row.access_mode]));
    const repsByUser = new Map();
    (representativesResult.data || []).forEach(row => {
      if (!repsByUser.has(row.user_id)) repsByUser.set(row.user_id, []);
      repsByUser.get(row.user_id).push({
        id: row.representative_id,
        full_name: row.representative?.full_name || ""
      });
    });

    return users.map(user => ({
      ...user,
      data_access_mode: modeByUser.get(user.id) || defaultAccessMode(user),
      data_access_representatives: repsByUser.get(user.id) || []
    }));
  }

  function defaultAccessMode(user) {
    if (["super_admin", "sales_manager", "viewer"].includes(user?.role)) return "all";
    return user?.representative_id ? "own" : "selected";
  }


  async function invokeManageUser(body) {
    const { data, error } = await client().functions.invoke("manage-user", { body });
    if (!error) return data;

    let details = null;
    try {
      if (error.context && typeof error.context.clone === "function") {
        details = await error.context.clone().json();
      } else if (error.context && typeof error.context.json === "function") {
        details = await error.context.json();
      }
    } catch (_) {
      // Keep the original Functions error when the response body is unavailable.
    }

    const message = details?.error || details?.message || error.message || "تعذر تنفيذ عملية المستخدم.";
    const code = details?.code ? ` (${details.code})` : "";
    throw new Error(`${message}${code}`);
  }

  async function createUser(payload) {
    requirePermission("users", "add");
    const data = await invokeManageUser({
      action: "create",
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      representative_id: payload.representativeId || null,
      is_active: payload.isActive,
      must_change_password: payload.mustChangePassword,
      access_mode: payload.accessMode,
      allowed_representative_ids: payload.allowedRepresentativeIds || []
    });
    if (!data?.success) throw new Error(data?.error || "تعذر إنشاء المستخدم.");
    const user = data.user;
    if (!user?.id) throw new Error("تم إنشاء الحساب بدون معرف مستخدم صالح.");
    return user;
  }

  async function updateUser(payload) {
    requirePermission("users", "edit");
    const { data, error } = await client()
      .from("user_profiles")
      .update({
        full_name: payload.fullName.trim(),
        role: payload.role,
        representative_id: payload.representativeId || null,
        is_active: payload.isActive,
        must_change_password: payload.mustChangePassword
      })
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw new Error(`تعذر تعديل المستخدم: ${error.message}`);
    await saveUserDataAccess(payload.id, payload.accessMode, payload.allowedRepresentativeIds);
    await audit("update", payload.id, payload);
    return data;
  }

  async function saveUserDataAccess(userId, accessMode = "own", allowedRepresentativeIds = []) {
    const normalizedMode = ["own", "selected", "all"].includes(accessMode) ? accessMode : "own";
    const uniqueIds = [...new Set((allowedRepresentativeIds || []).filter(Boolean))];
    const { data: authData } = await client().auth.getUser();

    const { error: profileError } = await client()
      .from("user_data_access_profiles")
      .upsert({
        user_id: userId,
        access_mode: normalizedMode,
        updated_by: authData.user?.id || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    if (profileError) throw new Error(`تعذر حفظ نطاق البيانات: ${profileError.message}`);

    const { error: deleteError } = await client()
      .from("user_data_access_representatives")
      .delete()
      .eq("user_id", userId);
    if (deleteError) throw new Error(`تعذر تحديث قائمة المندوبين المسموحين: ${deleteError.message}`);

    if (normalizedMode === "selected" && uniqueIds.length) {
      const { error: insertError } = await client()
        .from("user_data_access_representatives")
        .insert(uniqueIds.map(representativeId => ({ user_id: userId, representative_id: representativeId })));
      if (insertError) throw new Error(`تعذر حفظ المندوبين المسموحين: ${insertError.message}`);
    }

    const [{ data: savedProfile, error: verifyProfileError }, { data: savedRepresentatives, error: verifyRepsError }] = await Promise.all([
      client().from("user_data_access_profiles").select("access_mode").eq("user_id", userId).single(),
      client().from("user_data_access_representatives").select("representative_id").eq("user_id", userId)
    ]);
    if (verifyProfileError || savedProfile?.access_mode !== normalizedMode) {
      throw new Error("تم إرسال نطاق البيانات لكن تعذر التحقق من حفظه.");
    }
    if (verifyRepsError) throw new Error(`تعذر التحقق من المندوبين المسموحين: ${verifyRepsError.message}`);
    const savedIds = (savedRepresentatives || []).map(row => row.representative_id).sort();
    const expectedIds = normalizedMode === "selected" ? [...uniqueIds].sort() : [];
    if (JSON.stringify(savedIds) !== JSON.stringify(expectedIds)) {
      throw new Error("لم تُحفظ قائمة المندوبين المسموحين بالكامل.");
    }
  }

  async function resetPassword(userId, password) {
    requirePermission("users", "edit");
    const data = await invokeManageUser({ action: "reset_password", user_id: userId, password });
    if (!data?.success) throw new Error(data?.error || "تعذر إعادة التعيين.");
  }

  async function audit(action, entityId, newData) {
    try {
      const { data } = await client().auth.getUser();
      await client().from("audit_logs").insert({
        user_id: data.user?.id || null,
        action,
        entity_type: "user_profiles",
        entity_id: String(entityId),
        new_data: newData,
        metadata: { source: "kyum-crm-web", phase: "M10" }
      });
    } catch (error) {
      console.warn("User audit skipped:", error);
    }
  }

  window.UsersService = Object.freeze({
    listUsers,
    createUser,
    updateUser,
    saveUserDataAccess,
    resetPassword
  });
})();
