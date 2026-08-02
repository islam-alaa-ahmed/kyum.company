(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const money = value => `SAR ${Number(value || 0).toFixed(2)}`;

  let rows = [];
  let opts = { customers: [], quotations: [], neighborhoods: [], serviceTypes: [] };

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
      `<option value="${esc(item.id)}" ${item.id === selectedId ? "selected" : ""}>${esc(item.name)}</option>`
    ).join("");
  }

  function filtered() {
    const query = ($("installationRequestSearch")?.value || "").trim().toLowerCase();
    const representative = $("installationRequestRepresentativeFilter")?.value || "";
    const state = $("installationRequestStatusFilter")?.value || "";
    const dateFrom = $("installationRequestDateFrom")?.value || "";
    const dateTo = $("installationRequestDateTo")?.value || "";
    return rows.filter(row =>
      (!query || [row.requestNumber, row.customerName, row.customerPhone, row.quotationNumber, row.services.map(service => service.serviceName).join(" ")].join(" ").toLowerCase().includes(query)) &&
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
    }).join("") : '<tr><td colspan="12" class="empty-cell">لا توجد طلبات مطابقة.</td></tr>';
  }

  async function ensureOptions(force = false) {
    if (!force && opts.customers.length) return;
    opts = await window.InstallationsService.options();
    customerOptions("installationCustomerId");
    customerOptions("newInstallationCustomerId");
    quotationOptions("", "installationQuotationId");
    quotationOptions("", "newInstallationQuotationId");
    neighborhoodOptions();
  }

  async function load() {
    status($("installationRequestsStatus"), "جاري تحميل طلبات التركيبات...");
    try {
      [rows, opts] = await Promise.all([window.InstallationsService.list(), window.InstallationsService.options()]);
      customerOptions("installationCustomerId");
      customerOptions("newInstallationCustomerId");
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
      $("installationRequestsBody").innerHTML = '<tr><td colspan="12" class="empty-cell">تعذر تحميل البيانات.</td></tr>';
    }
  }

  function openEdit(row) {
    if (!row) return;
    $("installationRequestForm").reset();
    clearStatus($("installationRequestFormStatus"));
    $("installationRequestId").value = row.id;
    $("installationRequestDialogTitle").textContent = "تعديل طلب التركيب";
    $("installationCustomerId").value = row.customerId;
    quotationOptions(row.customerId, "installationQuotationId");
    $("installationQuotationId").value = row.quotationId || "";
    $("installationScheduledDate").value = row.scheduledDate;
    $("installationTimeSlot").value = row.timeSlot;
    $("installationStatus").value = row.status;
    $("installationPriority").value = row.priority;
    $("installationAddress").value = row.installationAddress;
    $("installationDescription").value = row.description;
    $("installationNotes").value = row.notes;
    $("installationRequestDialog").showModal();
  }

  function addServiceRow(initial = {}) {
    const body = $("newInstallationServicesBody");
    if (!body) return;
    const row = document.createElement("tr");
    row.className = "installation-service-entry";
    row.innerHTML = `
      <td><select class="installation-service-type" required>${serviceTypeOptions(initial.serviceTypeId || "")}</select></td>
      <td><input class="installation-service-quantity" type="number" min="1" step="1" value="${esc(initial.quantity || 1)}" required></td>
      <td><input class="installation-service-price" type="number" min="0" step="0.01" value="${esc(initial.unitPrice ?? 0)}" required></td>
      <td><output class="installation-service-line-total">${money((initial.quantity || 1) * (initial.unitPrice || 0))}</output></td>
      <td><button type="button" class="danger-btn installation-service-remove">حذف</button></td>`;
    body.appendChild(row);
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

  function resetNewForm() {
    const form = $("newInstallationRequestForm");
    if (!form) return;
    form.reset();
    quotationOptions("", "newInstallationQuotationId");
    neighborhoodOptions();
    $("newInstallationServicesBody").innerHTML = "";
    addServiceRow();
    clearStatus($("newInstallationRequestFormStatus"));
  }

  async function initializeNewView() {
    try {
      await ensureOptions();
      customerOptions("newInstallationCustomerId");
      quotationOptions($("newInstallationCustomerId")?.value || "", "newInstallationQuotationId");
      neighborhoodOptions();
      if (!$("newInstallationServicesBody")?.children.length) addServiceRow();
      if (!opts.serviceTypes.length) status($("newInstallationRequestFormStatus"), "لا توجد خدمات نشطة في البيانات المرجعية. أضف أنواع الخدمات أولًا قبل إنشاء الطلب.", "warning");
    } catch (error) {
      status($("newInstallationRequestFormStatus"), error.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("kyum-view-changed", event => {
      if (event.detail?.view === "installationRequests") load();
      if (event.detail?.view === "installationRequestNew") initializeNewView();
    });

    $("closeInstallationRequestDialog")?.addEventListener("click", () => $("installationRequestDialog").close());
    $("cancelInstallationRequest")?.addEventListener("click", () => $("installationRequestDialog").close());

    $("installationCustomerId")?.addEventListener("change", () => quotationOptions($("installationCustomerId").value, "installationQuotationId"));
    $("newInstallationCustomerId")?.addEventListener("change", () => quotationOptions($("newInstallationCustomerId").value, "newInstallationQuotationId"));

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
          await window.InstallationsService.remove(deleteButton.dataset.installDelete);
          await load();
        } catch (error) {
          status($("installationRequestsStatus"), error.message, "error");
        }
      }
    });

    $("newInstallationRequestForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      clearStatus($("newInstallationRequestFormStatus"));
      const customer = opts.customers.find(item => item.id === $("newInstallationCustomerId").value);
      const neighborhood = opts.neighborhoods.find(item => item.id === $("newInstallationNeighborhoodId").value);
      const services = collectServices();
      const payload = {
        customerId: $("newInstallationCustomerId").value,
        quotationId: $("newInstallationQuotationId").value || null,
        representativeId: customer?.representative_id || null,
        neighborhoodId: $("newInstallationNeighborhoodId").value,
        installationAddress: neighborhood?.name || "",
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
        const created = await window.InstallationsService.createRequest(payload);
        status($("newInstallationRequestFormStatus"), `تم إنشاء الطلب ${created.request_number || ""} وإرساله إلى طلبات التركيبات بانتظار المراجعة.`, "success");
        resetNewForm();
      } catch (error) {
        status($("newInstallationRequestFormStatus"), error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    $("installationRequestForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      const customer = opts.customers.find(item => item.id === $("installationCustomerId").value);
      const payload = {
        id: $("installationRequestId").value,
        customerId: $("installationCustomerId").value,
        quotationId: $("installationQuotationId").value || null,
        representativeId: customer?.representative_id || null,
        scheduledDate: $("installationScheduledDate").value,
        timeSlot: $("installationTimeSlot").value,
        status: $("installationStatus").value,
        priority: $("installationPriority").value,
        installationAddress: $("installationAddress").value.trim(),
        description: $("installationDescription").value.trim(),
        notes: $("installationNotes").value.trim()
      };
      if (!payload.customerId) return status($("installationRequestFormStatus"), "اختر العميل.", "error");
      const button = $("saveInstallationRequest");
      button.disabled = true;
      try {
        await window.InstallationsService.save(payload);
        $("installationRequestDialog").close();
        await load();
      } catch (error) {
        status($("installationRequestFormStatus"), error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
  });
})();
