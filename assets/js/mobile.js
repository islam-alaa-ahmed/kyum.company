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

  const customersView = document.getElementById("customersView");
  let customersFiltersOpen = false;

  function customerPhoneFromRow(row) {
    const cell = row?.querySelector("td:first-child strong");
    return String(cell?.textContent || "").replace(/[^\d+]/g, "");
  }

  function decorateCustomerRows() {
    if (!customersView) return;
    const labels = ["رقم العميل", "اسم العميل", "اسم المسؤول", "التصنيف", "مجال الاهتمام", "المندوب", "تاريخ التواصل", "رقم عرض السعر", "سبب عدم البيع", "الإجراءات"];
    const fields = ["phone", "name", "contact", "type", "interests", "representative", "date", "quotation", "reason", "actions"];
    customersView.querySelectorAll("#customersTableBody tr").forEach(row => {
      const cells = [...row.children];
      if (cells.length !== 10) return;
      cells.forEach((cell, index) => {
        cell.dataset.mobileLabel = labels[index];
        cell.dataset.mobileField = fields[index];
      });
      const actions = cells[9]?.querySelector(".row-actions");
      const phone = customerPhoneFromRow(row);
      if (!actions || !phone) return;
      if (!actions.querySelector(".mobile-customer-call")) {
        const call = document.createElement("a");
        call.className = "mobile-customer-call";
        call.href = `tel:${phone}`;
        call.textContent = "اتصال";
        call.setAttribute("aria-label", `اتصال بالعميل ${phone}`);
        actions.append(call);
      }
      if (!actions.querySelector(".mobile-customer-whatsapp")) {
        const whatsapp = document.createElement("a");
        whatsapp.className = "mobile-customer-whatsapp";
        whatsapp.href = `https://wa.me/${phone.replace(/^00/, "").replace(/^\+/, "")}`;
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener noreferrer";
        whatsapp.textContent = "WhatsApp";
        whatsapp.setAttribute("aria-label", `فتح واتساب للعميل ${phone}`);
        actions.append(whatsapp);
      }
    });
  }

  function closeCustomersFilters() {
    if (!customersView) return;
    customersFiltersOpen = false;
    customersView.classList.remove("mobile-customers-filters-open");
    customersView.querySelector("[data-mobile-customers-filter]")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-customers-sheet-open");
  }

  function syncCustomersFilterState() {
    if (!customersView) return;
    const active = [...customersView.querySelectorAll(".filters-row select")].some(select => Boolean(select.value));
    customersView.querySelector("[data-mobile-customers-filter]")?.classList.toggle("has-filter", active);
  }

  function installCustomersShell() {
    if (!customersView || customersView.querySelector("[data-mobile-customers-filter]")) return;
    const actions = customersView.querySelector(".actions-row");
    const filters = customersView.querySelector(".filters-row");
    if (!actions || !filters) return;

    const filterButton = document.createElement("button");
    filterButton.type = "button";
    filterButton.className = "mobile-customers-filter-btn";
    filterButton.dataset.mobileCustomersFilter = "";
    filterButton.setAttribute("aria-label", "فتح فلاتر العملاء");
    filterButton.setAttribute("aria-expanded", "false");
    filterButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>`;
    actions.append(filterButton);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "mobile-customers-filter-close";
    close.setAttribute("aria-label", "إغلاق فلاتر العملاء");
    close.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    filters.prepend(close);

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-customers-filter-backdrop";
    backdrop.setAttribute("aria-label", "إغلاق فلاتر العملاء");
    customersView.append(backdrop);

    filterButton.addEventListener("click", () => {
      customersFiltersOpen = !customersFiltersOpen;
      customersView.classList.toggle("mobile-customers-filters-open", customersFiltersOpen);
      filterButton.setAttribute("aria-expanded", String(customersFiltersOpen));
      document.body.classList.toggle("mobile-customers-sheet-open", customersFiltersOpen);
    });
    close.addEventListener("click", closeCustomersFilters);
    backdrop.addEventListener("click", closeCustomersFilters);
    filters.querySelectorAll("select").forEach(select => select.addEventListener("change", () => {
      syncCustomersFilterState();
      window.setTimeout(closeCustomersFilters, 120);
    }));

    const body = customersView.querySelector("#customersTableBody");
    if (body) new MutationObserver(decorateCustomerRows).observe(body, { childList: true, subtree: true });
    decorateCustomerRows();
    syncCustomersFilterState();
  }


  function normalizeCustomer360Phone(value) {
    return String(value || "").replace(/[^\d+]/g, "").trim();
  }

  function decorateCustomer360() {
    const dialog = document.getElementById("customerDetailsDialog");
    const content = document.getElementById("customerDetailsContent");
    const subtitle = document.getElementById("customerDetailsSubtitle");
    if (!dialog || !content || !dialog.open || !MOBILE_MEDIA.matches) return;

    document.body.classList.add("mobile-customer360-open");
    const phoneCandidate = normalizeCustomer360Phone((subtitle?.textContent || "").split("·")[0]);
    const hasPhone = /\d{7,}/.test(phoneCandidate);

    let actions = content.querySelector(".mobile-customer360-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "mobile-customer360-actions";
      content.prepend(actions);
    }
    actions.innerHTML = hasPhone ? `
      <a href="tel:${phoneCandidate}" data-kind="call" aria-label="اتصال بالعميل">اتصال بالعميل</a>
      <a href="https://wa.me/${phoneCandidate.replace(/^00/, "").replace(/^\+/, "")}" target="_blank" rel="noopener noreferrer" data-kind="whatsapp" aria-label="فتح واتساب للعميل">WhatsApp</a>
    ` : "";
    actions.hidden = !hasPhone;

    let jumpNav = content.querySelector(".mobile-customer360-jumpnav");
    if (!jumpNav) {
      jumpNav = document.createElement("nav");
      jumpNav.className = "mobile-customer360-jumpnav";
      jumpNav.setAttribute("aria-label", "أقسام ملف العميل");
      const sections = [...content.querySelectorAll(".customer360-section")];
      const wanted = ["البيانات الأساسية", "عروض الأسعار", "ملخص المتابعة", "سجل النشاط الموحد", "سجل المتابعات"];
      wanted.forEach(label => {
        const target = sections.find(section => section.querySelector("h3")?.textContent.trim() === label);
        if (!target) return;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label.replace("سجل النشاط الموحد", "النشاط").replace("البيانات الأساسية", "البيانات").replace("ملخص المتابعة", "المتابعة").replace("سجل المتابعات", "السجل");
        button.addEventListener("click", () => target.scrollIntoView({ behavior: "smooth", block: "start" }));
        jumpNav.append(button);
      });
      actions.after(jumpNav);
    }
  }

  function installCustomer360Shell() {
    const dialog = document.getElementById("customerDetailsDialog");
    const content = document.getElementById("customerDetailsContent");
    if (!dialog || !content) return;
    const observer = new MutationObserver(() => window.requestAnimationFrame(decorateCustomer360));
    observer.observe(content, { childList: true, subtree: false });
    dialog.addEventListener("close", () => document.body.classList.remove("mobile-customer360-open"));
    dialog.addEventListener("cancel", () => document.body.classList.remove("mobile-customer360-open"));
  }

  installDashboardShell();
  installPullToRefresh();
  installCustomersShell();
  installCustomer360Shell();
  syncPermissionVisibility();
  syncActiveState();
})();

/* KYUM Mobile Enterprise — Phase M5: Follow-ups */
(() => {
  "use strict";

  const MOBILE_MEDIA = window.matchMedia("(max-width: 767px)");
  const followupsView = document.getElementById("followupsView");
  if (!followupsView) return;

  let filtersOpen = false;
  let rowObserver = null;

  const labels = [
    "العميل",
    "رقم العميل",
    "تاريخ التواصل",
    "طريقة التواصل",
    "المندوب",
    "نتيجة التواصل",
    "عرض السعر",
    "المتابعة القادمة",
    "الحالة",
    "الإجراءات"
  ];

  const fields = [
    "customer",
    "phone",
    "contact-date",
    "method",
    "representative",
    "result",
    "quotation",
    "next-date",
    "status",
    "actions"
  ];

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function closeFilters() {
    filtersOpen = false;
    followupsView.classList.remove("mobile-followups-filters-open");
    followupsView.querySelector("[data-mobile-followups-filter]")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-followups-sheet-open");
  }

  function toggleFilters() {
    filtersOpen = !filtersOpen;
    followupsView.classList.toggle("mobile-followups-filters-open", filtersOpen);
    followupsView.querySelector("[data-mobile-followups-filter]")?.setAttribute("aria-expanded", String(filtersOpen));
    document.body.classList.toggle("mobile-followups-sheet-open", filtersOpen);
  }

  function activeStatusLabel() {
    const select = document.getElementById("followupStatusFilter");
    return select?.selectedOptions?.[0]?.textContent?.trim() || "كل المتابعات";
  }

  function updateToolbarState() {
    const active = followupsView.querySelector("[data-mobile-followups-active-filter]");
    if (active) active.textContent = activeStatusLabel();

    const selected = document.getElementById("followupStatusFilter")?.value || "";
    followupsView.querySelectorAll("[data-mobile-followups-status]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.mobileFollowupsStatus === selected);
    });
  }

  function applyQuickStatus(status) {
    const select = document.getElementById("followupStatusFilter");
    if (!select) return;
    select.value = status;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    updateToolbarState();
  }

  function installShell() {
    if (followupsView.querySelector(".mobile-followups-toolbar")) return;

    const actions = followupsView.querySelector(":scope > .actions-row");
    const stats = document.getElementById("followupStats");
    const filters = followupsView.querySelector(".followup-filters");

    const toolbar = document.createElement("div");
    toolbar.className = "mobile-followups-toolbar";
    toolbar.innerHTML = `
      <div class="mobile-followups-heading">
        <span>إدارة التواصل</span>
        <strong>المتابعات</strong>
        <small data-mobile-followups-active-filter>كل المتابعات</small>
      </div>
      <button type="button" class="mobile-followups-filter-button" data-mobile-followups-filter aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        <span>الفلاتر</span>
      </button>`;

    actions?.insertAdjacentElement("afterend", toolbar);

    const quickNav = document.createElement("div");
    quickNav.className = "mobile-followups-quicknav";
    quickNav.setAttribute("aria-label", "فلترة المتابعات حسب الحالة");
    quickNav.innerHTML = `
      <button type="button" data-mobile-followups-status="">الكل</button>
      <button type="button" data-mobile-followups-status="today">اليوم</button>
      <button type="button" data-mobile-followups-status="overdue">المتأخرة</button>
      <button type="button" data-mobile-followups-status="upcoming">القادمة</button>
      <button type="button" data-mobile-followups-status="completed">المكتملة</button>`;
    stats?.insertAdjacentElement("afterend", quickNav);

    if (filters) {
      filters.classList.add("mobile-followups-filter-sheet");
      const header = document.createElement("div");
      header.className = "mobile-followups-sheet-header";
      header.innerHTML = `
        <div><span>خيارات العرض</span><strong>فلترة المتابعات</strong></div>
        <button type="button" class="mobile-followups-filter-close" aria-label="إغلاق الفلاتر">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>`;
      filters.prepend(header);
      header.querySelector("button")?.addEventListener("click", closeFilters);
    }

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-followups-filter-backdrop";
    backdrop.setAttribute("aria-label", "إغلاق فلاتر المتابعات");
    followupsView.append(backdrop);

    toolbar.querySelector("[data-mobile-followups-filter]")?.addEventListener("click", toggleFilters);
    backdrop.addEventListener("click", closeFilters);

    quickNav.querySelectorAll("[data-mobile-followups-status]").forEach(button => {
      button.addEventListener("click", () => applyQuickStatus(button.dataset.mobileFollowupsStatus || ""));
    });

    followupsView.querySelectorAll("#followupStatusFilter, #followupRepFilter").forEach(control => {
      control.addEventListener("change", () => {
        updateToolbarState();
        window.setTimeout(closeFilters, 120);
      });
    });

    updateToolbarState();
  }

  function decorateRows() {
    followupsView.querySelectorAll("#followupsTableBody tr").forEach(row => {
      const cells = [...row.children];
      if (cells.length !== 10) return;

      cells.forEach((cell, index) => {
        cell.dataset.mobileLabel = labels[index];
        cell.dataset.mobileField = fields[index];
      });

      const actionCell = cells[9];
      const actions = actionCell?.querySelector(".row-actions");
      const phone = normalizePhone(cells[1]?.textContent);
      const editButton = actions?.querySelector("[data-edit-followup]");
      if (!actions) return;

      if (phone && !actions.querySelector(".mobile-followup-call")) {
        const call = document.createElement("a");
        call.className = "mobile-followup-call";
        call.href = `tel:${phone}`;
        call.textContent = "اتصال";
        call.setAttribute("aria-label", "اتصال بالعميل");
        actions.prepend(call);
      }

      if (phone && !actions.querySelector(".mobile-followup-whatsapp")) {
        const whatsapp = document.createElement("a");
        whatsapp.className = "mobile-followup-whatsapp";
        whatsapp.href = `https://wa.me/${phone.replace(/^\+/, "")}`;
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener noreferrer";
        whatsapp.textContent = "واتساب";
        whatsapp.setAttribute("aria-label", "فتح واتساب للعميل");
        actions.insertBefore(whatsapp, editButton || actions.firstChild);
      }

      if (editButton && !actions.querySelector(".mobile-followup-update")) {
        const update = document.createElement("button");
        update.type = "button";
        update.className = "mobile-followup-update";
        update.dataset.editFollowup = editButton.dataset.editFollowup;
        update.textContent = "تحديث الحالة";
        actions.insertBefore(update, editButton);
        editButton.textContent = "تعديل التفاصيل";
      }
    });
  }

  function observeRows() {
    const body = document.getElementById("followupsTableBody");
    if (!body || rowObserver) return;
    rowObserver = new MutationObserver(decorateRows);
    rowObserver.observe(body, { childList: true, subtree: true });
    decorateRows();
  }

  function syncMobileState() {
    if (!MOBILE_MEDIA.matches) closeFilters();
    updateToolbarState();
    decorateRows();
  }

  installShell();
  observeRows();
  syncMobileState();

  window.addEventListener("customer-auth-ready", syncMobileState);
  window.addEventListener("hashchange", syncMobileState);
  MOBILE_MEDIA.addEventListener?.("change", syncMobileState);
})();

/* KYUM Mobile Enterprise — Phase M6: Daily Operations */
(() => {
  "use strict";

  const MOBILE_MEDIA = window.matchMedia("(max-width: 767px)");
  const view = document.getElementById("dailyOperationsView");
  if (!view) return;

  const tableLabels = new Map([
    ["dailyFollowupsBody", ["العميل", "المندوب", "طريقة التواصل", "النتيجة", "المتابعة القادمة"]],
    ["dailyCustomersBody", ["العميل", "التصنيف", "اسم المسؤول", "المندوب", "وقت الإضافة"]],
    ["dailyQuotationsBody", ["العميل", "المندوب", "رقم العرض", "الحالة", "القيمة"]],
    ["dailyOverdueBody", ["العميل", "المندوب", "الموعد", "التأخير", "النتيجة السابقة"]]
  ]);

  let observer = null;
  let refreshTimer = null;

  function labelRows(body, labels) {
    if (!body) return;
    [...body.rows].forEach(row => {
      [...row.cells].forEach((cell, index) => {
        if (!cell.classList.contains("empty-state")) {
          cell.dataset.mobileLabel = labels[index] || "بيان";
        }
      });
    });
  }

  function syncTables() {
    tableLabels.forEach((labels, id) => labelRows(document.getElementById(id), labels));
  }

  function completionPercent() {
    const value = document.getElementById("dailyTasksCompletionRate")?.textContent || "0";
    return Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0));
  }

  function syncProgress() {
    const ring = view.querySelector(".mobile-daily-progress-ring");
    const value = view.querySelector("[data-mobile-daily-progress-value]");
    const meta = view.querySelector("[data-mobile-daily-progress-meta]");
    const percent = completionPercent();
    if (ring) ring.style.setProperty("--progress", String(percent));
    if (value) value.textContent = `${percent}%`;
    if (meta) meta.textContent = document.getElementById("dailyTasksCompletionText")?.textContent || "0 من 0";
  }

  function scrollToSelector(selector) {
    const target = view.querySelector(selector);
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function openView(viewName) {
    document.querySelector(`.nav-item[data-view="${viewName}"]`)?.click();
  }

  function refreshDailyOperations() {
    if (!MOBILE_MEDIA.matches) return;
    view.classList.add("mobile-daily-refreshing");
    document.querySelector('.nav-item[data-view="dailyOperations"]')?.click();
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      syncTables();
      syncProgress();
      view.classList.remove("mobile-daily-refreshing");
    }, 900);
  }

  function ensureToolbar() {
    if (view.querySelector(".mobile-daily-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "mobile-daily-toolbar";
    toolbar.innerHTML = `
      <div class="mobile-daily-toolbar-head">
        <div class="mobile-daily-progress">
          <div class="mobile-daily-progress-ring" aria-hidden="true"><strong data-mobile-daily-progress-value>0%</strong></div>
          <div class="mobile-daily-progress-copy">
            <strong>تقدم يوم العمل</strong>
            <small data-mobile-daily-progress-meta>0 من 0</small>
          </div>
        </div>
      </div>
      <div class="mobile-daily-toolbar-actions">
        <button type="button" class="secondary-btn" data-mobile-daily-refresh>تحديث اليوم</button>
        <button type="button" class="primary-btn" data-mobile-daily-report>تقرير الأداء</button>
      </div>
      <nav class="mobile-daily-jump-nav" aria-label="أقسام التشغيل اليومي">
        <button type="button" data-mobile-daily-jump=".daily-checklist-panel">المهام</button>
        <button type="button" data-mobile-daily-jump=".daily-targets-panel">الأهداف</button>
        <button type="button" data-mobile-daily-jump="#dailyFollowupsBody">المتابعات</button>
        <button type="button" data-mobile-daily-jump="#dailyCustomersBody">العملاء</button>
        <button type="button" data-mobile-daily-jump=".daily-alerts-panel">التنبيهات</button>
        <button type="button" data-mobile-daily-jump=".daily-overdue-panel">المتأخرة</button>
      </nav>`;
    view.prepend(toolbar);

    toolbar.querySelector("[data-mobile-daily-refresh]")?.addEventListener("click", refreshDailyOperations);
    toolbar.querySelector("[data-mobile-daily-report]")?.addEventListener("click", () => openView("dailyPerformanceReport"));
    toolbar.querySelectorAll("[data-mobile-daily-jump]").forEach(button => {
      button.addEventListener("click", () => scrollToSelector(button.dataset.mobileDailyJump));
    });
  }

  function connectObserver() {
    observer?.disconnect();
    observer = new MutationObserver(() => {
      syncTables();
      syncProgress();
    });
    [
      document.getElementById("dailyChecklist"),
      document.getElementById("dailyFollowupsBody"),
      document.getElementById("dailyCustomersBody"),
      document.getElementById("dailyQuotationsBody"),
      document.getElementById("dailyOverdueBody"),
      document.getElementById("dailyTasksCompletionRate"),
      document.getElementById("dailyTasksCompletionText")
    ].filter(Boolean).forEach(node => observer.observe(node, { childList: true, subtree: true, characterData: true }));
  }

  function initialize() {
    ensureToolbar();
    syncTables();
    syncProgress();
    connectObserver();
  }

  initialize();
  MOBILE_MEDIA.addEventListener?.("change", initialize);
})();


/* Phase M7 — Mobile Quotations */
(() => {
  const MOBILE_MEDIA = window.matchMedia("(max-width: 767px)");
  const view = document.getElementById("quotationsView");
  const body = document.getElementById("quotationsTableBody");
  const filters = view?.querySelector(".quotation-filters");
  if (!view || !body || !filters) return;

  let observer;
  const labels = ["رقم العرض", "العميل", "رقم العميل", "المندوب", "تاريخ العرض", "القيمة", "الحالة", "تاريخ الانتهاء", "سبب الرفض", "الإجراءات"];

  function normalizePhone(value) {
    const raw = String(value || "").trim();
    if (!raw || raw === "—") return "";
    return raw.replace(/[^\d+]/g, "");
  }

  function getRowData(row) {
    const cells = [...row.cells];
    return {
      code: cells[0]?.textContent.trim() || "—",
      customer: cells[1]?.textContent.trim() || "—",
      phone: cells[2]?.textContent.trim() || "",
      representative: cells[3]?.textContent.trim() || "—",
      date: cells[4]?.textContent.trim() || "—",
      amount: cells[5]?.textContent.trim() || "—",
      status: cells[6]?.textContent.trim() || "—",
      expiry: cells[7]?.textContent.trim() || "—",
      rejection: cells[8]?.textContent.trim() || "—"
    };
  }

  function quotationText(data) {
    return `عرض سعر ${data.code}\nالعميل: ${data.customer}\nالمندوب: ${data.representative}\nالتاريخ: ${data.date}\nالقيمة: ${data.amount}\nالحالة: ${data.status}\nتاريخ الانتهاء: ${data.expiry}`;
  }

  async function shareQuotation(data) {
    const text = quotationText(data);
    if (navigator.share) {
      try { await navigator.share({ title: `عرض سعر ${data.code}`, text }); return; } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      window.alert("تم نسخ بيانات عرض السعر.");
    } catch {
      window.prompt("انسخ بيانات عرض السعر:", text);
    }
  }

  function printQuotation(data) {
    const popup = window.open("", "_blank", "width=720,height=900");
    if (!popup) return;
    const escape = value => String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    popup.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>عرض سعر ${escape(data.code)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#172033}h1{font-size:24px;margin:0 0 24px}.card{border:1px solid #d8dee9;border-radius:16px;padding:20px}.row{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:11px 0;border-bottom:1px solid #edf0f5}.row:last-child{border:0}.label{color:#667085;font-weight:700}@media print{body{padding:0}.card{border-color:#aaa}}</style></head><body><h1>عرض سعر ${escape(data.code)}</h1><div class="card"><div class="row"><span class="label">العميل</span><strong>${escape(data.customer)}</strong></div><div class="row"><span class="label">رقم العميل</span><strong>${escape(data.phone || "—")}</strong></div><div class="row"><span class="label">المندوب</span><strong>${escape(data.representative)}</strong></div><div class="row"><span class="label">تاريخ العرض</span><strong>${escape(data.date)}</strong></div><div class="row"><span class="label">القيمة</span><strong>${escape(data.amount)}</strong></div><div class="row"><span class="label">الحالة</span><strong>${escape(data.status)}</strong></div><div class="row"><span class="label">تاريخ الانتهاء</span><strong>${escape(data.expiry)}</strong></div><div class="row"><span class="label">سبب الرفض</span><strong>${escape(data.rejection)}</strong></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  function enhanceRows() {
    if (!MOBILE_MEDIA.matches) return;
    [...body.rows].forEach(row => {
      if (row.querySelector(".empty-state")) return;
      [...row.cells].forEach((cell, index) => cell.dataset.mobileLabel = labels[index] || "");
      if (row.dataset.mobileQuotationReady === "true") return;
      row.dataset.mobileQuotationReady = "true";
      const data = getRowData(row);
      const actions = row.cells[9]?.querySelector(".row-actions") || row.cells[9];
      if (!actions) return;

      const phone = normalizePhone(data.phone);
      if (phone) {
        const call = document.createElement("a");
        call.className = "mobile-quotation-call";
        call.href = `tel:${phone}`;
        call.textContent = "اتصال";
        actions.prepend(call);

        const whatsapp = document.createElement("a");
        whatsapp.className = "mobile-quotation-whatsapp";
        whatsapp.href = `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(quotationText(data))}`;
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener";
        whatsapp.textContent = "WhatsApp";
        actions.append(whatsapp);
      }

      const share = document.createElement("button");
      share.type = "button";
      share.className = "mobile-quotation-share";
      share.textContent = "مشاركة";
      share.addEventListener("click", () => shareQuotation(getRowData(row)));
      actions.append(share);

      const print = document.createElement("button");
      print.type = "button";
      print.className = "mobile-quotation-print";
      print.textContent = "PDF / طباعة";
      print.addEventListener("click", () => printQuotation(getRowData(row)));
      actions.append(print);
    });
  }

  function closeFilters() {
    view.classList.remove("mobile-quotations-filters-open");
    view.querySelector("[data-mobile-quotations-filter]")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-quotations-sheet-open");
  }

  function ensureToolbar() {
    if (view.querySelector(".mobile-quotations-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "mobile-quotations-toolbar";
    toolbar.innerHTML = `<div><strong>عروض الأسعار</strong><small>ابحث وراجع وشارك العروض بسهولة</small></div><button type="button" data-mobile-quotations-filter aria-expanded="false">الفلاتر</button>`;
    view.querySelector(".actions-row")?.after(toolbar);

    filters.classList.add("mobile-quotations-filter-sheet");
    const sheetHeader = document.createElement("div");
    sheetHeader.className = "mobile-quotations-sheet-header";
    sheetHeader.innerHTML = `<div><strong>فلترة عروض الأسعار</strong><small>البحث والحالة والمندوب</small></div><button type="button" aria-label="إغلاق">×</button>`;
    filters.prepend(sheetHeader);

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-quotations-filter-backdrop";
    backdrop.setAttribute("aria-label", "إغلاق الفلاتر");
    view.append(backdrop);

    toolbar.querySelector("button")?.addEventListener("click", () => {
      const open = !view.classList.contains("mobile-quotations-filters-open");
      view.classList.toggle("mobile-quotations-filters-open", open);
      toolbar.querySelector("button")?.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("mobile-quotations-sheet-open", open);
    });
    sheetHeader.querySelector("button")?.addEventListener("click", closeFilters);
    backdrop.addEventListener("click", closeFilters);
    filters.querySelectorAll("input, select").forEach(control => control.addEventListener("change", () => window.setTimeout(enhanceRows, 0)));
  }

  function initialize() {
    ensureToolbar();
    enhanceRows();
    observer?.disconnect();
    observer = new MutationObserver(enhanceRows);
    observer.observe(body, { childList: true, subtree: true });
  }

  initialize();
  MOBILE_MEDIA.addEventListener?.("change", initialize);
})();
