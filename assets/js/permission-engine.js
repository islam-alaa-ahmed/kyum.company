(() => {
  "use strict";

  const ACTION_FIELD_MAP = Object.freeze({
    view: "can_view",
    add: "can_add",
    edit: "can_edit",
    delete: "can_delete",
    export: "can_export",
    import: "can_import"
  });

  const DEFAULT_NAVIGATION_GROUPS = Object.freeze({
    "main-navigation": Object.freeze(["dashboard", "dailyOperations"]),
    "customer-management": Object.freeze(["customers", "followups", "quotations", "representatives", "settings"]),
    "reports-analytics": Object.freeze(["reportsOverview", "dailyPerformanceReport"]),
    "settings-privacy": Object.freeze(["users", "permissions", "activityLog", "backups", "systemHealth", "systemSettings", "aboutApp"])
  });

  function legacyPermissions() {
    return window.CustomerPermissions || null;
  }

  function normalizeKey(value) {
    return String(value || "").trim();
  }

  function normalizeAction(value) {
    const action = String(value || "view").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(ACTION_FIELD_MAP, action) ? action : "view";
  }

  function frozenResult(payload) {
    return Object.freeze({ ...payload });
  }

  function setNavigationElementVisibility(element, visible) {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
    element.hidden = !visible;
    element.setAttribute("aria-hidden", String(!visible));
    if ("disabled" in element) element.disabled = !visible;
    element.setAttribute("tabindex", visible ? "0" : "-1");
  }

  const engine = {
    version: "1.1.0-navigation-integration",
    debugEnabled: false,
    navigationGroups: DEFAULT_NAVIGATION_GROUPS,

    initialize() {
      const source = legacyPermissions();
      const ready = Boolean(source?.permissionsLoaded || source?.currentRole?.() === "super_admin");
      this.applyNavigationVisibility();
      window.dispatchEvent(new CustomEvent("kyum-permission-engine-ready", {
        detail: frozenResult({ ready, role: this.currentRole(), version: this.version })
      }));
      return ready;
    },

    currentRole() {
      return legacyPermissions()?.currentRole?.() || "viewer";
    },

    isLoaded() {
      const source = legacyPermissions();
      return Boolean(source?.permissionsLoaded || this.currentRole() === "super_admin");
    },

    can(screenKey, action = "view") {
      const key = normalizeKey(screenKey);
      const normalizedAction = normalizeAction(action);
      if (!key) return false;
      const source = legacyPermissions();
      if (!source) return false;
      return source.canScreen?.(key, normalizedAction) === true;
    },

    canView(screenKey) { return this.can(screenKey, "view"); },
    canAdd(screenKey) { return this.can(screenKey, "add"); },
    canEdit(screenKey) { return this.can(screenKey, "edit"); },
    canDelete(screenKey) { return this.can(screenKey, "delete"); },
    canExport(screenKey) { return this.can(screenKey, "export"); },
    canImport(screenKey) { return this.can(screenKey, "import"); },

    allowedScreens() {
      return Object.freeze([...(legacyPermissions()?.allowedScreenKeys?.() || [])]);
    },

    authorize(screenKey, preferred = "dashboard") {
      const key = normalizeKey(screenKey);
      const result = legacyPermissions()?.authorizeView?.(key, preferred);
      if (result) return result;
      return frozenResult({
        allowed: false,
        requested: key,
        target: null,
        reason: key ? "permission_engine_unavailable" : "invalid_view"
      });
    },

    firstAllowedScreen(preferred = "dashboard") {
      return legacyPermissions()?.firstAllowedScreen?.(preferred) || null;
    },

    groupScreens(groupKey, root = document) {
      const key = normalizeKey(groupKey);
      const declared = this.navigationGroups[key];
      if (declared) return [...declared];
      const group = root.querySelector?.(`[data-nav-group="${CSS.escape(key)}"]`);
      if (!group) return [];
      return [...group.querySelectorAll(".nav-item[data-view]")]
        .map(item => normalizeKey(item.dataset.view))
        .filter(Boolean);
    },

    canShowGroup(groupKey, root = document) {
      return this.groupScreens(groupKey, root).some(screenKey => this.canView(screenKey));
    },

    applyNavigationVisibility(root = document) {
      root.querySelectorAll?.(".nav-item[data-view]").forEach(button => {
        setNavigationElementVisibility(button, this.canView(button.dataset.view));
      });

      root.querySelectorAll?.(".nav-group[data-nav-group]").forEach(group => {
        const groupKey = normalizeKey(group.dataset.navGroup);
        const visible = this.canShowGroup(groupKey, root);
        setNavigationElementVisibility(group, visible);
        if (!visible) {
          group.classList.add("is-collapsed");
          group.querySelector(".nav-group-toggle")?.setAttribute("aria-expanded", "false");
        }
      });

      root.querySelectorAll?.("[data-mobile-view]").forEach(button => {
        setNavigationElementVisibility(button, this.canView(button.dataset.mobileView));
      });

      window.dispatchEvent(new CustomEvent("kyum-navigation-permissions-applied", {
        detail: frozenResult({ role: this.currentRole(), allowedScreens: this.allowedScreens() })
      }));
    },

    validateCurrentView(preferred = "dashboard") {
      const current = window.KYUMNavigation?.current?.()
        || String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0]
        || preferred;
      const authorization = this.authorize(current, preferred);
      if (authorization.allowed) return authorization;
      if (authorization.target && authorization.target !== current) {
        window.KYUMNavigation?.open?.(authorization.target, {
          silent: true,
          permissionFallback: true,
          replaceHistory: true
        });
      }
      return authorization;
    },

    snapshot() {
      const source = legacyPermissions();
      const rows = source?.screenPermissions instanceof Map
        ? [...source.screenPermissions.entries()].map(([screenKey, row]) => frozenResult({ screenKey, ...row }))
        : [];
      return frozenResult({
        engineVersion: this.version,
        role: this.currentRole(),
        loaded: this.isLoaded(),
        allowedScreens: this.allowedScreens(),
        rows: Object.freeze(rows)
      });
    },

    refresh(options = {}) {
      this.applyNavigationVisibility(options.root || document);
      legacyPermissions()?.applyActionVisibility?.(options.root || document);
      if (options.validateCurrentView !== false) this.validateCurrentView(options.preferred || "dashboard");
      const snapshot = this.snapshot();
      window.dispatchEvent(new CustomEvent("kyum-permissions-refreshed", { detail: snapshot }));
      return snapshot;
    },

    setDebug(enabled) {
      this.debugEnabled = enabled === true && this.currentRole() === "super_admin";
      return this.debugEnabled;
    },

    explain(screenKey, action = "view") {
      if (!this.debugEnabled || this.currentRole() !== "super_admin") return null;
      const key = normalizeKey(screenKey);
      const normalizedAction = normalizeAction(action);
      const source = legacyPermissions();
      const row = source?.screenPermissions?.get?.(key) || null;
      return frozenResult({
        screenKey: key,
        action: normalizedAction,
        field: ACTION_FIELD_MAP[normalizedAction],
        allowed: this.can(key, normalizedAction),
        role: this.currentRole(),
        permissionsLoaded: Boolean(source?.permissionsLoaded),
        source: row ? "current_user_screen_permissions" : (this.currentRole() === "super_admin" ? "super_admin_override" : "missing_permission_row")
      });
    }
  };

  window.PermissionEngine = Object.freeze(engine);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => engine.initialize(), { once: true });
  } else {
    engine.initialize();
  }
})();
