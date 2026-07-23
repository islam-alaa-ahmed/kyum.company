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
  permissionsLoaded: false,

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


  actionLabels: Object.freeze({
    view: "عرض",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    export: "تصدير"
  }),

  canAction(screenKey, action = "view") {
    return this.canScreen(screenKey, action);
  },

  requireAction(screenKey, action = "view", options = {}) {
    const allowed = this.canScreen(screenKey, action);
    if (allowed) return true;

    const label = options.label || this.actionLabels[action] || action;
    const message = options.message || `لا توجد صلاحية ${label} لهذه الشاشة.`;
    window.dispatchEvent(new CustomEvent("kyum-permission-denied", {
      detail: Object.freeze({ screenKey, action, message })
    }));
    if (!options.silent) alert(message);
    return false;
  },

  applyActionVisibility(root = document) {
    root.querySelectorAll("[data-permission-screen][data-permission-action]").forEach(element => {
      const allowed = this.canScreen(
        element.dataset.permissionScreen,
        element.dataset.permissionAction
      );
      element.classList.toggle("hidden", !allowed);
      element.setAttribute("aria-hidden", String(!allowed));
      if ("disabled" in element) element.disabled = !allowed;
      element.setAttribute("tabindex", allowed ? "0" : "-1");
    });
  },

  currentRole() {
    return window.CustomerAuth?.getState?.().profile?.role || "viewer";
  },

  normalizeScreenKey(screenKey) {
    return String(screenKey || "").trim();
  },

  canScreen(screenKey, action = "view") {
    screenKey = this.normalizeScreenKey(screenKey);
    if (!screenKey) return false;
    if (screenKey === "aboutApp" && action === "view") return true;
    const role = this.currentRole();
    if (role === "super_admin") return true;
    if (!this.permissionsLoaded) return false;
    const row = this.screenPermissions.get(screenKey);
    const field = { view:"can_view", add:"can_add", edit:"can_edit", delete:"can_delete", export:"can_export" }[action] || "can_view";
    return Boolean(row?.[field]);
  },

  async loadCurrentPermissions() {
    this.permissionsLoaded = false;
    this.screenPermissions = new Map();
    if (!window.PermissionsService) return;
    try {
      const rows = await window.PermissionsService.getCurrentUserPermissions();
      this.screenPermissions = new Map(rows.map(row => [row.screen_key, Object.freeze({ ...row })]));
      this.permissionsLoaded = true;
    } catch (error) {
      console.error("Permission load failed:", error);
      this.screenPermissions = new Map();
      this.permissionsLoaded = false;
      throw error;
    }
  },

  allowedScreenKeys() {
    if (this.currentRole() === "super_admin") {
      return [...document.querySelectorAll(".nav-item[data-view]")]
        .map(item => item.dataset.view)
        .filter(Boolean);
    }
    if (!this.permissionsLoaded) return [];
    return [...this.screenPermissions.values()]
      .filter(row => row.can_view)
      .map(row => row.screen_key);
  },

  authorizeView(screenKey, preferred = "dashboard") {
    const requested = this.normalizeScreenKey(screenKey);
    if (requested && this.canScreen(requested, "view")) {
      return Object.freeze({ allowed: true, requested, target: requested, reason: "allowed" });
    }

    const fallback = this.firstAllowedScreen(preferred);
    return Object.freeze({
      allowed: false,
      requested,
      target: fallback,
      reason: requested ? "permission_denied" : "invalid_view"
    });
  },

  firstAllowedScreen(preferred = "dashboard") {
    if (this.canScreen(preferred, "view")) return preferred;
    const navOrder = [...document.querySelectorAll(".nav-item[data-view]")]
      .map(item => item.dataset.view)
      .filter(Boolean);
    return navOrder.find(key => this.canScreen(key, "view")) || null;
  },

  applyScreenVisibility() {
    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
      const allowed = this.canScreen(button.dataset.view, "view");
      button.classList.toggle("hidden", !allowed);
      button.setAttribute("aria-hidden", String(!allowed));
      button.setAttribute("tabindex", allowed ? "0" : "-1");
      button.disabled = !allowed;
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
    document.querySelectorAll(".users-manage-action,.permissions-manage-action,.backup-manage-action,.system-settings-manage-action").forEach(b => b.classList.toggle("hidden", role !== "super_admin"));
    this.applyActionVisibility();
  },

  reset() {
    this.screenPermissions = new Map();
    this.permissionsLoaded = false;
  }
};
