(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const money = value => `SAR ${Number(value || 0).toFixed(2)}`;

  let rows = [];
  let opts = { customers: [], quotations: [], neighborhoods: [], serviceTypes: [] };
  let optionsLoaded = false;
  let editingRequestId = null;

  function status(node, message, type = "info") {
    if (!node) return;
    node.textContent = message;
    node.className = `data-status ${type}`;
  }

  function clearStatus(node) {
    if (!node) return;
    node.textContent = "";
    node.className = "data-status hidden";
  }


  function customerLabel(customer) {
    return [customer.customer_name, customer.phone, customer.customer_number].filter(Boolean).join(" — ");
  }

  function syncCustomerSearch(customerId = "") {
    const hidden = $("newInstallationCustomerId");
    const input = $("newInstallationCustomerSearch");
    if (!hidden || !input) return;
    const customer = opts.customers.find(item => item.id === customerId);
    hidden.value = customer?.id || "";
    input.value = customer ? customerLabel(customer) : "";
    input.setCustomValidity(customer ? "" : (input.value ? "اختر العميل من نتائج البحث." : ""));
  }

  function renderCustomerResults(query = "") {
    const box = $("newInstallationCustomerResults");
    const input = $("newInstallationCustomerSearch");
    if (!box || !input) return;
    const q = String(query || "").trim().toLowerCase();
    const matches = (opts.customers || []).filter(customer => !q || [customer.customer_name, customer.phone, customer.customer_number].join(" ").toLowerCase().includes(q)).slice(0, 50);
    box.innerHTML = matches.length ? matches.map(customer => `<button type="button" class="installation-customer-result" role="option" data-installation-customer-id="${esc(customer.id)}"><strong>${esc(customer.customer_name || "عميل بدون اسم")}</strong><span>${esc(customer.phone || "بدون هاتف")} — ${esc(customer.customer_number || "بدون رقم عميل")}</span></button>`).join("") : '<div class="empty-cell">لا توجد نتائج مطابقة.</div>';
    box.classList.remove("hidden");
    input.setAttribute("aria-expanded", "true");
  }

  function closeCustomerResults() {
    $("newInstallationCustomerResults")?.classList.add("hidden");
    $("newInstallationCustomerSearch")?.setAttribute("aria-expanded", "false");
  }

  function reportOptionLoadWarnings(data) {
    const errors = data?.errors || {};
    const labels = { customers: "العملاء", quotations: "عروض الأسعار", neighborhoods: "الأحياء", serviceTypes: "الخدمات" };
    const failed = Object.keys(errors).map(key => labels[key] || key);
    const target = $("newInstallationRequestFormStatus");
    if (!failed.length) {
      if (target?.dataset.optionWarning === "true") clearStatus(target);
      if (target) delete target.dataset.optionWarning;
      return;
    }
    if (target) {
      target.dataset.optionWarning = "true";
      status(target, `تعذر تحميل: ${failed.join("، ")}. بقية القوائم متاحة ويمكن إعادة المحاولة.`, "warning");
    }
  }

  function customerOptions(selectId) {
    const node = $(selectId);
    if (!node) return;
    node.innerHTML = '<option value="">اختر العميل</option>' + opts.customers.map(customer =>
      `<option value="${esc(customer.id)}">${esc(customer.customer_name)} — ${esc(customer.phone || "بدون هاتف")}</option>`
    ).join("");
  }

  function quotationOptions(customerId, selectId) {
    const node = $(selectId);
    if (!node) return;
    const quotes = opts.quotations.filter(quotation => !customerId || quotation.customer_id === customerId);
    node.innerHTML = '<option value="">بدون عرض سعر</option>' + quotes.map(quotation =>
      `<option value="${esc(quotation.id)}">${esc(quotation.quotation_number)}</option>`
    ).join("");
  }

  function neighborhoodOptions() {
    const node = $("newInstallationNeighborhoodId");
    if (!node) return;
    node.innerHTML = '<option value="">اختر الحي</option>' + opts.neighborhoods.map(item =>
      `<option value="${esc(item.id)}">${esc(item.name)}</option>`
    ).join("");
  }

  function serviceTypeOptions(selectedId = "") {
    return '<option value="">اختر نوع الخدمة</option>' + opts.serviceTypes.map(item =>
      `<option value="${esc(item.id)}" ${String(item.id) === String(selectedId) ? "selected" : ""}>${esc(item.name)}</option>`
    ).join("");
  }

  function hydrateServiceRows() {
    document.querySelectorAll("#newInstallationServicesBody .installation-service-entry").forEach(row => {
      const select = row.querySelector(".installation-service-type");
      if (!select) return;
      const currentValue = select.value || select.dataset.pendingServiceTypeId || "";
      select.innerHTML = serviceTypeOptions(currentValue);
      if (currentValue && !opts.serviceTypes.some(item => String(item.id) === String(currentValue))) {
        const legacyOption = document.createElement("option");
        legacyOption.value = currentValue;
        legacyOption.textContent = "خدمة محفوظة غير نشطة";
        select.appendChild(legacyOption);
      }
      select.value = currentValue;
      delete select.dataset.pendingServiceTypeId;
    });
  }

  function filtered() {
    const query = ($("installationRequestSearch")?.value || "").trim().toLowerCase();
    const representative = $("installationRequestRepresentativeFilter")?.value || "";
    const state = $("installationRequestStatusFilter")?.value || "";
    const dateFrom = $("installationRequestDateFrom")?.value || "";
    const dateTo = $("installationRequestDateTo")?.value || "";
    return rows.filter(row =>
      (!query || [row.requestNumber, row.customerOrderNumber, row.customerName, row.customerPhone, row.quotationNumber, row.services.map(service => service.serviceName).join(" ")].join(" ").toLowerCase().includes(query)) &&
      (!representative || row.representativeId === representative) &&
      (!state || row.status === state) &&
      (!dateFrom || row.scheduledDate >= dateFrom) &&
      (!dateTo || row.scheduledDate <= dateTo)
    );
  }

  function render() {
    const data = filtered();
    const today = new Date().toISOString().slice(0, 10);
    $("installationKpiTotal").textContent = rows.length;
    $("installationKpiScheduled").textContent = rows.filter(row => ["مجدول", "مسند"].includes(row.status)).length;
    $("installationKpiInProgress").textContent = rows.filter(row => ["في الطريق", "وصل إلى العميل", "قيد التنفيذ"].includes(row.status)).length;
    $("installationKpiOverdue").textContent = rows.filter(row => row.scheduledDate && row.scheduledDate < today && !["مكتمل", "ملغي"].includes(row.status)).length;

    $("installationRequestsBody").innerHTML = data.length ? data.map(row => {
      const serviceSummary = row.services.length
        ? row.services.map(service => `${esc(service.serviceName)} × ${service.quantity}`).join("<br>")
        : "—";
      return `<tr>
        <td>${esc(row.requestNumber)}</td>
        <td>${esc(row.customerOrderNumber || "—")}</td>
        <td><strong>${esc(row.customerName)}</strong><br><small>${esc(row.customerPhone)}</small></td>
        <td>${esc(row.quotationNumber || "بدون عرض سعر")}</td>
        <td>${serviceSummary}</td>
        <td>${money(row.totalServicesAmount)}</td>
        <td>${esc([row.city, row.district].filter(Boolean).join(" - ") || row.installationAddress || "—")}</td>
        <td>${esc(row.scheduledDate || "غير محدد")}</td>
        <td>${esc(row.timeSlot || "—")}</td>
        <td><span class="installation-status-badge" data-status="${esc(row.status)}">${esc(row.status)}</span></td>
        <td><span class="installation-priority-badge" data-priority="${esc(row.priority)}">${esc(row.priority)}</span></td>
        <td>${esc(row.representativeName || "—")}</td>
        <td><div class="installation-row-actions"><button class="secondary-btn" data-install-edit="${row.id}" type="button">تعديل</button><button class="danger-btn" data-install-delete="${row.id}" type="button">حذف</button></div></td>
      </tr>`;
    }).join("") : '<tr><td colspan="13" class="empty-cell">لا توجد طلبات مطابقة.</td></tr>';
  }

  async function ensureOptions(force = false) {
    if (!force && optionsLoaded) {
      hydrateServiceRows();
      return;
    }
    opts = await window.InstallationsServiceSafe.options();
    optionsLoaded = true;
    customerOptions("installationCustomerId");
    quotationOptions("", "installationQuotationId");
    syncCustomerSearch("");
    quotationOptions("", "newInstallationQuotationId");
    neighborhoodOptions();
    hydrateServiceRows();
    reportOptionLoadWarnings(opts);
  }

  async function load() {
    status($("installationRequestsStatus"), "جاري تحميل طلبات التركيبات...");
    try {
      [rows, opts] = await Promise.all([window.InstallationsServiceSafe.list(), window.InstallationsServiceSafe.options()]);
      customerOptions("installationCustomerId");
      reportOptionLoadWarnings(opts);
      const repFilter = $("installationRequestRepresentativeFilter");
      if (repFilter) {
        const current = repFilter.value;
        const reps = [...new Map(rows.filter(row => row.representativeId).map(row => [row.representativeId, row.representativeName || "مندوب بدون اسم"])).entries()];
        repFilter.innerHTML = '<option value="">كل المندوبين المسموحين</option>' + reps.map(([id,name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join('');
        repFilter.value = reps.some(([id]) => id === current) ? current : "";
      }
      render();
      clearStatus($("installationRequestsStatus"));
    } catch (error) {
      status($("installationRequestsStatus"), error.message, "error");
      $("installationRequestsBody").innerHTML = '<tr><td colspan="13" class="empty-cell">تعذر تحميل البيانات.</td></tr>';
    }
  }

  async function openEdit(row) {
    if (!row) return;
    try {
      editingRequestId = row.id;
      await ensureOptions(true);
      const opened = window.KYUMNavigation?.open?.("installationRequestNew", { trustedNavigation: true });
      if (opened === false) throw new Error("ليس لديك صلاحية فتح شاشة بيانات طلب التركيب.");

      quotationOptions(row.customerId, "newInstallationQuotationId");
      neighborhoodOptions();

      $("newInstallationRequestHeading").textContent = "تعديل طلب تركيب";
      $("newInstallationRequestNote").textContent = `عدّل بيانات الطلب ${row.requestNumber} بنفس حقول الإدخال الأصلية دون تغيير بيانات الجدولة أو التنفيذ.`;
      $("saveNewInstallationRequest").textContent = "حفظ التعديلات";
      $("resetNewInstallationRequest").textContent = "استعادة البيانات";

      syncCustomerSearch(row.customerId || "");
      quotationOptions(row.customerId, "newInstallationQuotationId");
      $("newInstallationQuotationId").value = row.quotationId || "";
      $("newInstallationCustomerOrderNumber").value = row.customerOrderNumber || "";
      $("newInstallationNeighborhoodId").value = row.neighborhoodId || "";
      $("newInstallationCustomerMapUrl").value = row.customerMapUrl || "";
      $("newInstallationPriority").value = row.priority || "عادية";
      $("newInstallationNotes").value = row.notes || "";
      $("newInstallationServicesBody").innerHTML = "";
      (row.services?.length ? row.services : [{}]).forEach(addServiceRow);
      recalculateServices();
      clearStatus($("newInstallationRequestFormStatus"));
    } catch (error) {
      editingRequestId = null;
      status($("installationRequestsStatus"), error.message, "error");
    }
  }

  function addServiceRow(initial = {}) {
    const body = $("newInstallationServicesBody");
    if (!body) return;
    const row = document.createElement("tr");
    row.className = "installation-service-entry";
    row.innerHTML = `
      <td><select class="installation-service-type" required data-pending-service-type-id="${esc(initial.serviceTypeId || "")}">${serviceTypeOptions(initial.serviceTypeId || "")}</select></td>
      <td><input class="installation-service-quantity" type="number" min="1" step="1" value="${esc(initial.quantity || 1)}" required></td>
      <td><input class="installation-service-price" type="number" min="0" step="0.01" value="${esc(initial.unitPrice ?? 0)}" required></td>
      <td><output class="installation-service-line-total">${money((initial.quantity || 1) * (initial.unitPrice || 0))}</output></td>
      <td><button type="button" class="danger-btn installation-service-remove">حذف</button></td>`;
    body.appendChild(row);
    if (optionsLoaded) hydrateServiceRows();
    recalculateServices();
  }

  function recalculateServices() {
    let quantity = 0;
    let total = 0;
    document.querySelectorAll("#newInstallationServicesBody .installation-service-entry").forEach(row => {
      const qty = Math.max(0, Number(row.querySelector(".installation-service-quantity")?.value || 0));
      const price = Math.max(0, Number(row.querySelector(".installation-service-price")?.value || 0));
      const lineTotal = qty * price;
      quantity += qty;
      total += lineTotal;
      const output = row.querySelector(".installation-service-line-total");
      if (output) output.textContent = money(lineTotal);
    });
    $("newInstallationTotalQuantity").textContent = String(quantity);
    $("newInstallationGrandTotal").textContent = money(total);
  }

  function collectServices() {
    return [...document.querySelectorAll("#newInstallationServicesBody .installation-service-entry")].map(row => ({
      serviceTypeId: row.querySelector(".installation-service-type")?.value || "",
      quantity: Number(row.querySelector(".installation-service-quantity")?.value || 0),
      unitPrice: Number(row.querySelector(".installation-service-price")?.value || 0)
    }));
  }

  function restoreEditForm() {
    const row = rows.find(item => item.id === editingRequestId);
    if (row) return openEdit(row);
  }

  function resetNewForm(options = {}) {
    const form = $("newInstallationRequestForm");
    if (!form) return;
    if (editingRequestId && !options.exitEdit) return restoreEditForm();
    editingRequestId = null;
    form.reset();
    quotationOptions("", "newInstallationQuotationId");
    neighborhoodOptions();
    $("newInstallationServicesBody").innerHTML = "";
    addServiceRow();
    $("newInstallationRequestHeading").textContent = "طلب تركيب جديد";
    $("newInstallationRequestNote").textContent = "سجّل بيانات العميل والخدمات المطلوبة. ينتقل الطلب بعد الحفظ إلى طلبات التركيبات بحالة بانتظار المراجعة.";
    $("saveNewInstallationRequest").textContent = "حفظ الطلب";
    $("resetNewInstallationRequest").textContent = "إعادة تعيين";
    clearStatus($("newInstallationRequestFormStatus"));
  }

  function syncNewRequestPermissionState() {
    const button = $("saveNewInstallationRequest");
    if (!button) return false;
    const isEditing = Boolean(editingRequestId);
    const screenKey = isEditing ? "installationRequests" : "installationRequestNew";
    const action = isEditing ? "edit" : "add";
    const engine = window.PermissionEngine;
    const loaded = engine?.isLoaded?.() === true || window.CustomerPermissions?.permissionsLoaded === true || window.CustomerPermissions?.currentRole?.() === "super_admin";
    const allowed = loaded && (engine?.can?.(screenKey, action) === true || window.CustomerPermissions?.canScreen?.(screenKey, action) === true);

    button.hidden = false;
    button.classList.remove("hidden");
    button.setAttribute("aria-hidden", "false");
    button.disabled = !allowed;
    button.setAttribute("aria-disabled", String(!allowed));
    button.title = allowed ? "" : (loaded ? "لا توجد صلاحية حفظ طلب تركيب." : "جارٍ تحميل الصلاحيات...");

    if (loaded && !allowed) {
      status($("newInstallationRequestFormStatus"), isEditing
        ? "لا توجد صلاحية تعديل طلبات التركيبات."
        : "لا توجد صلاحية إضافة طلب تركيب. راجع صلاحيات شاشة طلب تركيب جديد.", "warning");
    }
    return allowed;
  }

  async function initializeNewView() {
    try {
      await ensureOptions();
      if (!editingRequestId) {
        resetNewForm({ exitEdit: true });
      } else {
        quotationOptions($("newInstallationCustomerId")?.value || "", "newInstallationQuotationId");
        neighborhoodOptions();
        hydrateServiceRows();
      }
      if (!opts.serviceTypes.length) status($("newInstallationRequestFormStatus"), "لا توجد خدمات نشطة في البيانات المرجعية. أضف أنواع الخدمات أولًا قبل إنشاء الطلب.", "warning");
      syncNewRequestPermissionState();
    } catch (error) {
      status($("newInstallationRequestFormStatus"), error.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("kyum-installation-edit-request", async event => {
      const id = event.detail?.id;
      if (!id) return;
      if (!rows.length) await load();
      const row = rows.find(item => item.id === id);
      if (row) await openEdit(row);
    });

    window.addEventListener("kyum-permissions-refreshed", () => syncNewRequestPermissionState());
    window.addEventListener("kyum-permission-engine-ready", () => syncNewRequestPermissionState());

    window.addEventListener("kyum-view-changed", event => {
      if (event.detail?.view === "installationRequests") load();
      if (event.detail?.view === "installationRequestNew") {
        initializeNewView();
      }
    });

    $("newInstallationCustomerSearch")?.addEventListener("focus", event => renderCustomerResults(event.target.value));
    $("newInstallationCustomerSearch")?.addEventListener("input", event => {
      $("newInstallationCustomerId").value = "";
      event.target.setCustomValidity("");
      renderCustomerResults(event.target.value);
      quotationOptions("", "newInstallationQuotationId");
    });
    $("newInstallationCustomerResults")?.addEventListener("click", event => {
      const option = event.target.closest("[data-installation-customer-id]");
      if (!option) return;
      syncCustomerSearch(option.dataset.installationCustomerId);
      quotationOptions(option.dataset.installationCustomerId, "newInstallationQuotationId");
      closeCustomerResults();
    });
    document.addEventListener("click", event => {
      if (!event.target.closest(".installation-customer-combobox")) closeCustomerResults();
    });

    ["installationRequestSearch", "installationRequestRepresentativeFilter", "installationRequestStatusFilter", "installationRequestDateFrom", "installationRequestDateTo"].forEach(id => $(id)?.addEventListener("input", render));
    $("resetInstallationRequestFilters")?.addEventListener("click", () => {
      ["installationRequestSearch", "installationRequestRepresentativeFilter", "installationRequestStatusFilter", "installationRequestDateFrom", "installationRequestDateTo"].forEach(id => { if ($(id)) $(id).value = ""; });
      render();
    });

    $("addInstallationServiceRow")?.addEventListener("click", () => addServiceRow());
    $("newInstallationServicesBody")?.addEventListener("input", event => {
      const row = event.target.closest(".installation-service-entry");
      if (event.target.matches(".installation-service-type")) {
        const service = opts.serviceTypes.find(item => item.id === event.target.value);
        if (service && row) row.querySelector(".installation-service-price").value = Number(service.default_price || 0).toFixed(2);
      }
      recalculateServices();
    });
    $("newInstallationServicesBody")?.addEventListener("click", event => {
      const button = event.target.closest(".installation-service-remove");
      if (!button) return;
      const rows = $("newInstallationServicesBody").querySelectorAll(".installation-service-entry");
      if (rows.length === 1) return status($("newInstallationRequestFormStatus"), "يجب أن يحتوي الطلب على خدمة واحدة على الأقل.", "error");
      button.closest(".installation-service-entry").remove();
      recalculateServices();
    });

    $("resetNewInstallationRequest")?.addEventListener("click", resetNewForm);

    $("installationRequestsBody")?.addEventListener("click", async event => {
      const editButton = event.target.closest("[data-install-edit]");
      const deleteButton = event.target.closest("[data-install-delete]");
      if (editButton) openEdit(rows.find(row => row.id === editButton.dataset.installEdit));
      if (deleteButton && confirm("هل تريد حذف طلب التركيب؟")) {
        try {
          await window.InstallationsServiceSafe.remove(deleteButton.dataset.installDelete);
          await load();
        } catch (error) {
          status($("installationRequestsStatus"), error.message, "error");
        }
      }
    });

    $("newInstallationRequestForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      clearStatus($("newInstallationRequestFormStatus"));
      if (!syncNewRequestPermissionState()) return;
      const customer = opts.customers.find(item => item.id === $("newInstallationCustomerId").value);
      const neighborhood = opts.neighborhoods.find(item => item.id === $("newInstallationNeighborhoodId").value);
      const services = collectServices();
      const payload = {
        customerId: $("newInstallationCustomerId").value,
        quotationId: $("newInstallationQuotationId").value || null,
        representativeId: customer?.representative_id || null,
        neighborhoodId: $("newInstallationNeighborhoodId").value,
        installationAddress: neighborhood?.name || "",
        customerOrderNumber: $("newInstallationCustomerOrderNumber").value.trim(),
        customerMapUrl: $("newInstallationCustomerMapUrl").value.trim(),
        priority: $("newInstallationPriority").value,
        notes: $("newInstallationNotes").value.trim(),
        services
      };
      if (!payload.customerId) return status($("newInstallationRequestFormStatus"), "اختر العميل.", "error");
      if (!payload.neighborhoodId) return status($("newInstallationRequestFormStatus"), "اختر العنوان.", "error");
      if (!services.length || services.some(service => !service.serviceTypeId || !Number.isInteger(service.quantity) || service.quantity < 1 || !Number.isFinite(service.unitPrice) || service.unitPrice < 0)) {
        return status($("newInstallationRequestFormStatus"), "راجع نوع الخدمة والعدد والسعر في جميع الخدمات.", "error");
      }
      const button = $("saveNewInstallationRequest");
      button.disabled = true;
      try {
        if (editingRequestId) {
          await window.InstallationsServiceSafe.updateRequest({ ...payload, id: editingRequestId });
          const requestNumber = rows.find(item => item.id === editingRequestId)?.requestNumber || "";
          status($("newInstallationRequestFormStatus"), `تم حفظ تعديلات الطلب ${requestNumber}.`, "success");
          editingRequestId = null;
          await load();
          window.KYUMNavigation?.open?.("installationRequests", { trustedNavigation: true });
        } else {
          const created = await window.InstallationsServiceSafe.createRequest(payload);
          status($("newInstallationRequestFormStatus"), `تم إنشاء الطلب ${created.request_number || ""} وإرساله إلى طلبات التركيبات بانتظار المراجعة.`, "success");
          resetNewForm({ exitEdit: true });
        }
      } catch (error) {
        status($("newInstallationRequestFormStatus"), error.message, "error");
      } finally {
        syncNewRequestPermissionState();
      }
    });

;
  });
})();
