window.CustomerPermissions = {
  roleLabels: {
    super_admin: "مدير النظام",
    sales_manager: "مدير المبيعات",
    sales_supervisor: "مشرف المبيعات",
    sales_representative: "مندوب مبيعات",
    customer_service: "خدمة العملاء",
    viewer: "مشاهد"
  },
  roleOptions: ["super_admin","sales_manager","sales_supervisor","sales_representative","customer_service","viewer"],
  screenPermissions: new Map(),

  can(role, action) {
    const matrix = {
      super_admin: new Set(["view_all","manage_customers","delete_customers","manage_followups","manage_quotations","manage_settings","manage_users"]),
      sales_manager: new Set(["view_all","manage_customers","delete_customers","manage_followups","manage_quotations","manage_settings"]),
      sales_supervisor: new Set(["view_all","manage_customers","manage_followups","manage_quotations"]),
      sales_representative: new Set(["manage_customers","manage_followups","manage_quotations"]),
      customer_service: new Set(["manage_customers","manage_followups"]),
      viewer: new Set()
    };
    return matrix[role]?.has(action) || false;
  },

  canScreen(screenKey, action = "view") {
    const role = window.CustomerAuth?.getState?.().profile?.role;
    if (role === "super_admin") return true;
    const row = this.screenPermissions.get(screenKey);
    const field = { view:"can_view", add:"can_add", edit:"can_edit", delete:"can_delete", export:"can_export" }[action] || "can_view";
    return Boolean(row?.[field]);
  },

  async loadCurrentPermissions() {
    if (!window.PermissionsService) return;
    try {
      const rows = await window.PermissionsService.getCurrentUserPermissions();
      this.screenPermissions = new Map(rows.map(row => [row.screen_key, row]));
    } catch (error) {
      console.error("Permission load failed:", error);
      this.screenPermissions = new Map();
    }
  },

  applyScreenVisibility() {
    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
      button.classList.toggle("hidden", !this.canScreen(button.dataset.view, "view"));
    });
    document.querySelectorAll(".nav-group").forEach(group => {
      const visible = [...group.querySelectorAll(".nav-item[data-view]")].some(item => !item.classList.contains("hidden"));
      group.classList.toggle("hidden", !visible);
    });
  },

  apply(profile) {
    const role = profile?.role || "viewer";
    document.body.dataset.userRole = role;
    document.querySelectorAll(".reference-manage-action").forEach(b => b.classList.toggle("hidden", !this.can(role,"manage_settings")));
    document.querySelectorAll(".customer-manage-action").forEach(b => b.classList.toggle("hidden", !this.can(role,"manage_customers")));
    document.querySelectorAll(".followup-manage-action").forEach(b => b.classList.toggle("hidden", !this.can(role,"manage_followups")));
    document.querySelectorAll(".quotation-manage-action").forEach(b => b.classList.toggle("hidden", !this.can(role,"manage_quotations")));
    document.querySelectorAll(".users-manage-action,.permissions-manage-action").forEach(b => b.classList.toggle("hidden", role !== "super_admin"));
  }
};