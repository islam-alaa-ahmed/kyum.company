(function () {
  const client = () => {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  };

  async function listUsers() {
    const { data, error } = await client()
      .from("user_profiles")
      .select("id,full_name,email,role,representative_id,is_active,must_change_password,last_login_at,created_at,representative:sales_representatives(id,full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`تعذر تحميل المستخدمين: ${error.message}`);
    return data || [];
  }

  async function createUser(payload) {
    const { data, error } = await client().functions.invoke("manage-user", {
      body: {
        action: "create",
        full_name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        representative_id: payload.representativeId || null,
        is_active: payload.isActive,
        must_change_password: payload.mustChangePassword
      }
    });
    if (error) throw new Error(`تعذر إنشاء المستخدم: ${error.message}`);
    if (!data?.success) throw new Error(data?.error || "تعذر إنشاء المستخدم.");
    return data.user;
  }

  async function updateUser(payload) {
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
    await audit("update", payload.id, payload);
    return data;
  }

  async function resetPassword(userId, password) {
    const { data, error } = await client().functions.invoke("manage-user", {
      body: { action: "reset_password", user_id: userId, password }
    });
    if (error) throw new Error(`تعذر إعادة تعيين كلمة المرور: ${error.message}`);
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
        metadata: { source: "kyum-crm-web", phase: "11" }
      });
    } catch (error) {
      console.warn("User audit skipped:", error);
    }
  }

  window.UsersService = Object.freeze({ listUsers, createUser, updateUser, resetPassword });
})();