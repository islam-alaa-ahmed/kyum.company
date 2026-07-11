(function () {
  const client = () => {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  };

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
  }

  async function getCurrentUserPermissions() {
    const role = window.CustomerAuth?.getState?.().profile?.role;
    return role ? getRolePermissions(role) : [];
  }

  window.PermissionsService = Object.freeze({
    listScreens, getRolePermissions, saveRolePermissions, getCurrentUserPermissions
  });
})();