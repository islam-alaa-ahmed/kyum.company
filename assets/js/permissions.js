window.CustomerPermissions = Object.freeze({
  roleLabels: {
    super_admin: "مدير النظام",
    sales_manager: "مدير المبيعات",
    sales_representative: "مندوب مبيعات",
    viewer: "مشاهد"
  },
  can(role, action) {
    const matrix = {
      super_admin: new Set(["view_all","manage_customers","delete_customers","manage_followups","manage_quotations","manage_settings","manage_users"]),
      sales_manager: new Set(["view_all","manage_customers","delete_customers","manage_followups","manage_quotations","manage_settings"]),
      sales_representative: new Set(["manage_customers","manage_followups","manage_quotations"]),
      viewer: new Set()
    };
    return matrix[role]?.has(action) || false;
  },
  apply(profile) {
    const role = profile?.role || "viewer";
    document.body.dataset.userRole = role;
    const settingsNav = document.querySelector('.nav-item[data-view="settings"]');
    if (settingsNav) settingsNav.classList.toggle("hidden", !this.can(role, "manage_settings"));
  }
});
