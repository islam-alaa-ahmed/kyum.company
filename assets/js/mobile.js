(() => {
  "use strict";

  const MOBILE_MEDIA = window.matchMedia("(max-width: 767px)");
  const nav = document.getElementById("mobileBottomNav");
  if (!nav) return;

  const viewButtons = [...nav.querySelectorAll("[data-mobile-view]")];
  const menuButton = nav.querySelector("[data-mobile-action='menu']");
  const dashboardView = document.getElementById("dashboardView");
  let dashboardFiltersOpen = false;
  let pullStartY = 0;
  let pullTracking = false;
  let pullTriggered = false;

  function desktopViewButton(view) {
    return document.querySelector(`.nav-item[data-view="${view}"]`);
  }

  function syncPermissionVisibility() {
    viewButtons.forEach(button => {
      const source = desktopViewButton(button.dataset.mobileView);
      const unavailable = !source || source.hidden || source.classList.contains("hidden") || source.getAttribute("aria-hidden") === "true";
      button.hidden = unavailable;
    });
  }

  function currentView() {
    const active = document.querySelector(".nav-item[data-view].active");
    if (active?.dataset.view) return active.dataset.view;
    const hash = location.hash.replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || "dashboard";
  }

  function syncActiveState() {
    const activeView = currentView();
    viewButtons.forEach(button => {
      const active = button.dataset.mobileView === activeView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    menuButton?.classList.remove("is-active");
    if (activeView !== "dashboard") closeDashboardFilters();
  }

  function openView(view) {
    const source = desktopViewButton(view);
    if (!source || source.hidden || source.classList.contains("hidden")) return;
    source.click();
    syncActiveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshDashboard({ announce = true } = {}) {
    if (!dashboardView || typeof window.renderDashboard !== "function") return;
    dashboardView.classList.add("mobile-dashboard-loading");
    const refreshButton = dashboardView.querySelector("[data-mobile-dashboard-refresh]");
    refreshButton?.classList.add("is-refreshing");
    refreshButton?.setAttribute("aria-busy", "true");

    window.requestAnimationFrame(() => {
      window.renderDashboard();
      window.setTimeout(() => {
        dashboardView.classList.remove("mobile-dashboard-loading");
        refreshButton?.classList.remove("is-refreshing");
        refreshButton?.setAttribute("aria-busy", "false");
        if (announce) {
          const status = dashboardView.querySelector("[data-mobile-dashboard-status]");
          if (status) {
            status.textContent = "تم تحديث لوحة التحكم";
            window.setTimeout(() => { status.textContent = ""; }, 1800);
          }
        }
      }, 280);
    });
  }

  function closeDashboardFilters() {
    if (!dashboardView) return;
    dashboardFiltersOpen = false;
    dashboardView.classList.remove("mobile-filters-open");
    dashboardView.querySelector("[data-mobile-dashboard-filter]")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-dashboard-sheet-open");
  }

  function toggleDashboardFilters() {
    if (!dashboardView) return;
    dashboardFiltersOpen = !dashboardFiltersOpen;
    dashboardView.classList.toggle("mobile-filters-open", dashboardFiltersOpen);
    dashboardView.querySelector("[data-mobile-dashboard-filter]")?.setAttribute("aria-expanded", String(dashboardFiltersOpen));
    document.body.classList.toggle("mobile-dashboard-sheet-open", dashboardFiltersOpen);
  }

  function installDashboardShell() {
    if (!dashboardView || dashboardView.querySelector(".mobile-dashboard-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.className = "mobile-dashboard-toolbar";
    toolbar.innerHTML = `
      <div class="mobile-dashboard-heading">
        <span>نظرة سريعة</span>
        <strong>لوحة التحكم</strong>
      </div>
      <div class="mobile-dashboard-actions">
        <button type="button" class="mobile-dashboard-action" data-mobile-dashboard-filter aria-expanded="false" aria-label="فتح فلاتر لوحة التحكم">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
          <span>الفلاتر</span>
        </button>
        <button type="button" class="mobile-dashboard-action" data-mobile-dashboard-refresh aria-label="تحديث لوحة التحكم">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7"/></svg>
          <span>تحديث</span>
        </button>
      </div>
      <span class="mobile-dashboard-status" data-mobile-dashboard-status aria-live="polite"></span>`;

    dashboardView.prepend(toolbar);

    const filterBar = dashboardView.querySelector(".dashboard-filter-bar");
    if (filterBar) {
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "mobile-filter-close";
      closeButton.setAttribute("aria-label", "إغلاق الفلاتر");
      closeButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
      filterBar.prepend(closeButton);
      closeButton.addEventListener("click", closeDashboardFilters);
    }

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-dashboard-filter-backdrop";
    backdrop.setAttribute("aria-label", "إغلاق فلاتر لوحة التحكم");
    dashboardView.append(backdrop);

    toolbar.querySelector("[data-mobile-dashboard-filter]")?.addEventListener("click", toggleDashboardFilters);
    toolbar.querySelector("[data-mobile-dashboard-refresh]")?.addEventListener("click", () => refreshDashboard());
    backdrop.addEventListener("click", closeDashboardFilters);

    dashboardView.querySelectorAll(".dashboard-filters select, .dashboard-filters input").forEach(control => {
      control.addEventListener("change", () => {
        window.setTimeout(closeDashboardFilters, 120);
      });
    });

    dashboardView.querySelector("#resetDashboardFilters")?.addEventListener("click", () => {
      window.setTimeout(closeDashboardFilters, 120);
    });
  }

  function installPullToRefresh() {
    if (!dashboardView) return;

    document.addEventListener("touchstart", event => {
      if (!MOBILE_MEDIA.matches || currentView() !== "dashboard" || dashboardFiltersOpen || window.scrollY > 0) return;
      pullStartY = event.touches[0]?.clientY || 0;
      pullTracking = true;
      pullTriggered = false;
    }, { passive: true });

    document.addEventListener("touchmove", event => {
      if (!pullTracking || pullTriggered) return;
      const currentY = event.touches[0]?.clientY || 0;
      const distance = currentY - pullStartY;
      dashboardView.classList.toggle("mobile-pull-ready", distance > 72);
      if (distance > 96) pullTriggered = true;
    }, { passive: true });

    document.addEventListener("touchend", () => {
      if (!pullTracking) return;
      dashboardView.classList.remove("mobile-pull-ready");
      pullTracking = false;
      if (pullTriggered) refreshDashboard();
      pullTriggered = false;
    }, { passive: true });
  }

  viewButtons.forEach(button => {
    button.addEventListener("click", () => openView(button.dataset.mobileView));
  });

  menuButton?.addEventListener("click", () => {
    const launcher = document.getElementById("sidebarMenuToggle");
    if (!launcher) return;
    launcher.click();
    menuButton.classList.toggle("is-active", launcher.getAttribute("aria-expanded") === "true");
  });

  document.getElementById("sidebarBackdrop")?.addEventListener("click", () => menuButton?.classList.remove("is-active"));
  document.getElementById("mainSidebar")?.addEventListener("click", event => {
    if (event.target.closest(".nav-item[data-view]")) menuButton?.classList.remove("is-active");
  });

  const observer = new MutationObserver(() => {
    syncPermissionVisibility();
    syncActiveState();
  });

  document.querySelectorAll(".nav-item[data-view]").forEach(button => {
    observer.observe(button, { attributes: true, attributeFilter: ["class", "hidden", "aria-hidden"] });
  });

  window.addEventListener("hashchange", syncActiveState);
  window.addEventListener("popstate", syncActiveState);
  window.addEventListener("customer-auth-ready", () => {
    syncPermissionVisibility();
    syncActiveState();
    installDashboardShell();
    refreshDashboard({ announce: false });
  });

  MOBILE_MEDIA.addEventListener?.("change", () => {
    if (!MOBILE_MEDIA.matches) {
      menuButton?.classList.remove("is-active");
      closeDashboardFilters();
    }
  });

  installDashboardShell();
  installPullToRefresh();
  syncPermissionVisibility();
  syncActiveState();
})();
