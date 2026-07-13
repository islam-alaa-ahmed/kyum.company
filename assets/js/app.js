
const STORAGE_KEY = "customer_management_v1_customers";
const FOLLOWUPS_STORAGE_KEY = "customer_management_v1_followups";
const QUOTATIONS_STORAGE_KEY = "customer_management_v1_quotations";

let interestRecords = [];
let reasonRecords = [];
let representativeRecords = [];

let interests = [];
let noSaleReasons = [];
let representatives = [];

let referenceDataLoaded = false;
let referenceDataLoading = false;
let editingRepresentativeId = null;
let editingReferenceItemId = null;

const seedCustomers = [
  {
    id: "C000001",
    name: "شركة النور للتجارة",
    type: "شركة",
    phone: "0501234567",
    city: "الرياض",
    interests: ["مكيفات", "تبريد"],
    representative: "أحمد محمد",
    contactDate: "2026-07-10",
    quotationNumber: "Q-2026-001",
    noSaleReason: "القرار مؤجل",
    notes: "متابعة العميل خلال الأسبوع القادم."
  },
  {
    id: "C000002",
    name: "مؤسسة الصفوة للحوم",
    type: "شركة",
    phone: "0557654321",
    city: "جدة",
    interests: ["ثلاجات لحوم"],
    representative: "محمد علي",
    contactDate: "2026-07-09",
    quotationNumber: "Q-2026-002",
    noSaleReason: "السعر مرتفع",
    notes: "طلب مراجعة السعر."
  },
  {
    id: "C000003",
    name: "عبدالله سالم",
    type: "فردي",
    phone: "0531112233",
    city: "الدمام",
    interests: ["أجهزة منزلية"],
    representative: "خالد حسن",
    contactDate: "2026-07-08",
    quotationNumber: "",
    noSaleReason: "لم يتم التواصل بعد",
    notes: ""
  }
];


const seedFollowups = [
  {
    id: "F000001",
    customerId: "C000001",
    contactDate: "2026-07-10",
    method: "اتصال",
    representative: "أحمد محمد",
    result: "تفاوض",
    quotationNumber: "Q-2026-001",
    noSaleReason: "القرار مؤجل",
    nextFollowupDate: "2026-07-15",
    completed: false,
    notes: "العميل طلب مراجعة التفاصيل الفنية."
  },
  {
    id: "F000002",
    customerId: "C000002",
    contactDate: "2026-07-09",
    method: "واتساب",
    representative: "محمد علي",
    result: "تم إرسال عرض سعر",
    quotationNumber: "Q-2026-002",
    noSaleReason: "السعر مرتفع",
    nextFollowupDate: "2026-07-12",
    completed: false,
    notes: "تم إرسال العرض وينتظر الرد."
  }
];


const seedQuotations = [
  {
    id: "QID000001",
    code: "Q-2026-001",
    customerId: "C000001",
    representative: "أحمد محمد",
    quotationDate: "2026-07-10",
    amount: 18500,
    status: "تحت المراجعة",
    expiryDate: "2026-07-25",
    rejectionReason: "",
    description: "عرض توريد وتركيب نظام تكييف.",
    notes: "بانتظار موافقة الإدارة."
  },
  {
    id: "QID000002",
    code: "Q-2026-002",
    customerId: "C000002",
    representative: "محمد علي",
    quotationDate: "2026-07-09",
    amount: 32000,
    status: "مرفوض",
    expiryDate: "2026-07-20",
    rejectionReason: "السعر مرتفع",
    description: "ثلاجة لحوم تجارية.",
    notes: "طلب العميل مراجعة السعر."
  }
];

let customers = [];
let customersLoaded = false;
let customersLoading = false;
let customersPage = 1;
const CUSTOMERS_PAGE_SIZE = 10;
let followups = [];
let followupsLoaded = false;
let followupsLoading = false;
let followupsPage = 1;
const FOLLOWUPS_PAGE_SIZE = 10;
let quotations = [];
let quotationsLoaded = false;
let quotationsLoading = false;
let quotationsPage = 1;
const QUOTATIONS_PAGE_SIZE = 10;
let userRecords = [];
let usersLoaded = false;
let usersLoading = false;
let editingUserId = null;
let permissionScreens = [];
let rolePermissionRows = [];
let permissionsLoaded = false;
let activityRecords = [];
let activityLoaded = false;
let selectedBackupPayload = null;
let backupHistoryRecords = [];
let backupHistoryLoaded = false;
let systemSettingsLoaded = false;
let systemHealthSnapshot = null;
let latestDiagnosticsReport = null;
let diagnosticsRunning = false;
let currentReportsSnapshot = null;
let customer360ActivityFilter = "all";
let currentCustomer360View = null;
let activeCustomerAnalyticsTab = "types";
let systemHealthLoading = false;
let systemHealthTimer = null;


let editingId = null;
let editingFollowupId = null;
let editingQuotationId = null;

const views = {
  dashboard: document.getElementById("dashboardView"),
  customers: document.getElementById("customersView"),
  followups: document.getElementById("followupsView"),
  quotations: document.getElementById("quotationsView"),
  representatives: document.getElementById("representativesView"),
  settings: document.getElementById("settingsView"),
  users: document.getElementById("usersView"),
  permissions: document.getElementById("permissionsView"),
  activityLog: document.getElementById("activityLogView"),
  backups: document.getElementById("backupsView"),
  systemHealth: document.getElementById("systemHealthView"),
  reportsOverview: document.getElementById("reportsOverviewView"),
  systemSettings: document.getElementById("systemSettingsView")
};

const pageMeta = {
  dashboard: ["لوحة التحكم", "ملخص بيانات العملاء والمتابعة"],
  customers: ["العملاء", "إدارة بيانات العملاء والبحث والتصفية"],
  followups: ["المتابعات", "سجل التواصل والمتابعات القادمة لكل عميل"],
  quotations: ["عروض الأسعار", "إدارة عروض الأسعار وحالتها وقيمتها"],
  representatives: ["مندوبو المبيعات", "قائمة مسؤولي متابعة العملاء"],
  settings: ["البيانات المرجعية", "مجالات الاهتمام وأسباب عدم البيع"],
  users: ["المستخدمون", "إدارة حسابات مستخدمي النظام"],
  permissions: ["الصلاحيات", "إدارة الأدوار وصلاحيات الوصول"],
  activityLog: ["سجل النشاط", "متابعة العمليات والتغييرات داخل النظام"],
  backups: ["النسخ الاحتياطي", "التصدير والاستعادة وحماية البيانات"],
  systemHealth: ["مراقبة النظام", "الحالة الصحية والأمان والأداء التشغيلي"],
  reportsOverview: ["مركز التقارير", "تحليلات العملاء والمتابعات والعروض وأداء المندوبين"],
  systemSettings: ["إعدادات النظام", "الخيارات العامة وبيانات الشركة"]
};

function loadCustomers() {
  return [];
}



function loadQuotations() {
  return [];
}

function saveQuotations() {
  // Quotations use Supabase as the only production data source from Phase 10.
}

function nextQuotationCode() {
  const year = new Date().getFullYear();
  const max = quotations.reduce((highest, item) => {
    const match = String(item.code).match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(highest, value);
  }, 0);
  return `Q-${year}-${String(max + 1).padStart(3, "0")}`;
}

function quotationStatusClass(status) {
  return {
    "تحت التجهيز": "draft",
    "تم الإرسال": "sent",
    "تحت المراجعة": "review",
    "مقبول": "accepted",
    "مرفوض": "rejected",
    "ملغي": "cancelled"
  }[status] || "draft";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}


function loadFollowups() {
  return [];
}

function saveFollowups() {
  // Follow-ups use Supabase as the only production data source from Phase 09.
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function followupStatus(item) {
  if (item.completed) return "completed";
  if (!item.nextFollowupDate) return "upcoming";
  const today = todayIso();
  if (item.nextFollowupDate === today) return "today";
  if (item.nextFollowupDate < today) return "overdue";
  return "upcoming";
}

function statusLabel(status) {
  return {
    today: "اليوم",
    overdue: "متأخرة",
    upcoming: "قادمة",
    completed: "مكتملة"
  }[status] || status;
}

function saveCustomers() {
  // Customers use Supabase as the only production data source from Phase 08.
}


function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");

  if (phone.startsWith("00966")) phone = phone.slice(5);
  else if (phone.startsWith("966")) phone = phone.slice(3);

  if (phone.startsWith("5") && phone.length === 9) {
    phone = `0${phone}`;
  }

  return phone;
}

function isValidSaudiMobile(value) {
  return /^05\d{8}$/.test(normalizePhone(value));
}

async function findCustomerByPhone(phone, excludeId = null) {
  const normalized = normalizePhone(phone);
  return window.CustomersService.findByPhone(normalized, excludeId);
}

function nextCustomerId() {
  const max = customers.reduce((highest, customer) => {
    const value = Number(String(customer.id).replace(/\D/g, "")) || 0;
    return Math.max(highest, value);
  }, 0);
  return `C${String(max + 1).padStart(6, "0")}`;
}

function replaceSelectOptions(select, options, placeholder = null, selectedValue = null) {
  if (!select) return;
  select.innerHTML = "";
  if (placeholder) select.add(new Option(placeholder, ""));
  options.forEach(option => select.add(new Option(option.label, option.value)));
  if (selectedValue !== null && [...select.options].some(option => option.value === selectedValue)) {
    select.value = selectedValue;
  }
}

function refreshReferenceOptions() {
  interests = interestRecords.filter(item => item.is_active).map(item => item.name);
  noSaleReasons = reasonRecords.filter(item => item.is_active).map(item => item.name);
  representatives = representativeRecords
    .filter(item => item.is_active)
    .map(item => ({
      id: item.representative_code,
      uuid: item.id,
      name: item.full_name,
      phone: item.phone || "",
      email: item.email || ""
    }));

  const current = {
    interestFilter: document.getElementById("interestFilter")?.value || "",
    repFilter: document.getElementById("repFilter")?.value || "",
    followupRepFilter: document.getElementById("followupRepFilter")?.value || "",
    quotationRepFilter: document.getElementById("quotationRepFilter")?.value || "",
    dashboardRepFilter: document.getElementById("dashboardRepFilter")?.value || "",
    dashboardInterestFilter: document.getElementById("dashboardInterestFilter")?.value || ""
  };

  replaceSelectOptions(
    document.getElementById("interestFilter"),
    interests.map(value => ({ label: value, value })),
    "كل مجالات الاهتمام",
    current.interestFilter
  );

  replaceSelectOptions(
    document.getElementById("customerInterest"),
    interestRecords
      .filter(item => item.is_active)
      .map(item => ({ label: item.name, value: item.id }))
  );

  ["repFilter", "followupRepFilter", "quotationRepFilter", "dashboardRepFilter"].forEach(id => {
    const labels = {
      repFilter: "كل المندوبين",
      followupRepFilter: "كل المندوبين",
      quotationRepFilter: "كل المندوبين",
      dashboardRepFilter: "كل المندوبين"
    };
    replaceSelectOptions(
      document.getElementById(id),
      representatives.map(rep => ({ label: rep.name, value: rep.name })),
      labels[id],
      current[id]
    );
  });

  const authProfile = window.CustomerAuth?.getState?.().profile;
  const customerRepresentativeOptions = authProfile?.role === "sales_representative"
    ? representatives.filter(rep => rep.uuid === authProfile.representative_id)
    : representatives;

  replaceSelectOptions(
    document.getElementById("customerRepresentative"),
    customerRepresentativeOptions.map(rep => ({ label: rep.name, value: rep.uuid }))
  );
  const followupRepresentativeOptions = authProfile?.role === "sales_representative"
    ? representatives.filter(rep => rep.uuid === authProfile.representative_id)
    : representatives;

  replaceSelectOptions(
    document.getElementById("followupRepresentative"),
    followupRepresentativeOptions.map(rep => ({ label: rep.name, value: rep.uuid }))
  );
  const quotationRepresentativeOptions = authProfile?.role === "sales_representative"
    ? representatives.filter(rep => rep.uuid === authProfile.representative_id)
    : representatives;

  replaceSelectOptions(
    document.getElementById("quotationRepresentative"),
    quotationRepresentativeOptions.map(rep => ({ label: rep.name, value: rep.uuid }))
  );

  replaceSelectOptions(
    document.getElementById("noSaleReason"),
    reasonRecords
      .filter(item => item.is_active)
      .map(item => ({ label: item.name, value: item.id })),
    "بدون سبب",
    ""
  );
  replaceSelectOptions(
    document.getElementById("followupNoSaleReason"),
    reasonRecords
      .filter(item => item.is_active)
      .map(item => ({ label: item.name, value: item.id })),
    "بدون سبب",
    ""
  );
  replaceSelectOptions(
    document.getElementById("quotationRejectionReason"),
    reasonRecords
      .filter(item => item.is_active)
      .map(item => ({ label: item.name, value: item.id })),
    "اختر سبب الرفض",
    ""
  );

  replaceSelectOptions(
    document.getElementById("dashboardInterestFilter"),
    interests.map(value => ({ label: value, value })),
    "كل مجالات الاهتمام",
    current.dashboardInterestFilter
  );

  const customerOptions = customers.map(customer => ({
    label: `${customer.name} — ${customer.phone}`,
    value: customer.id
  }));
  replaceSelectOptions(document.getElementById("followupCustomer"), customerOptions);
  replaceSelectOptions(document.getElementById("quotationCustomer"), customerOptions);

  renderReferenceData();
  renderRepresentatives();
}

function showDataStatus(id, message = "", type = "info") {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.className = message ? `data-status ${type}` : "data-status hidden";
}

async function loadReferenceDataFromSupabase(force = false) {
  if (referenceDataLoading || (referenceDataLoaded && !force)) return;
  if (!window.ReferenceDataService || !window.customerSupabase) return;

  referenceDataLoading = true;
  showDataStatus("referenceDataStatus", "جاري تحميل البيانات المرجعية...", "info");
  showDataStatus("representativesStatus", "جاري تحميل المندوبين...", "info");

  try {
    const [loadedRepresentatives, loadedInterests, loadedReasons] = await Promise.all([
      window.ReferenceDataService.listRepresentatives(true),
      window.ReferenceDataService.listInterests(true),
      window.ReferenceDataService.listReasons(true)
    ]);

    representativeRecords = loadedRepresentatives || [];
    interestRecords = loadedInterests || [];
    reasonRecords = loadedReasons || [];
    referenceDataLoaded = true;
    refreshReferenceOptions();

    showDataStatus("referenceDataStatus", "");
    showDataStatus("representativesStatus", "");
  } catch (error) {
    console.error("Reference data load failed:", error);
    const message = error instanceof Error ? error.message : "تعذر تحميل البيانات.";
    showDataStatus("referenceDataStatus", message, "error");
    showDataStatus("representativesStatus", message, "error");
  } finally {
    referenceDataLoading = false;
  }
}

function setOptions() {
  refreshReferenceOptions();
}

function switchView(name) {
  const viewRenderStartedAt = performance.now();
  if (name !== "systemHealth") stopSystemHealthAutoRefresh();
  Object.entries(views).forEach(([key, element]) => element.classList.toggle("hidden", key !== name));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));

  const activeNavItem = document.querySelector(`.nav-item[data-view="${name}"]`);
  const activeGroup = activeNavItem?.closest(".nav-group");
  if (activeGroup) {
    activeGroup.classList.remove("is-collapsed");
    activeGroup.querySelector(".nav-group-toggle")?.setAttribute("aria-expanded", "true");
    localStorage.setItem(`kyum-nav-group-${activeGroup.dataset.navGroup}`, "open");
  }

  if (name === "users") {
    populateSecurityOptions();
    loadUsersFromSupabase();
    renderUsers();
  }
  if (name === "permissions") {
    populateSecurityOptions();
    loadPermissionsMatrix();
  }
  if (name === "activityLog") {
    loadActivity();
  }

  if (name === "backups") {
    loadBackupHistory();
  }
  if (name === "systemHealth") {
    loadSystemHealth(true);
    startSystemHealthAutoRefresh();
  }
  if (name === "reportsOverview") {
    ensureReportsData().then(renderReportsOverview);
  }
  if (name === "systemSettings") {
    loadSystemSettings();
  }

  document.getElementById("pageTitle").textContent = pageMeta[name][0];
  requestAnimationFrame(() => {
    window.PerformanceMonitor?.recordRender(
      name,
      performance.now() - viewRenderStartedAt
    );
  });
  document.getElementById("pageSubtitle").textContent = pageMeta[name][1];

  if (name === "dashboard") renderDashboard();
  if (name === "customers") {
    loadCustomersFromSupabase();
    renderCustomers();
  }
  if (name === "followups") {
    loadFollowupsFromSupabase();
    renderFollowups();
  }
  if (name === "quotations") {
    loadQuotationsFromSupabase();
    renderQuotations();
  }
  if (name === "representatives") {
    loadReferenceDataFromSupabase();
    renderRepresentatives();
  }
  if (name === "settings") {
    loadReferenceDataFromSupabase();
    renderReferenceData();
  }
}


function dashboardFilterState() {
  return {
    representative: document.getElementById("dashboardRepFilter")?.value || "",
    type: document.getElementById("dashboardTypeFilter")?.value || "",
    interest: document.getElementById("dashboardInterestFilter")?.value || "",
    from: document.getElementById("dashboardDateFrom")?.value || "",
    to: document.getElementById("dashboardDateTo")?.value || ""
  };
}

function dateInRange(value, from, to) {
  if (!value) return !from && !to;
  return (!from || value >= from) && (!to || value <= to);
}

function dashboardData() {
  const filters = dashboardFilterState();

  const filteredCustomers = customers.filter(customer =>
    (!filters.representative || customer.representative === filters.representative)
    && (!filters.type || customer.type === filters.type)
    && (!filters.interest || customer.interests.includes(filters.interest))
    && dateInRange(customer.contactDate, filters.from, filters.to)
  );

  const allowedCustomerIds = new Set(filteredCustomers.map(customer => customer.id));

  const filteredFollowups = followups.filter(item =>
    allowedCustomerIds.has(item.customerId)
    && (!filters.representative || item.representative === filters.representative)
    && dateInRange(item.contactDate, filters.from, filters.to)
  );

  const filteredQuotations = quotations.filter(item =>
    allowedCustomerIds.has(item.customerId)
    && (!filters.representative || item.representative === filters.representative)
    && dateInRange(item.quotationDate, filters.from, filters.to)
  );

  return { filters, customers: filteredCustomers, followups: filteredFollowups, quotations: filteredQuotations };
}

function renderDashboard() {
  const data = dashboardData();
  const filteredCustomers = data.customers;
  const filteredFollowups = data.followups;
  const filteredQuotations = data.quotations;

  const companies = filteredCustomers.filter(c => c.type === "شركة").length;
  const individuals = filteredCustomers.filter(c => c.type === "فردي").length;
  const dueToday = filteredFollowups.filter(item => followupStatus(item) === "today").length;
  const overdue = filteredFollowups.filter(item => followupStatus(item) === "overdue").length;
  const accepted = filteredQuotations.filter(item => item.status === "مقبول");
  const rejected = filteredQuotations.filter(item => item.status === "مرفوض");
  const totalQuotationValue = filteredQuotations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const acceptedValue = accepted.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const conversionRate = filteredQuotations.length
    ? (accepted.length / filteredQuotations.length) * 100
    : 0;

  const stats = [
    ["إجمالي العملاء", filteredCustomers.length],
    ["عملاء الشركات", companies],
    ["العملاء الأفراد", individuals],
    ["إجمالي المتابعات", filteredFollowups.length],
    ["متابعات اليوم", dueToday],
    ["متابعات متأخرة", overdue],
    ["عدد عروض الأسعار", filteredQuotations.length],
    ["قيمة العروض", formatCurrency(totalQuotationValue)],
    ["العروض المقبولة", accepted.length],
    ["قيمة المقبول", formatCurrency(acceptedValue)],
    ["العروض المرفوضة", rejected.length],
    ["نسبة التحويل", `${conversionRate.toFixed(1)}%`]
  ];

  document.getElementById("statsGrid").innerHTML = stats
    .map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");

  const periodText = data.filters.from || data.filters.to
    ? `الفترة: ${data.filters.from ? formatDate(data.filters.from) : "البداية"} — ${data.filters.to ? formatDate(data.filters.to) : "اليوم"}`
    : "الفترة: جميع البيانات";
  document.getElementById("dashboardPeriodLabel").textContent = periodText;

  renderRepresentativePerformance(data);
  renderInterestAnalytics(filteredCustomers);
  renderQuotationStatusAnalytics(filteredQuotations);
  renderNoSaleReasonAnalytics(filteredCustomers, filteredQuotations);
  renderActivityTrend(data);

  const latest = [...filteredCustomers]
    .sort((a, b) => String(b.contactDate).localeCompare(String(a.contactDate)))
    .slice(0, 5);

  document.getElementById("recentCustomers").innerHTML = latest.length
    ? `<div class="simple-list">${latest.map(c => `
        <div class="simple-item">
          <div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.phone)} · ${escapeHtml(c.representative)}</span></div>
          <span>${formatDate(c.contactDate)}</span>
        </div>`).join("")}</div>`
    : `<div class="empty-state">لا توجد بيانات عملاء ضمن الفلاتر.</div>`;

  const attention = filteredFollowups
    .filter(item => ["today", "overdue"].includes(followupStatus(item)))
    .sort((a, b) => String(a.nextFollowupDate).localeCompare(String(b.nextFollowupDate)))
    .slice(0, 6);

  document.getElementById("attentionFollowups").innerHTML = attention.length
    ? `<div class="simple-list">${attention.map(item => {
        const customer = customerById(item.customerId);
        const status = followupStatus(item);
        return `
          <div class="attention-item ${status === "overdue" ? "overdue" : ""}">
            <div>
              <strong>${escapeHtml(customer?.name || "عميل غير معروف")}</strong>
              <span>${escapeHtml(item.representative)} · ${escapeHtml(item.result)}</span>
            </div>
            <span>${statusLabel(status)} · ${formatDate(item.nextFollowupDate)}</span>
          </div>`;
      }).join("")}</div>`
    : `<div class="empty-state">لا توجد متابعات تحتاج انتباهًا حاليًا.</div>`;
}

function renderRepresentativePerformance(data) {
  const rows = representatives.map(rep => {
    const repCustomers = data.customers.filter(c => c.representative === rep.name);
    const repFollowups = data.followups.filter(f => f.representative === rep.name);
    const repQuotations = data.quotations.filter(q => q.representative === rep.name);
    const accepted = repQuotations.filter(q => q.status === "مقبول");
    const conversion = repQuotations.length ? (accepted.length / repQuotations.length) * 100 : 0;
    const quotationValue = repQuotations.reduce((sum, q) => sum + Number(q.amount || 0), 0);

    return {
      name: rep.name,
      customers: repCustomers.length,
      followups: repFollowups.length,
      quotations: repQuotations.length,
      quotationValue,
      conversion
    };
  }).filter(row => row.customers || row.followups || row.quotations);

  document.getElementById("representativePerformance").innerHTML = rows.length
    ? rows.map(row => `
      <article class="performance-card">
        <div class="performance-card-head">
          <strong>${escapeHtml(row.name)}</strong>
          <span>نسبة التحويل ${row.conversion.toFixed(1)}%</span>
        </div>
        <div class="performance-metrics">
          <div class="performance-metric"><span>العملاء</span><strong>${row.customers}</strong></div>
          <div class="performance-metric"><span>المتابعات</span><strong>${row.followups}</strong></div>
          <div class="performance-metric"><span>العروض</span><strong>${row.quotations}</strong></div>
          <div class="performance-metric"><span>قيمة العروض</span><strong>${formatCurrency(row.quotationValue)}</strong></div>
          <div class="performance-metric"><span>التحويل</span><strong>${row.conversion.toFixed(1)}%</strong></div>
        </div>
      </article>`).join("")
    : `<div class="empty-state">لا توجد بيانات أداء ضمن الفلاتر.</div>`;
}

function renderBarChart(containerId, rows) {
  const container = document.getElementById(containerId);
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state">لا توجد بيانات كافية.</div>`;
    return;
  }

  const max = Math.max(1, ...rows.map(row => row.value));
  container.innerHTML = rows.map(row => `
    <div class="chart-row">
      <span class="chart-label">${escapeHtml(row.label)}</span>
      <div class="chart-track"><div class="chart-fill" style="width:${(row.value / max) * 100}%"></div></div>
      <span class="chart-value">${row.value}</span>
    </div>`).join("");
}

function renderInterestAnalytics(filteredCustomers) {
  const rows = interests.map(interest => ({
    label: interest,
    value: filteredCustomers.filter(c => c.interests.includes(interest)).length
  })).filter(row => row.value > 0).sort((a, b) => b.value - a.value);

  renderBarChart("interestAnalytics", rows);
}

function renderQuotationStatusAnalytics(filteredQuotations) {
  const statuses = ["تحت التجهيز", "تم الإرسال", "تحت المراجعة", "مقبول", "مرفوض", "ملغي"];
  const rows = statuses.map(status => ({
    label: status,
    value: filteredQuotations.filter(q => q.status === status).length
  })).filter(row => row.value > 0);

  renderBarChart("quotationStatusAnalytics", rows);
}

function renderNoSaleReasonAnalytics(filteredCustomers, filteredQuotations) {
  const counts = new Map();

  filteredCustomers.forEach(customer => {
    const reason = customer.noSaleReason;
    if (reason && reason !== "لم يتم التواصل بعد") {
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
  });

  filteredQuotations.forEach(quotation => {
    const reason = quotation.rejectionReason;
    if (quotation.status === "مرفوض" && reason) {
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
  });

  const rows = [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  renderBarChart("noSaleReasonAnalytics", rows);
}

function renderActivityTrend(data) {
  const dateMap = new Map();

  function ensureDate(date) {
    if (!date) return null;
    if (!dateMap.has(date)) {
      dateMap.set(date, { customers: 0, followups: 0, quotations: 0 });
    }
    return dateMap.get(date);
  }

  data.customers.forEach(item => {
    const row = ensureDate(item.contactDate);
    if (row) row.customers += 1;
  });
  data.followups.forEach(item => {
    const row = ensureDate(item.contactDate);
    if (row) row.followups += 1;
  });
  data.quotations.forEach(item => {
    const row = ensureDate(item.quotationDate);
    if (row) row.quotations += 1;
  });

  const rows = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  const container = document.getElementById("activityTrend");
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state">لا توجد بيانات زمنية كافية.</div>`;
    return;
  }

  const max = Math.max(1, ...rows.flatMap(([, v]) => [v.customers, v.followups, v.quotations]));
  container.innerHTML = `
    <div class="trend-legend">
      <span>العملاء</span>
      <span>المتابعات</span>
      <span>العروض</span>
    </div>
    <div class="trend-bars">
      ${rows.map(([date, values]) => `
        <div class="trend-day">
          <div class="trend-day-bars">
            <div class="trend-bar" title="العملاء: ${values.customers}" style="height:${Math.max(2, (values.customers / max) * 160)}px"></div>
            <div class="trend-bar followups" title="المتابعات: ${values.followups}" style="height:${Math.max(2, (values.followups / max) * 160)}px"></div>
            <div class="trend-bar quotations" title="العروض: ${values.quotations}" style="height:${Math.max(2, (values.quotations / max) * 160)}px"></div>
          </div>
          <span class="trend-day-label">${formatDate(date)}</span>
        </div>`).join("")}
    </div>`;
}

function roleLabel(role) {
  return window.CustomerPermissions?.roleLabels?.[role] || role;
}

function populateSecurityOptions() {
  const roles = (window.CustomerPermissions?.roleOptions || []).map(role => ({ label: roleLabel(role), value: role }));
  replaceSelectOptions(document.getElementById("userRole"), roles);
  replaceSelectOptions(document.getElementById("usersRoleFilter"), roles, "كل الأدوار", document.getElementById("usersRoleFilter")?.value || "");
  replaceSelectOptions(document.getElementById("permissionsRoleSelect"), roles, null, document.getElementById("permissionsRoleSelect")?.value || "sales_manager");
  replaceSelectOptions(
    document.getElementById("userRepresentative"),
    representativeRecords.map(rep => ({ label: rep.full_name, value: rep.id })),
    "بدون ربط",
    document.getElementById("userRepresentative")?.value || ""
  );
}

async function loadUsersFromSupabase(force = false) {
  if (usersLoading || (usersLoaded && !force) || !window.UsersService) return;
  usersLoading = true;
  showDataStatus("usersStatus", "جاري تحميل المستخدمين...", "info");
  try {
    userRecords = await window.UsersService.listUsers();
    usersLoaded = true;
    showDataStatus("usersStatus", "");
    renderUsers();
  } catch (error) {
    showDataStatus("usersStatus", error.message || "تعذر تحميل المستخدمين.", "error");
  } finally {
    usersLoading = false;
  }
}

function renderUsers() {
  const body = document.getElementById("usersTableBody");
  if (!body) return;
  const search = (document.getElementById("usersSearch")?.value || "").trim().toLowerCase();
  const role = document.getElementById("usersRoleFilter")?.value || "";
  const status = document.getElementById("usersStatusFilter")?.value || "";
  const rows = userRecords.filter(user => {
    const matchesText = !search || `${user.full_name || ""} ${user.email || ""}`.toLowerCase().includes(search);
    const matchesRole = !role || user.role === role;
    const matchesStatus = !status || (status === "active" ? user.is_active : !user.is_active);
    return matchesText && matchesRole && matchesStatus;
  });

  body.innerHTML = rows.length ? rows.map(user => `
    <tr>
      <td><strong>${escapeHtml(user.full_name || "بدون اسم")}</strong></td>
      <td>${escapeHtml(user.email || "—")}</td>
      <td><span class="badge">${escapeHtml(roleLabel(user.role))}</span></td>
      <td>${escapeHtml(user.representative?.full_name || "—")}</td>
      <td><span class="record-status ${user.is_active ? "active" : "inactive"}">${user.is_active ? "نشط" : "غير نشط"}</span></td>
      <td>${user.last_login_at ? new Date(user.last_login_at).toLocaleString("ar-SA") : "لم يسجل الدخول"}</td>
      <td><div class="row-actions"><button class="edit-btn" data-edit-user="${user.id}">تعديل</button><button class="secondary-btn compact-btn" data-reset-password="${user.id}">كلمة مرور مؤقتة</button></div></td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty-state">لا توجد نتائج.</td></tr>`;
}

function openUserDialog(user = null) {
  editingUserId = user?.id || null;
  document.getElementById("userDialogTitle").textContent = user ? "تعديل المستخدم" : "إضافة مستخدم";
  document.getElementById("userFullName").value = user?.full_name || "";
  document.getElementById("userEmail").value = user?.email || "";
  document.getElementById("userEmail").disabled = Boolean(user);
  document.getElementById("userPassword").value = "";
  document.getElementById("userPassword").required = !user;
  document.getElementById("userPasswordLabel").classList.toggle("hidden", Boolean(user));
  document.getElementById("userRole").value = user?.role || "viewer";
  document.getElementById("userRepresentative").value = user?.representative_id || "";
  document.getElementById("userActive").value = String(user?.is_active ?? true);
  document.getElementById("userMustChangePassword").value = String(user?.must_change_password ?? true);
  document.getElementById("userDialog").showModal();
}

function closeUserDialog() {
  document.getElementById("userDialog").close();
  document.getElementById("userForm").reset();
  document.getElementById("userEmail").disabled = false;
  editingUserId = null;
}

async function saveUserForm(event) {
  event.preventDefault();
  const button = event.submitter;
  try {
    if (button) { button.disabled = true; button.textContent = "جاري الحفظ..."; }
    const payload = {
      id: editingUserId,
      fullName: document.getElementById("userFullName").value,
      email: document.getElementById("userEmail").value,
      password: document.getElementById("userPassword").value,
      role: document.getElementById("userRole").value,
      representativeId: document.getElementById("userRepresentative").value || null,
      isActive: document.getElementById("userActive").value === "true",
      mustChangePassword: document.getElementById("userMustChangePassword").value === "true"
    };
    if (editingUserId) await window.UsersService.updateUser(payload);
    else await window.UsersService.createUser(payload);
    closeUserDialog();
    usersLoaded = false;
    await loadUsersFromSupabase(true);
  } catch (error) {
    alert(error.message || "تعذر حفظ المستخدم.");
  } finally {
    if (button) { button.disabled = false; button.textContent = "حفظ المستخدم"; }
  }
}

async function resetUserPassword(userId) {
  const password = prompt("أدخل كلمة مرور مؤقتة من 8 أحرف على الأقل:");
  if (!password) return;
  if (password.length < 8) return alert("كلمة المرور قصيرة.");
  try {
    await window.UsersService.resetPassword(userId, password);
    alert("تم تحديث كلمة المرور المؤقتة.");
  } catch (error) {
    alert(error.message || "تعذر إعادة تعيين كلمة المرور.");
  }
}

async function loadPermissionsMatrix(force = false) {
  if (permissionsLoaded && !force) return;
  showDataStatus("permissionsStatus", "جاري تحميل الصلاحيات...", "info");
  try {
    permissionScreens = await window.PermissionsService.listScreens();
    permissionsLoaded = true;
    await loadRolePermissions(document.getElementById("permissionsRoleSelect")?.value || "sales_manager");
    showDataStatus("permissionsStatus", "");
  } catch (error) {
    showDataStatus("permissionsStatus", error.message || "تعذر تحميل الصلاحيات.", "error");
  }
}

async function loadRolePermissions(role) {
  rolePermissionRows = await window.PermissionsService.getRolePermissions(role);
  renderPermissionsMatrix(role);
}

function renderPermissionsMatrix(role) {
  const container = document.getElementById("permissionsMatrix");
  if (!container) return;
  const map = new Map(rolePermissionRows.map(row => [row.screen_key, row]));
  const groups = [...new Set(permissionScreens.map(screen => screen.group_name))];
  container.innerHTML = groups.map(group => `
    <section class="permission-group"><h4>${escapeHtml(group)}</h4><div class="permission-table">
      <div class="permission-row permission-header"><strong>الشاشة</strong><span>عرض</span><span>إضافة</span><span>تعديل</span><span>حذف</span><span>تصدير</span></div>
      ${permissionScreens.filter(screen => screen.group_name === group).map(screen => {
        const row = map.get(screen.screen_key) || {};
        return `<div class="permission-row" data-screen-key="${screen.screen_key}"><strong>${escapeHtml(screen.screen_name)}</strong>${
          ["can_view","can_add","can_edit","can_delete","can_export"].map(key =>
            `<input type="checkbox" data-permission="${key}" ${(role === "super_admin" || row[key]) ? "checked" : ""} ${role === "super_admin" ? "disabled" : ""}>`
          ).join("")
        }</div>`;
      }).join("")}
    </div></section>`).join("");
}

async function savePermissions() {
  const role = document.getElementById("permissionsRoleSelect").value;
  if (role === "super_admin") return alert("مدير النظام يمتلك كل الصلاحيات تلقائيًا.");
  const rows = [...document.querySelectorAll(".permission-row[data-screen-key]")].map(row => ({
    screenKey: row.dataset.screenKey,
    canView: row.querySelector('[data-permission="can_view"]').checked,
    canAdd: row.querySelector('[data-permission="can_add"]').checked,
    canEdit: row.querySelector('[data-permission="can_edit"]').checked,
    canDelete: row.querySelector('[data-permission="can_delete"]').checked,
    canExport: row.querySelector('[data-permission="can_export"]').checked
  }));
  try {
    await window.PermissionsService.saveRolePermissions(role, rows);
    showDataStatus("permissionsStatus", "تم حفظ الصلاحيات بنجاح.", "success");
  } catch (error) {
    showDataStatus("permissionsStatus", error.message || "تعذر حفظ الصلاحيات.", "error");
  }
}

async function loadActivity(force = false) {
  if (activityLoaded && !force) return;
  showDataStatus("activityStatus", "جاري تحميل سجل النشاط...", "info");
  try {
    activityRecords = await window.ActivityService.listActivity();
    activityLoaded = true;
    showDataStatus("activityStatus", "");
    renderActivity();
  } catch (error) {
    showDataStatus("activityStatus", error.message || "تعذر تحميل سجل النشاط.", "error");
  }
}

function renderActivity() {
  const body = document.getElementById("activityTableBody");
  if (!body) return;
  const search = (document.getElementById("activitySearch")?.value || "").toLowerCase();
  const action = document.getElementById("activityActionFilter")?.value || "";
  const rows = activityRecords.filter(item => {
    const text = `${item.user?.full_name || ""} ${item.user?.email || ""} ${item.action} ${item.entity_type} ${JSON.stringify(item.new_data || {})}`.toLowerCase();
    return (!search || text.includes(search)) && (!action || item.action === action);
  });
  body.innerHTML = rows.length ? rows.map(item => `<tr><td>${escapeHtml(item.user?.full_name || item.user?.email || "مستخدم محذوف")}</td><td><span class="badge">${escapeHtml(item.action)}</span></td><td>${escapeHtml(item.entity_type)}</td><td class="activity-details">${escapeHtml(JSON.stringify(item.new_data || {}))}</td><td>${new Date(item.created_at).toLocaleString("ar-SA")}</td></tr>`).join("") : `<tr><td colspan="5" class="empty-state">لا توجد عمليات مطابقة.</td></tr>`;
}

function canManageBackupAndSettings() {
  return currentRole() === "super_admin";
}

function downloadJsonFile(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function backupOperationLabel(value) {
  return value === "export" ? "تصدير" : value === "restore" ? "استعادة" : value;
}

async function exportBackup() {
  if (!canManageBackupAndSettings()) {
    alert("النسخ الاحتياطي متاح لمدير النظام فقط.");
    return;
  }

  const buttons = [
    document.getElementById("createBackupBtn"),
    document.getElementById("downloadBackupBtn")
  ].filter(Boolean);

  buttons.forEach(button => {
    button.disabled = true;
    button.textContent = "جاري تجهيز النسخة...";
  });

  showDataStatus("backupStatus", "جاري تجميع بيانات النظام...", "info");

  try {
    const result = await window.BackupService.createBackup();
    downloadJsonFile(result.file_name, result.backup);
    showDataStatus(
      "backupStatus",
      `تم إنشاء النسخة وتنزيلها بنجاح — ${result.total_records} سجل.`,
      "success"
    );
    backupHistoryLoaded = false;
    await loadBackupHistory(true);
  } catch (error) {
    showDataStatus("backupStatus", error.message || "تعذر إنشاء النسخة.", "error");
  } finally {
    buttons.forEach((button, index) => {
      button.disabled = false;
      button.textContent = index === 0 ? "إنشاء نسخة احتياطية" : "تصدير وتنزيل";
    });
  }
}

async function inspectBackupFile(file) {
  selectedBackupPayload = null;
  document.getElementById("restoreBackupBtn").disabled = true;

  if (!file) {
    document.getElementById("backupInspectionPanel").classList.add("hidden");
    return;
  }

  showDataStatus("backupStatus", "جاري قراءة وفحص ملف النسخة...", "info");

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const result = await window.BackupService.validateBackup(payload);

    selectedBackupPayload = payload;
    document.getElementById("restoreBackupBtn").disabled = !canManageBackupAndSettings();
    document.getElementById("backupInspectionPanel").classList.remove("hidden");
    document.getElementById("backupInspectionSummary").textContent =
      `الملف صالح — الإصدار ${result.version} — إجمالي ${result.total_records} سجل.`;

    document.getElementById("backupTableCounts").innerHTML =
      Object.entries(result.table_counts)
        .map(([table, count]) => `
          <article><span>${escapeHtml(table)}</span><strong>${count}</strong></article>
        `).join("");

    showDataStatus("backupStatus", "تم التحقق من ملف النسخة بنجاح.", "success");
  } catch (error) {
    document.getElementById("backupInspectionPanel").classList.add("hidden");
    showDataStatus("backupStatus", error.message || "ملف النسخة غير صالح.", "error");
  }
}

async function restoreSelectedBackup() {
  if (!selectedBackupPayload) {
    alert("اختر ملف نسخة احتياطية صالحًا أولًا.");
    return;
  }

  const phrase = prompt('اكتب العبارة التالية للتأكيد:\nRESTORE KYUM DATA');
  if (phrase !== "RESTORE KYUM DATA") {
    alert("لم يتم تنفيذ الاستعادة لأن عبارة التأكيد غير مطابقة.");
    return;
  }

  if (!confirm("سيتم استبدال البيانات التشغيلية الحالية ببيانات النسخة. هل تريد المتابعة؟")) {
    return;
  }

  const button = document.getElementById("restoreBackupBtn");
  button.disabled = true;
  button.textContent = "جاري الاستعادة...";
  showDataStatus("backupStatus", "جاري استعادة البيانات. لا تغلق الصفحة...", "info");

  try {
    const result = await window.BackupService.restoreBackup(
      selectedBackupPayload,
      phrase
    );

    showDataStatus(
      "backupStatus",
      `تمت الاستعادة بنجاح — ${result.total_records} سجل.`,
      "success"
    );

    customersLoaded = false;
    followupsLoaded = false;
    quotationsLoaded = false;
    referenceDataLoaded = false;
    usersLoaded = false;
    backupHistoryLoaded = false;

    await loadReferenceDataFromSupabase(true);
    await loadCustomersFromSupabase(true);
    await loadFollowupsFromSupabase(true);
    await loadQuotationsFromSupabase(true);
    await loadUsersFromSupabase(true);
    await loadBackupHistory(true);
  } catch (error) {
    showDataStatus("backupStatus", error.message || "فشلت استعادة النسخة.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "استعادة النسخة";
  }
}

async function loadBackupHistory(force = false) {
  if (backupHistoryLoaded && !force) return;
  if (!window.BackupService) return;

  try {
    backupHistoryRecords = await window.BackupService.listHistory();
    backupHistoryLoaded = true;
    renderBackupHistory();
  } catch (error) {
    showDataStatus("backupStatus", error.message || "تعذر تحميل سجل النسخ.", "error");
  }
}

function renderBackupHistory() {
  const body = document.getElementById("backupHistoryBody");
  if (!body) return;

  body.innerHTML = backupHistoryRecords.length
    ? backupHistoryRecords.map(item => `
      <tr>
        <td><span class="badge">${escapeHtml(backupOperationLabel(item.operation_type))}</span></td>
        <td>${escapeHtml(item.file_name || "—")}</td>
        <td>${Number(item.total_records || 0)}</td>
        <td>${escapeHtml(item.user?.full_name || item.user?.email || "—")}</td>
        <td><span class="record-status ${item.status === "completed" ? "active" : "inactive"}">${escapeHtml(item.status)}</span></td>
        <td>${new Date(item.created_at).toLocaleString("ar-SA")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="empty-state">لا توجد عمليات نسخ أو استعادة مسجلة.</td></tr>`;
}

async function loadSystemSettings(force = false) {
  if (systemSettingsLoaded && !force) return;
  if (!window.SystemSettingsService) return;

  showDataStatus("systemSettingsStatus", "جاري تحميل الإعدادات...", "info");

  try {
    const settings = await window.SystemSettingsService.loadSettings();

    document.getElementById("companyNameAr").value = settings.company_name_ar || "شركة كيوم للتجارة";
    document.getElementById("companyNameEn").value = settings.company_name_en || "KYUM Company";
    document.getElementById("companyEmail").value = settings.company_email || "";
    document.getElementById("companyPhone").value = settings.company_phone || "";
    document.getElementById("companyAddress").value = settings.company_address || "";
    document.getElementById("systemCurrency").value = settings.currency || "SAR";
    document.getElementById("systemTimezone").value = settings.timezone || "Asia/Riyadh";
    document.getElementById("systemPageSize").value = settings.page_size || "10";
    document.getElementById("systemSessionTimeout").value =
      settings.session_timeout_minutes || "480";

    systemSettingsLoaded = true;
    showDataStatus("systemSettingsStatus", "");
  } catch (error) {
    showDataStatus(
      "systemSettingsStatus",
      error.message || "تعذر تحميل إعدادات النظام.",
      "error"
    );
  }
}

async function saveSystemSettings(event) {
  event?.preventDefault();

  if (!canManageBackupAndSettings()) {
    alert("تعديل إعدادات النظام متاح لمدير النظام فقط.");
    return;
  }

  const button = document.getElementById("saveSystemSettingsBtn");
  button.disabled = true;
  button.textContent = "جاري الحفظ...";

  try {
    const settings = {
      company_name_ar: document.getElementById("companyNameAr").value.trim(),
      company_name_en: document.getElementById("companyNameEn").value.trim(),
      company_email: document.getElementById("companyEmail").value.trim(),
      company_phone: document.getElementById("companyPhone").value.trim(),
      company_address: document.getElementById("companyAddress").value.trim(),
      currency: document.getElementById("systemCurrency").value,
      timezone: document.getElementById("systemTimezone").value,
      page_size: document.getElementById("systemPageSize").value,
      session_timeout_minutes: document.getElementById("systemSessionTimeout").value
    };

    await window.SystemSettingsService.saveSettings(settings);
    showDataStatus("systemSettingsStatus", "تم حفظ إعدادات النظام بنجاح.", "success");

    const brand = document.querySelector(".sidebar-brand strong");
    if (brand && settings.company_name_en) brand.textContent = settings.company_name_en;
  } catch (error) {
    showDataStatus(
      "systemSettingsStatus",
      error.message || "تعذر حفظ إعدادات النظام.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = "حفظ الإعدادات";
  }
}

function formatDuration(milliseconds) {
  const ms = Math.max(0, Number(milliseconds || 0));
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes} د ${seconds} ث`;
}

function shortRequestName(url) {
  try {
    const parsed = new URL(url, location.origin);
    return `${parsed.pathname}${parsed.search}`.slice(0, 100);
  } catch {
    return String(url || "unknown").slice(0, 100);
  }
}

function renderPerformanceMonitor() {
  const summary = window.PerformanceMonitor?.summarize?.();
  if (!summary) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText(
    "performancePageLoad",
    summary.navigation.pageLoadMs
      ? formatDuration(summary.navigation.pageLoadMs)
      : "غير متاح"
  );
  setText(
    "performanceDomReady",
    `DOM: ${
      summary.navigation.domReadyMs
        ? formatDuration(summary.navigation.domReadyMs)
        : "غير متاح"
    }`
  );
  setText("performanceApiRequests", String(summary.requestsTotal));
  setText("performanceFailedRequests", `الفاشلة: ${summary.failedRequests}`);
  setText(
    "performanceAverageResponse",
    summary.requestsTotal
      ? formatDuration(summary.averageResponseMs)
      : "لا توجد طلبات"
  );
  setText(
    "performanceSlowestResponse",
    `الأبطأ: ${
      summary.slowestResponseMs
        ? formatDuration(summary.slowestResponseMs)
        : "—"
    }`
  );

  setText(
    "performanceNetworkStatus",
    summary.network.online ? "Online" : "Offline"
  );

  const connectionDetails = [
    summary.network.effectiveType !== "unknown"
      ? summary.network.effectiveType
      : null,
    summary.network.downlinkMbps
      ? `${summary.network.downlinkMbps} Mbps`
      : null,
    summary.network.rttMs
      ? `RTT ${summary.network.rttMs} ms`
      : null
  ].filter(Boolean).join(" — ");

  setText(
    "performanceConnectionType",
    `الاتصال: ${connectionDetails || "غير متاح"}`
  );

  if (summary.memory) {
    setText(
      "performanceMemoryUsage",
      `${formatBytes(summary.memory.usedBytes)} مستخدم`
    );
    setText(
      "performanceMemoryLimit",
      `الحد: ${formatBytes(summary.memory.limitBytes)}`
    );
  } else {
    setText("performanceMemoryUsage", "غير مدعوم");
    setText("performanceMemoryLimit", "الحد: غير متاح");
  }

  setText(
    "performanceLastUpdated",
    new Date(summary.lastUpdatedAt).toLocaleTimeString("ar-SA")
  );
  setText(
    "performanceSessionDuration",
    `مدة الجلسة: ${formatDuration(summary.sessionDurationMs)}`
  );

  const slowRequests = document.getElementById("performanceSlowRequests");
  if (slowRequests) {
    slowRequests.innerHTML = summary.slowestRequests.length
      ? summary.slowestRequests.map(item => `
        <div class="performance-request-item">
          <div>
            <strong>${escapeHtml(item.method)} ${escapeHtml(shortRequestName(item.url))}</strong>
            <small>${item.status || "Network Error"} — ${new Date(item.timestamp).toLocaleTimeString("ar-SA")}</small>
          </div>
          <b class="${item.ok ? "" : "performance-failed"}">${formatDuration(item.durationMs)}</b>
        </div>
      `).join("")
      : '<div class="empty-state">لا توجد طلبات API مسجلة في الجلسة الحالية.</div>';
  }

  const renderList = document.getElementById("performanceScreenRenders");
  if (renderList) {
    renderList.innerHTML = summary.screenRenders.length
      ? summary.screenRenders.map(item => `
        <div class="performance-request-item">
          <div>
            <strong>${escapeHtml(pageMeta[item.screen]?.[0] || item.screen)}</strong>
            <small>${item.count} عملية عرض — الحد الأقصى ${formatDuration(item.maxMs)}</small>
          </div>
          <b>${formatDuration(item.averageMs)}</b>
        </div>
      `).join("")
      : '<div class="empty-state">لا توجد قياسات عرض شاشات بعد.</div>';
  }
}

function healthStatusItem(label, value, ok = true, detail = "") {
  return `<div class="health-list-item"><span class="health-indicator ${ok ? "ok" : "warn"}"></span><div><strong>${escapeHtml(label)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div><b>${escapeHtml(String(value))}</b></div>`;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

function calculateHealthScore(snapshot) {
  const performanceSummary = window.PerformanceMonitor?.summarize?.() || {};
  const evaluation = window.HealthAlertsEngine?.evaluate?.(
    snapshot,
    performanceSummary
  );
  return evaluation?.score ?? 0;
}

async function loadSystemHealth(force = false) {
  if (systemHealthLoading || (!force && systemHealthSnapshot)) return;
  if (!window.SystemHealthService) return;
  if (currentRole() !== "super_admin") {
    showDataStatus("systemHealthStatus", "مراقبة النظام متاحة لمدير النظام فقط.", "error");
    return;
  }

  systemHealthLoading = true;
  showDataStatus("systemHealthStatus", "جاري تنفيذ الفحص الصحي...", "info");
  try {
    systemHealthSnapshot = await window.SystemHealthService.getSnapshot();
    renderSystemHealth();
    showDataStatus("systemHealthStatus", "");
  } catch (error) {
    showDataStatus("systemHealthStatus", error.message || "تعذر تنفيذ فحص النظام.", "error");
  } finally {
    systemHealthLoading = false;
  }
}

function renderSystemHealth() {
  const s = systemHealthSnapshot;
  if (!s) return;

  const performanceSummary = window.PerformanceMonitor?.summarize?.() || {};
  const healthEvaluation = window.HealthAlertsEngine?.evaluate?.(
    s,
    performanceSummary
  );

  const score = healthEvaluation?.score ?? calculateHealthScore(s);
  const label = healthEvaluation?.level?.arabic
    || (score >= 90 ? "ممتاز" : score >= 75 ? "جيد" : score >= 60 ? "يحتاج متابعة" : "حرج");
  document.getElementById("healthScoreValue").textContent = `${score}%`;
  document.getElementById("healthScoreRing").style.setProperty("--health-score", `${score * 3.6}deg`);
  document.getElementById("healthOverallLabel").textContent = `حالة النظام: ${label}`;
  document.getElementById("healthLastChecked").textContent = `آخر فحص: ${new Date().toLocaleString("ar-SA")}`;
  document.getElementById("healthDatabaseStatus").textContent = s.database_online ? "متصل" : "غير متصل";
  document.getElementById("healthDatabaseLatency").textContent = `زمن الاستجابة: ${s.latency_ms} ms`;
  document.getElementById("healthUsersTotal").textContent = Number(s.users_total || 0);
  document.getElementById("healthUsersActive").textContent = `النشطون: ${Number(s.users_active || 0)}`;
  document.getElementById("healthRlsCoverage").textContent = `${Number(s.security?.rls_coverage_percent || 0)}%`;
  document.getElementById("healthPoliciesCount").textContent = `السياسات: ${Number(s.security?.policies_count || 0)}`;

  document.getElementById("healthServicesList").innerHTML = [
    healthStatusItem("Supabase Database", s.database_online ? "Online" : "Offline", s.database_online, `${s.latency_ms} ms`),
    healthStatusItem("backup-admin", "Configured", true, "Export / Validate / Restore"),
    healthStatusItem("manage-user", "Configured", true, "User administration"),
    healthStatusItem("GitHub Pages", navigator.onLine ? "Online" : "Offline", navigator.onLine, location.hostname)
  ].join("");

  document.getElementById("healthDatabaseMetrics").innerHTML = [
    ["الجداول", s.tables_count], ["إجمالي الصفوف", s.rows_total], ["حجم البيانات", formatBytes(s.database_size_bytes)], ["الفهارس", s.indexes_count]
  ].map(([a,b]) => `<article><span>${a}</span><strong>${b}</strong></article>`).join("");

  document.getElementById("healthSecurityList").innerHTML = [
    healthStatusItem("Row Level Security", `${s.security.rls_enabled_tables}/${s.security.public_tables}`, s.security.rls_coverage_percent === 100),
    healthStatusItem("Database Policies", s.security.policies_count, s.security.policies_count > 0),
    healthStatusItem("Edge Authentication", "Enabled", true, "Custom JWT verification"),
    healthStatusItem("Active Super Admin", s.super_admins, s.super_admins > 0)
  ].join("");

  document.getElementById("healthVersionMetrics").innerHTML = [
    ["النظام", "KYUM Enterprise CRM"], ["الإصدار", s.version || "1.0"], ["البيئة", "Production"], ["وقت الخادم", new Date(s.server_time).toLocaleString("ar-SA")]
  ].map(([a,b]) => `<article><span>${a}</span><strong>${escapeHtml(String(b))}</strong></article>`).join("");

  document.getElementById("healthTablesBody").innerHTML = (s.tables || []).map(t => `<tr><td><strong>${escapeHtml(t.table_name)}</strong></td><td>${Number(t.row_count || 0)}</td><td>${formatBytes(t.total_bytes)}</td><td>${t.rls_enabled ? '<span class="record-status active">مفعّل</span>' : '<span class="record-status inactive">غير مفعّل</span>'}</td><td>${Number(t.policies_count || 0)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty-state">لا توجد بيانات.</td></tr>';

  document.getElementById("healthBackupsList").innerHTML = (s.recent_backups || []).map(b => healthStatusItem(
    b.operation_type === "restore" ? "استعادة" : "تصدير",
    b.status,
    b.status === "completed",
    `${b.total_records || 0} سجل — ${new Date(b.created_at).toLocaleString("ar-SA")}`
  )).join("") || '<div class="empty-state">لا توجد عمليات نسخ مسجلة.</div>';

  document.getElementById("healthAlertsList").innerHTML = (s.alerts || []).map(a => healthStatusItem(
    a.title || "تنبيه",
    a.severity || "warning",
    false,
    a.detail || ""
  )).join("") || healthStatusItem("لا توجد تنبيهات حرجة", "سليم", true, "آخر 24 ساعة");

  renderSmartHealthInsights(healthEvaluation);
  renderPerformanceMonitor();
}

function reportCurrency(value) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function reportFilterValues() {
  return {
    from: document.getElementById("reportsDateFrom")?.value || "",
    to: document.getElementById("reportsDateTo")?.value || "",
    representative: document.getElementById("reportsRepresentativeFilter")?.value || "",
    target: Number(document.getElementById("reportsSalesTarget")?.value || 0)
  };
}

function populateReportsRepresentativeFilter() {
  const select = document.getElementById("reportsRepresentativeFilter");
  if (!select) return;

  const selected = select.value;
  const names = [...new Set([
    ...customers.map(item => item.representative),
    ...followups.map(item => item.representative),
    ...quotations.map(item => item.representative)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));

  replaceSelectOptions(
    select,
    names.map(name => ({ label: name, value: name })),
    "كل المندوبين",
    selected
  );
}

async function ensureReportsData() {
  showDataStatus("reportsStatus", "جاري تحديث بيانات التقارير...", "info");
  try {
    await Promise.all([
      loadReferenceDataFromSupabase(),
      loadCustomersFromSupabase(),
      loadFollowupsFromSupabase(),
      loadQuotationsFromSupabase()
    ]);
    populateReportsRepresentativeFilter();
    showDataStatus("reportsStatus", "");
  } catch (error) {
    showDataStatus(
      "reportsStatus",
      error instanceof Error ? error.message : "تعذر تحميل بيانات التقارير.",
      "error"
    );
  }
}

function analyticsLabel(type, key) {
  if (type === "activity") {
    const labels = {
      active_7_days: "نشط خلال 7 أيام",
      active_30_days: "نشط خلال 30 يومًا",
      inactive_30_days: "غير نشط أكثر من 30 يومًا",
      never_contacted: "لم يتم التواصل"
    };
    return labels[key] || key;
  }
  return key;
}

function renderAnalyticsBars(containerId, entries, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = Object.entries(entries || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.limit || 10);

  const max = Math.max(1, ...rows.map(([, value]) => Number(value || 0)));

  container.innerHTML = rows.length
    ? rows.map(([label, value], index) => `
      <div class="analytics-bar-row">
        <div>
          <span>${index + 1}</span>
          <strong>${escapeHtml(options.labeler ? options.labeler(label) : label)}</strong>
        </div>
        <div class="analytics-bar-track">
          <span style="width:${Number(value || 0) / max * 100}%"></span>
        </div>
        <b>${Number(value || 0)}</b>
      </div>
    `).join("")
    : '<div class="empty-state">لا توجد بيانات داخل النطاق المحدد.</div>';
}

function renderCustomerAnalytics(report) {
  renderAnalyticsBars(
    "customerAnalyticsBreakdown",
    report.customerAnalytics?.[activeCustomerAnalyticsTab] || {},
    {
      labeler: label => analyticsLabel(activeCustomerAnalyticsTab, label)
    }
  );
}

function reportStatusColorClass(status) {
  if (status === "مقبول") return "accepted";
  if (status === "مرفوض" || status === "ملغي") return "rejected";
  return "pending";
}

function reportPeriodLabel(from, to) {
  if (!from || !to) return "كل الفترات";
  return `${formatDate(from)} — ${formatDate(to)}`;
}

function renderReportDelta(id, value) {
  const element = document.getElementById(id);
  if (!element) return;

  const numeric = Number(value || 0);
  const direction = numeric > 0 ? "positive" : numeric < 0 ? "negative" : "neutral";
  element.className = `kpi-delta ${direction}`;
  element.textContent = `${numeric > 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

function saveReportsTarget() {
  const value = Number(document.getElementById("reportsSalesTarget")?.value || 0);
  localStorage.setItem("kyum_reports_sales_target", String(Math.max(0, value)));
}

function renderReportsOverview() {
  if (!window.ReportsEngine) return;

  const report = window.ReportsEngine.build(
    { customers, followups, quotations },
    reportFilterValues()
  );
  currentReportsSnapshot = report;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("executiveCurrentPeriod", reportPeriodLabel(report.filters.from, report.filters.to));
  setText("executivePreviousPeriod", reportPeriodLabel(report.previousFilters.from, report.previousFilters.to));
  setText("executiveTargetAchievement", `${report.totals.targetAchievement.toFixed(1)}%`);

  setText("reportCustomersTotal", report.totals.customers);
  setText("reportCustomersNew", `الجدد: ${report.totals.newCustomers}`);
  setText("reportTodayFollowups", report.totals.todayFollowups);
  setText("reportFollowupsTotal", report.totals.followups);
  setText("reportFollowupsOverdue", `المتأخرة: ${report.totals.overdueFollowups}`);
  setText("reportCompletedFollowups", `المكتملة: ${report.totals.completedFollowups}`);
  setText("reportQuotationsTotal", report.totals.quotations);
  setText("reportQuotationsAccepted", `المقبولة: ${report.totals.acceptedQuotations}`);
  setText("reportQuotationsValue", reportCurrency(report.totals.quotationValue));
  setText("reportAcceptedValue", `المقبولة: ${reportCurrency(report.totals.acceptedValue)}`);
  setText("reportConversionRate", `${report.totals.conversionRate.toFixed(1)}%`);
  setText("reportTargetAchievement", `${report.totals.targetAchievement.toFixed(1)}%`);
  setText("reportTargetRemaining", `المتبقي: ${reportCurrency(report.totals.targetRemaining)}`);
  setText("reportCustomersWithoutFollowup", report.totals.customersWithoutFollowup);

  renderReportDelta("reportCustomersDelta", report.deltas.customers);
  renderReportDelta("reportTodayFollowupsDelta", report.deltas.todayFollowups);
  renderReportDelta("reportFollowupsDelta", report.deltas.followups);
  renderReportDelta("reportQuotationsDelta", report.deltas.quotations);
  renderReportDelta("reportQuotationValueDelta", report.deltas.quotationValue);
  renderReportDelta("reportConversionDelta", report.deltas.conversionRate);
  renderReportDelta("reportTargetDelta", report.deltas.targetAchievement);
  renderReportDelta("reportWithoutFollowupDelta", report.deltas.customersWithoutFollowup);

  const maxFunnel = Math.max(1, ...report.funnel.map(item => item.value));
  document.getElementById("reportsFunnel").innerHTML = report.funnel.map((item, index) => `
    <div class="executive-funnel-stage stage-${item.key}">
      <div class="executive-funnel-stage-head">
        <span>${index + 1}</span>
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(item.arabic)}</small>
        </div>
        <b>${item.value}</b>
      </div>
      <div class="executive-funnel-bar">
        <span style="width:${Math.max(3, item.value / maxFunnel * 100)}%"></span>
      </div>
      <div class="executive-funnel-rates">
        <small>من المرحلة السابقة: ${item.stageConversion.toFixed(1)}%</small>
        <small>من إجمالي العملاء: ${item.totalConversion.toFixed(1)}%</small>
      </div>
    </div>
  `).join("");

  const won = report.funnel.find(item => item.key === "won");
  const lead = report.funnel.find(item => item.key === "lead");
  const negotiation = report.funnel.find(item => item.key === "negotiation");
  document.getElementById("executiveFunnelSummary").innerHTML = `
    <article>
      <span>Lead → Won</span>
      <strong>${lead?.value ? (won.value / lead.value * 100).toFixed(1) : "0.0"}%</strong>
    </article>
    <article>
      <span>تحت التفاوض</span>
      <strong>${negotiation?.value || 0}</strong>
    </article>
    <article>
      <span>صفقات ناجحة</span>
      <strong>${won?.value || 0}</strong>
    </article>
  `;

  const statusEntries = Object.entries(report.quotationStatuses)
    .sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(1, ...statusEntries.map(([, value]) => value));

  document.getElementById("quotationStatusBreakdown").innerHTML = statusEntries.length
    ? statusEntries.map(([status, value]) => `
      <div class="report-status-row">
        <div>
          <span class="report-status-dot ${reportStatusColorClass(status)}"></span>
          <strong>${escapeHtml(status)}</strong>
        </div>
        <div class="report-status-track">
          <span class="${reportStatusColorClass(status)}" style="width:${value / maxStatus * 100}%"></span>
        </div>
        <b>${value}</b>
      </div>
    `).join("")
    : '<div class="empty-state">لا توجد عروض داخل النطاق المحدد.</div>';

  const maxMonthValue = Math.max(
    1,
    ...report.months.flatMap(item => [item.customers, item.followups, item.quotations])
  );

  document.getElementById("reportsMonthlyTrend").innerHTML = report.months.map(item => `
    <div class="monthly-column">
      <div class="monthly-bars">
        <span class="customers" style="height:${item.customers / maxMonthValue * 100}%" title="العملاء: ${item.customers}"></span>
        <span class="followups" style="height:${item.followups / maxMonthValue * 100}%" title="المتابعات: ${item.followups}"></span>
        <span class="quotations" style="height:${item.quotations / maxMonthValue * 100}%" title="العروض: ${item.quotations}"></span>
      </div>
      <small>${escapeHtml(item.label)}</small>
    </div>
  `).join("");

  const followupItems = [
    ["متأخرة", report.followupStates.overdue || 0, "critical"],
    ["اليوم", report.followupStates.today || 0, "warning"],
    ["قادمة", report.followupStates.upcoming || 0, "info"],
    ["مكتملة", report.followupStates.completed || 0, "healthy"],
    ["بدون موعد", report.followupStates.no_date || 0, "muted"]
  ];

  document.getElementById("followupReportSummary").innerHTML = followupItems.map(([label, value, type]) => `
    <article class="${type}">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  renderCustomerAnalytics(report);

  setText("quotationAverageValue", reportCurrency(report.quotationAnalytics.averageValue));
  setText("quotationHighestValue", reportCurrency(report.quotationAnalytics.highestValue));
  setText("quotationLowestValue", reportCurrency(report.quotationAnalytics.lowestValue));
  setText("quotationOpenValue", reportCurrency(report.quotationAnalytics.openValue));
  setText("quotationRejectedValue", reportCurrency(report.quotationAnalytics.rejectedValue));
  setText("quotationRejectionRate", `${report.quotationAnalytics.rejectionRate.toFixed(1)}%`);

  renderAnalyticsBars(
    "lossReasonsAnalytics",
    report.lossReasons,
    { limit: 10 }
  );

  const topCustomers = document.getElementById("topCustomersByValue");
  topCustomers.innerHTML = report.topCustomersByValue.length
    ? report.topCustomersByValue.map((item, index) => `
      <article class="top-customer-item">
        <span>${index + 1}</span>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${item.quotations} عروض — ${item.accepted} مقبولة</small>
        </div>
        <b>${reportCurrency(item.totalValue)}</b>
      </article>
    `).join("")
    : '<div class="empty-state">لا توجد عروض أسعار داخل النطاق المحدد.</div>';

  const inactiveList = document.getElementById("inactiveCustomersList");
  inactiveList.innerHTML = report.inactiveCustomers.length
    ? report.inactiveCustomers.map(item => `
      <article class="customer-action-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.phone || "بدون جوال")} — ${escapeHtml(item.representative)}</small>
        </div>
        <span>${item.daysInactive} يوم</span>
      </article>
    `).join("")
    : '<div class="empty-state">لا يوجد عملاء غير نشطين داخل النطاق المحدد.</div>';

  const needsFollowup = document.getElementById("customersNeedingFollowupList");
  needsFollowup.innerHTML = report.customersNeedingFollowup.length
    ? report.customersNeedingFollowup.map(item => `
      <article class="customer-action-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.phone || "بدون جوال")} — ${escapeHtml(item.representative)}</small>
        </div>
        <span class="${item.reason === "متابعة متأخرة" ? "critical" : "warning"}">${escapeHtml(item.reason)}</span>
      </article>
    `).join("")
    : '<div class="empty-state">كل العملاء لديهم متابعة سليمة.</div>';

  const leaderboard = document.getElementById("representativeLeaderboard");
  leaderboard.innerHTML = report.representativePerformance.length
    ? report.representativePerformance.slice(0, 8).map(item => `
      <article class="representative-rank-card rank-${item.rank}">
        <div class="rank-number">${item.rank}</div>
        <div class="rank-main">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${item.accepted} عروض مقبولة — ${reportCurrency(item.acceptedValue)}</small>
          <div class="rank-progress"><span style="width:${Math.min(100, item.activityScore)}%"></span></div>
        </div>
        <div class="rank-stats">
          <b>${item.conversion.toFixed(1)}%</b>
          <small>تحويل</small>
        </div>
      </article>
    `).join("")
    : '<div class="empty-state">لا توجد بيانات مندوبي مبيعات.</div>';

  const comparison = document.getElementById("representativeComparison");
  comparison.innerHTML = report.representativePerformance.length
    ? report.representativePerformance.slice(0, 8).map(item => `
      <article class="representative-comparison-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>الفترة الحالية مقابل السابقة</small>
        </div>
        <div class="comparison-metric">
          <span>القيمة</span>
          <b class="${item.deltas.value >= 0 ? "positive" : "negative"}">${item.deltas.value >= 0 ? "+" : ""}${item.deltas.value.toFixed(1)}%</b>
        </div>
        <div class="comparison-metric">
          <span>التحويل</span>
          <b class="${item.deltas.conversion >= 0 ? "positive" : "negative"}">${item.deltas.conversion >= 0 ? "+" : ""}${item.deltas.conversion.toFixed(1)}%</b>
        </div>
      </article>
    `).join("")
    : '<div class="empty-state">لا توجد بيانات مقارنة.</div>';

  const yearly = report.yearlyTrend || [];
  const maxCount = Math.max(
    1,
    ...yearly.flatMap(item => [item.customers, item.followups, item.quotations])
  );
  const maxValue = Math.max(1, ...yearly.map(item => item.value));

  document.getElementById("reportsYearlyTrend").innerHTML = yearly.map(item => `
    <div class="yearly-trend-column">
      <div class="yearly-bars">
        <span class="customers" style="height:${item.customers / maxCount * 100}%" title="العملاء: ${item.customers}"></span>
        <span class="followups" style="height:${item.followups / maxCount * 100}%" title="المتابعات: ${item.followups}"></span>
        <span class="quotations" style="height:${item.quotations / maxCount * 100}%" title="العروض: ${item.quotations}"></span>
        <span class="value" style="height:${item.value / maxValue * 100}%" title="القيمة: ${reportCurrency(item.value)}"></span>
      </div>
      <small>${escapeHtml(item.label)}</small>
    </div>
  `).join("");

  const renderTopList = (id, items, valueRenderer) => {
    const container = document.getElementById(id);
    container.innerHTML = items.length
      ? items.map((item, index) => `
        <article class="top10-item">
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            ${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ""}
          </div>
          <b>${valueRenderer(item)}</b>
        </article>
      `).join("")
      : '<div class="empty-state">لا توجد بيانات.</div>';
  };

  renderTopList(
    "topRepresentativesList",
    (report.topRepresentatives || []).map(item => ({
      ...item,
      subtitle: `${item.accepted} مقبولة — ${item.conversion.toFixed(1)}% تحويل`
    })),
    item => reportCurrency(item.acceptedValue)
  );

  renderTopList(
    "topInterestsList",
    report.topInterests || [],
    item => item.count
  );

  renderTopList(
    "topCustomersExecutiveList",
    (report.topCustomersByValue || []).map(item => ({
      ...item,
      subtitle: `${item.quotations} عروض — ${item.accepted} مقبولة`
    })),
    item => reportCurrency(item.totalValue)
  );

  renderTopList(
    "topLossReasonsList",
    report.topLossReasons || [],
    item => item.count
  );

  const body = document.getElementById("representativePerformanceBody");
  body.innerHTML = report.representativePerformance.length
    ? report.representativePerformance.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${item.customers}</td>
        <td>${item.followups}</td>
        <td>${item.quotations}</td>
        <td>${item.accepted}</td>
        <td>${reportCurrency(item.value)}</td>
        <td><span class="badge">${item.conversion.toFixed(1)}%</span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="7" class="empty-state">لا توجد بيانات أداء داخل النطاق المحدد.</td></tr>';

  showDataStatus(
    "reportsStatus",
    `تم تحديث التقرير في ${new Date(report.generatedAt).toLocaleTimeString("ar-SA")}.`,
    "success"
  );
}

function resetReportsFilters() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  document.getElementById("reportsDateFrom").value = first.toISOString().slice(0, 10);
  document.getElementById("reportsDateTo").value = now.toISOString().slice(0, 10);
  document.getElementById("reportsRepresentativeFilter").value = "";
  document.getElementById("reportsSalesTarget").value = "100000";
  saveReportsTarget();
  renderReportsOverview();
}

function openReportsExportCenter() {
  if (!currentReportsSnapshot) renderReportsOverview();

  document.getElementById("executiveSummaryText").value =
    window.ReportsExportCenter.executiveSummary(currentReportsSnapshot);

  document.getElementById("reportsExportDialog").showModal();
}

function closeReportsExportCenter() {
  document.getElementById("reportsExportDialog").close();
}

function exportReportsExcel() {
  if (!currentReportsSnapshot) renderReportsOverview();
  try {
    window.ReportsExportCenter.createExcel(currentReportsSnapshot);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر إنشاء ملف Excel.");
  }
}

function exportReportsPdf() {
  if (!currentReportsSnapshot) renderReportsOverview();

  const popup = window.open("", "_blank");
  if (!popup) {
    alert("اسمح للنوافذ المنبثقة لإنشاء تقرير PDF.");
    return;
  }

  popup.document.open();
  popup.document.write(window.ReportsExportCenter.pdfHtml(currentReportsSnapshot));
  popup.document.close();
}

async function exportReportsPng() {
  if (!currentReportsSnapshot) renderReportsOverview();

  const button = document.getElementById("exportReportsPngBtn");
  button.disabled = true;
  button.textContent = "جاري إنشاء الصورة...";

  try {
    await window.ReportsExportCenter.createPng(
      document.getElementById("reportsOverviewView"),
      currentReportsSnapshot
    );
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر إنشاء صورة PNG.");
  } finally {
    button.disabled = false;
    button.textContent = "تصدير PNG";
  }
}

function exportReportsCsv() {
  if (!currentReportsSnapshot) renderReportsOverview();
  const csv = window.ReportsEngine.toCsv(currentReportsSnapshot);
  downloadTextFile(
    `kyum-reports-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
}

function diagnosticsStatusLabel(status) {
  const labels = {
    passed: "Passed",
    warning: "Warning",
    critical: "Critical"
  };
  return labels[status] || status;
}

function diagnosticsStatusArabic(status) {
  const labels = {
    passed: "ناجح",
    warning: "تحذير",
    critical: "حرج"
  };
  return labels[status] || status;
}

function renderDiagnosticsReport(report) {
  latestDiagnosticsReport = report;

  document.getElementById("diagnosticsScore").textContent =
    `${report.evaluation.score}%`;
  document.getElementById("diagnosticsDuration").textContent =
    `المدة: ${formatDuration(report.duration_ms)}`;
  document.getElementById("diagnosticsPassed").textContent =
    report.evaluation.passed;
  document.getElementById("diagnosticsWarnings").textContent =
    report.evaluation.warnings;
  document.getElementById("diagnosticsCritical").textContent =
    report.evaluation.critical;
  document.getElementById("diagnosticsFinishedAt").textContent =
    new Date(report.finished_at).toLocaleTimeString("ar-SA");
  document.getElementById("diagnosticsEnvironment").textContent =
    `البيئة: ${report.environment}`;

  const groups = [...new Set(report.evaluation.tests.map(test => test.category))];
  document.getElementById("diagnosticsResults").innerHTML = groups.map(group => `
    <section class="diagnostics-group">
      <h4>${escapeHtml(group)}</h4>
      <div class="diagnostics-test-list">
        ${report.evaluation.tests.filter(test => test.category === group).map(test => `
          <article class="diagnostics-test ${test.status}">
            <div class="diagnostics-test-status">
              <span>${escapeHtml(diagnosticsStatusLabel(test.status))}</span>
            </div>
            <div class="diagnostics-test-content">
              <strong>${escapeHtml(test.title)}</strong>
              <p>${escapeHtml(test.detail || "")}</p>
              ${test.status !== "passed" && test.recommendation
                ? `<small><b>التوصية:</b> ${escapeHtml(test.recommendation)}</small>`
                : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");

  document.getElementById("downloadDiagnosticsJsonBtn").disabled = false;
  document.getElementById("downloadDiagnosticsHtmlBtn").disabled = false;
}

function diagnosticsHtml(report) {
  const rows = report.evaluation.tests.map(test => `
    <tr>
      <td>${escapeHtml(test.category)}</td>
      <td>${escapeHtml(test.title)}</td>
      <td>${escapeHtml(diagnosticsStatusArabic(test.status))}</td>
      <td>${escapeHtml(test.detail || "")}</td>
      <td>${escapeHtml(test.recommendation || "")}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>KYUM Diagnostics Report</title>
<style>
body{font-family:Arial,sans-serif;margin:32px;color:#172033}
h1,h2{margin:0 0 12px}
.summary{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}
.summary div{border:1px solid #ddd;border-radius:10px;padding:12px;min-width:120px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ddd;padding:9px;text-align:right;vertical-align:top}
th{background:#f4f6f8}
footer{margin-top:24px;color:#667085;font-size:12px}
</style>
</head>
<body>
<h1>تقرير التشخيص الشامل — KYUM CRM</h1>
<p>وقت الفحص: ${escapeHtml(new Date(report.finished_at).toLocaleString("ar-SA"))}</p>
<div class="summary">
<div><b>النتيجة</b><br>${report.evaluation.score}%</div>
<div><b>Passed</b><br>${report.evaluation.passed}</div>
<div><b>Warning</b><br>${report.evaluation.warnings}</div>
<div><b>Critical</b><br>${report.evaluation.critical}</div>
<div><b>المدة</b><br>${Math.round(report.duration_ms)} ms</div>
</div>
<table>
<thead><tr><th>القسم</th><th>الفحص</th><th>الحالة</th><th>التفاصيل</th><th>التوصية</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<footer>Environment: ${escapeHtml(report.environment)} — Report version ${escapeHtml(report.report_version)}</footer>
</body>
</html>`;
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function runEnterpriseDiagnostics() {
  if (diagnosticsRunning) return;
  diagnosticsRunning = true;

  const button = document.getElementById("runDiagnosticsBtn");
  button.disabled = true;
  button.textContent = "جاري الفحص...";
  showDataStatus(
    "diagnosticsStatus",
    "جاري تنفيذ اختبارات قاعدة البيانات والأمان والوظائف والواجهة...",
    "info"
  );

  try {
    const report = await window.DiagnosticsEngine.run();
    renderDiagnosticsReport(report);

    const type = report.evaluation.critical
      ? "error"
      : report.evaluation.warnings
        ? "info"
        : "success";

    showDataStatus(
      "diagnosticsStatus",
      `اكتمل الفحص: ${report.evaluation.passed} ناجح، ${report.evaluation.warnings} تحذير، ${report.evaluation.critical} حرج.`,
      type
    );
  } catch (error) {
    showDataStatus(
      "diagnosticsStatus",
      error instanceof Error ? error.message : "تعذر تنفيذ الفحص الشامل.",
      "error"
    );
  } finally {
    diagnosticsRunning = false;
    button.disabled = false;
    button.textContent = "إعادة الفحص";
  }
}

function componentLabel(key) {
  const labels = {
    database: "قاعدة البيانات",
    security: "الأمان",
    backups: "النسخ الاحتياطي",
    performance: "الأداء",
    network: "الشبكة",
    users: "المستخدمون",
    errors: "الأخطاء"
  };
  return labels[key] || key;
}

function severityLabel(severity) {
  const labels = {
    healthy: "سليم",
    warning: "تحذير",
    critical: "حرج"
  };
  return labels[severity] || severity;
}

function renderHealthTrend(history) {
  const container = document.getElementById("healthTrendChart");
  if (!container) return;

  if (!history?.length) {
    container.innerHTML = '<div class="empty-state">لا توجد قياسات سابقة بعد.</div>';
    return;
  }

  const width = 600;
  const height = 150;
  const padding = 18;
  const points = history.map((item, index) => {
    const x = history.length === 1
      ? width / 2
      : padding + index * ((width - padding * 2) / (history.length - 1));
    const y = height - padding - (item.score / 100) * (height - padding * 2);
    return { x, y, ...item };
  });

  const polyline = points.map(point => `${point.x},${point.y}`).join(" ");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Health score trend">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="trend-axis"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" class="trend-axis"/>
      <polyline points="${polyline}" class="trend-line"/>
      ${points.map(point => `
        <circle cx="${point.x}" cy="${point.y}" r="4" class="trend-point">
          <title>${point.score}% — ${new Date(point.timestamp).toLocaleTimeString("ar-SA")}</title>
        </circle>
      `).join("")}
    </svg>
  `;
}

function renderSmartHealthInsights(evaluation) {
  if (!evaluation) return;

  const badge = document.getElementById("smartHealthLevelBadge");
  if (badge) {
    badge.textContent = `${evaluation.level.arabic} — ${evaluation.score}%`;
    badge.className = `smart-health-level ${evaluation.level.key}`;
  }

  const breakdown = document.getElementById("healthScoreBreakdown");
  if (breakdown) {
    breakdown.innerHTML = Object.entries(evaluation.components).map(([key, value]) => `
      <div class="score-breakdown-item">
        <div>
          <strong>${escapeHtml(componentLabel(key))}</strong>
          <small>الوزن: ${evaluation.weights[key]}%</small>
        </div>
        <div class="score-progress">
          <span style="width:${Math.round(value)}%"></span>
        </div>
        <b>${Math.round(value)}%</b>
      </div>
    `).join("");
  }

  const alerts = document.getElementById("smartAlertsList");
  if (alerts) {
    alerts.innerHTML = evaluation.alerts.map(alert => `
      <article class="smart-alert ${alert.severity}">
        <div>
          <strong>${escapeHtml(alert.title)}</strong>
          <small>${escapeHtml(alert.detail || "")}</small>
        </div>
        <span>${escapeHtml(severityLabel(alert.severity))}</span>
      </article>
    `).join("");
  }

  const recommendations = document.getElementById("healthRecommendationsList");
  if (recommendations) {
    recommendations.innerHTML = evaluation.recommendations.map((item, index) => `
      <article class="health-recommendation">
        <span>${index + 1}</span>
        <p>${escapeHtml(item)}</p>
      </article>
    `).join("");
  }

  renderHealthTrend(evaluation.history);
}

function startSystemHealthAutoRefresh() {
  stopSystemHealthAutoRefresh();
  systemHealthTimer = window.setInterval(() => {
    const view = document.getElementById("systemHealthView");
    if (view && !view.classList.contains("hidden")) {
      loadSystemHealth(true);
      renderPerformanceMonitor();
    }
  }, 30000);
}

function stopSystemHealthAutoRefresh() {
  if (systemHealthTimer) {
    clearInterval(systemHealthTimer);
    systemHealthTimer = null;
  }
}

function canManageCustomers() {
  return ["super_admin", "sales_manager", "sales_representative"].includes(currentRole());
}

function canDeleteCustomers() {
  return ["super_admin", "sales_manager"].includes(currentRole());
}

async function loadCustomersFromSupabase(force = false) {
  if (customersLoading || (customersLoaded && !force)) return;
  if (!window.CustomersService || !window.customerSupabase) return;

  customersLoading = true;
  showDataStatus("customersStatus", "جاري تحميل العملاء من Supabase...", "info");

  try {
    customers = await window.CustomersService.listCustomers();
    customersLoaded = true;
    customersPage = 1;
    showDataStatus("customersStatus", "");
    refreshReferenceOptions();
    renderCustomers();
    renderDashboard();
    renderRepresentatives();
  } catch (error) {
    console.error("Customer loading failed:", error);
    showDataStatus(
      "customersStatus",
      error instanceof Error ? error.message : "تعذر تحميل العملاء.",
      "error"
    );
  } finally {
    customersLoading = false;
  }
}

function filteredCustomers() {
  const query = document.getElementById("customerSearch").value.trim().toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const interest = document.getElementById("interestFilter").value;
  const rep = document.getElementById("repFilter").value;

  return customers.filter(customer => {
    const searchable = [
      customer.name,
      customer.contactPersonName,
      customer.representative,
      customer.phone,
      customer.city,
      customer.quotationNumber
    ].join(" ").toLowerCase();

    return (!query || searchable.includes(query))
      && (!type || customer.type === type)
      && (!interest || customer.interests.includes(interest))
      && (!rep || customer.representative === rep);
  });
}

function renderCustomers() {
  const allRows = filteredCustomers();
  const body = document.getElementById("customersTableBody");
  const pageCount = Math.max(1, Math.ceil(allRows.length / CUSTOMERS_PAGE_SIZE));

  if (customersPage > pageCount) customersPage = pageCount;
  const start = (customersPage - 1) * CUSTOMERS_PAGE_SIZE;
  const rows = allRows.slice(start, start + CUSTOMERS_PAGE_SIZE);

  const addButton = document.getElementById("addCustomerBtn");
  addButton?.classList.toggle("hidden", !canManageCustomers());

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="10" class="empty-state">${
      customersLoaded ? "لا توجد نتائج مطابقة." : "جاري تحميل بيانات العملاء..."
    }</td></tr>`;
  } else {
    body.innerHTML = rows.map(customer => `
      <tr>
        <td>
          <strong>${escapeHtml(customer.phone || "—")}</strong>
          ${customer.customerNumber ? `<br><small>${escapeHtml(customer.customerNumber)}</small>` : ""}
        </td>
        <td>
          <strong>${escapeHtml(customer.name)}</strong><br>
          <small>${customer.city ? escapeHtml(customer.city) : ""}</small>
        </td>
        <td>${customer.type === "شركة" ? escapeHtml(customer.contactPersonName || "—") : "—"}</td>
        <td><span class="badge">${escapeHtml(customer.type)}</span></td>
        <td>${customer.interests.map(item => `<span class="badge">${escapeHtml(item)}</span>`).join("") || "—"}</td>
        <td>${escapeHtml(customer.representative || "—")}</td>
        <td>${formatDate(customer.contactDate)}</td>
        <td>${escapeHtml(customer.quotationNumber || "—")}</td>
        <td>${escapeHtml(customer.noSaleReason || "—")}</td>
        <td>
          <div class="row-actions">
            <button class="edit-btn" data-details="${customer.id}">عرض</button>
            ${canManageFollowups() ? `<button class="edit-btn" data-add-followup="${customer.id}">متابعة</button>` : ""}
            ${canManageCustomers() ? `<button class="edit-btn" data-edit="${customer.id}">تعديل</button>` : ""}
            ${canDeleteCustomers() ? `<button class="delete-btn" data-delete="${customer.id}">حذف</button>` : ""}
          </div>
        </td>
      </tr>`).join("");
  }

  const info = document.getElementById("customersPaginationInfo");
  const pageNumber = document.getElementById("customersPageNumber");
  const prev = document.getElementById("customersPrevPage");
  const next = document.getElementById("customersNextPage");

  if (info) info.textContent = `${allRows.length} عميل`;
  if (pageNumber) pageNumber.textContent = `${customersPage} / ${pageCount}`;
  if (prev) prev.disabled = customersPage <= 1;
  if (next) next.disabled = customersPage >= pageCount;
}

function currentRole() {
  return window.CustomerAuth?.getState?.().profile?.role || "viewer";
}

function canManageReferenceData() {
  return ["super_admin", "sales_manager"].includes(currentRole());
}

function renderRepresentatives() {
  const container = document.getElementById("representativesGrid");
  if (!container) return;

  if (!representativeRecords.length) {
    container.innerHTML = `<div class="empty-state">لا يوجد مندوبون مسجلون في Supabase.</div>`;
    return;
  }

  const canManage = canManageReferenceData();
  container.innerHTML = representativeRecords.map(rep => {
    const count = customers.filter(c => c.representative === rep.full_name).length;
    return `
      <article class="rep-card ${rep.is_active ? "" : "inactive-record"}">
        <div class="record-card-header">
          <div>
            <strong>${escapeHtml(rep.full_name)}</strong>
            <span>${escapeHtml(rep.representative_code)}</span>
          </div>
          <span class="record-status ${rep.is_active ? "active" : "inactive"}">
            ${rep.is_active ? "نشط" : "غير نشط"}
          </span>
        </div>
        <p>${escapeHtml(rep.phone || "لا يوجد جوال")}<br>${escapeHtml(rep.email || "لا يوجد بريد")}</p>
        <div class="record-card-footer">
          <span>عدد العملاء المحليين: ${count}</span>
          ${canManage ? `<button class="edit-btn" data-edit-representative="${rep.id}">تعديل</button>` : ""}
        </div>
      </article>`;
  }).join("");
}

function renderReferenceData() {
  const canManage = canManageReferenceData();

  const renderItems = (records, type) => records.length
    ? records.map(item => `
        <div class="reference-item ${item.is_active ? "" : "inactive-record"}">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span class="record-status ${item.is_active ? "active" : "inactive"}">
              ${item.is_active ? "نشط" : "غير نشط"}
            </span>
          </div>
          ${canManage ? `<button class="edit-btn" data-edit-reference="${item.id}" data-reference-type="${type}">تعديل</button>` : ""}
        </div>`).join("")
    : `<div class="empty-state">لا توجد بيانات مسجلة.</div>`;

  const interestsContainer = document.getElementById("settingsInterests");
  const reasonsContainer = document.getElementById("settingsReasons");

  if (interestsContainer) interestsContainer.innerHTML = renderItems(interestRecords, "interest");
  if (reasonsContainer) reasonsContainer.innerHTML = renderItems(reasonRecords, "reason");

  document.querySelectorAll(".reference-manage-action").forEach(button => {
    button.classList.toggle("hidden", !canManage);
  });
}

function openRepresentativeDialog(record = null) {
  editingRepresentativeId = record?.id || null;
  document.getElementById("representativeDialogTitle").textContent =
    record ? "تعديل مندوب المبيعات" : "إضافة مندوب مبيعات";
  document.getElementById("representativeId").value = record?.id || "";
  document.getElementById("representativeCode").value = record?.representative_code || "";
  document.getElementById("representativeName").value = record?.full_name || "";
  document.getElementById("representativePhone").value = record?.phone || "";
  document.getElementById("representativeEmail").value = record?.email || "";
  document.getElementById("representativeActive").value = String(record?.is_active ?? true);
  document.getElementById("representativeDialog").showModal();
}

function closeRepresentativeDialog() {
  document.getElementById("representativeDialog").close();
  document.getElementById("representativeForm").reset();
  editingRepresentativeId = null;
}

async function saveRepresentativeForm(event) {
  event.preventDefault();
  try {
    await window.ReferenceDataService.saveRepresentative({
      id: editingRepresentativeId,
      representative_code: document.getElementById("representativeCode").value,
      full_name: document.getElementById("representativeName").value,
      phone: document.getElementById("representativePhone").value,
      email: document.getElementById("representativeEmail").value,
      is_active: document.getElementById("representativeActive").value === "true"
    });
    closeRepresentativeDialog();
    referenceDataLoaded = false;
    await loadReferenceDataFromSupabase(true);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حفظ المندوب.");
  }
}

function openReferenceDialog(type, record = null) {
  editingReferenceItemId = record?.id || null;
  document.getElementById("referenceDialogTitle").textContent =
    `${record ? "تعديل" : "إضافة"} ${type === "interest" ? "مجال اهتمام" : "سبب عدم بيع"}`;
  document.getElementById("referenceItemId").value = record?.id || "";
  document.getElementById("referenceItemType").value = type;
  document.getElementById("referenceItemName").value = record?.name || "";
  document.getElementById("referenceItemActive").value = String(record?.is_active ?? true);
  document.getElementById("referenceItemDialog").showModal();
}

function closeReferenceDialog() {
  document.getElementById("referenceItemDialog").close();
  document.getElementById("referenceItemForm").reset();
  editingReferenceItemId = null;
}

async function saveReferenceForm(event) {
  event.preventDefault();
  const type = document.getElementById("referenceItemType").value;
  const payload = {
    id: editingReferenceItemId,
    name: document.getElementById("referenceItemName").value,
    is_active: document.getElementById("referenceItemActive").value === "true"
  };

  try {
    if (type === "interest") await window.ReferenceDataService.saveInterest(payload);
    else await window.ReferenceDataService.saveReason(payload);
    closeReferenceDialog();
    referenceDataLoaded = false;
    await loadReferenceDataFromSupabase(true);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حفظ البيانات المرجعية.");
  }
}

function syncCustomerContactPersonField() {
  const type = document.getElementById("customerType")?.value;
  const field = document.getElementById("customerContactPersonField");
  const input = document.getElementById("customerContactPerson");
  const isCompany = type === "شركة";

  if (!field || !input) return;

  field.classList.toggle("hidden", !isCompany);
  input.required = isCompany;

  if (!isCompany) {
    input.value = "";
    input.setCustomValidity("");
  }
}

function openCustomerDialog(customer = null) {
  editingId = customer?.id || null;
  document.getElementById("dialogTitle").textContent = customer ? "تعديل بيانات العميل" : "إضافة عميل جديد";
  document.getElementById("customerId").value = customer?.id || "";
  document.getElementById("customerName").value = customer?.name || "";
  document.getElementById("customerType").value = customer?.type || "شركة";
  document.getElementById("customerContactPerson").value = customer?.contactPersonName || "";
  syncCustomerContactPersonField();
  document.getElementById("customerPhone").value = customer?.phone || "";
  document.getElementById("customerCity").value = customer?.city || "";
  document.getElementById("customerRepresentative").value = customer?.representativeId || representatives[0]?.uuid || "";
  document.getElementById("contactDate").value = customer?.contactDate || new Date().toISOString().slice(0, 10);
  document.getElementById("quotationNumber").value = customer?.quotationNumber || "";
  document.getElementById("noSaleReason").value = customer?.noSaleReasonId || "";
  document.getElementById("customerNotes").value = customer?.notes || "";

  [...document.getElementById("customerInterest").options].forEach(option => {
    option.selected = customer ? customer.interestIds.includes(option.value) : false;
  });

  document.getElementById("customerDialog").showModal();
}

function closeCustomerDialog() {
  document.getElementById("customerDialog").close();
  document.getElementById("customerForm").reset();
  editingId = null;
}

async function handleCustomerSubmit(event) {
  event.preventDefault();

  if (!canManageCustomers()) {
    alert("لا توجد صلاحية لتعديل بيانات العملاء.");
    return;
  }

  const selectedInterestIds = [...document.getElementById("customerInterest").selectedOptions]
    .map(option => option.value);

  if (!selectedInterestIds.length) {
    alert("اختر مجال اهتمام واحدًا على الأقل.");
    return;
  }

  const customerType = document.getElementById("customerType").value;
  const contactPersonInput = document.getElementById("customerContactPerson");
  const contactPersonName = contactPersonInput.value.trim();

  if (customerType === "شركة" && !contactPersonName) {
    contactPersonInput.setCustomValidity("أدخل اسم المسؤول عن الشركة.");
    contactPersonInput.reportValidity();
    contactPersonInput.focus();
    return;
  }
  contactPersonInput.setCustomValidity("");

  const phoneInput = document.getElementById("customerPhone").value;
  const normalizedPhone = normalizePhone(phoneInput);

  if (!isValidSaudiMobile(normalizedPhone)) {
    alert("أدخل رقم جوال سعودي صحيحًا بصيغة 05XXXXXXXX.");
    document.getElementById("customerPhone").focus();
    return;
  }

  try {
    const duplicateCustomer = await findCustomerByPhone(normalizedPhone, editingId);
    if (duplicateCustomer) {
      alert(`لا يمكن حفظ العميل. رقم الجوال ${normalizedPhone} مسجل بالفعل باسم: ${duplicateCustomer.customer_name}`);
      document.getElementById("customerPhone").focus();
      return;
    }

    const submitButton = event.submitter;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "جاري الحفظ...";
    }

    await window.CustomersService.saveCustomer({
      id: editingId,
      name: document.getElementById("customerName").value,
      type: customerType,
      contactPersonName: customerType === "شركة" ? contactPersonName : "",
      phone: normalizedPhone,
      city: document.getElementById("customerCity").value,
      interestIds: selectedInterestIds,
      representativeId: document.getElementById("customerRepresentative").value,
      contactDate: document.getElementById("contactDate").value,
      quotationNumber: document.getElementById("quotationNumber").value,
      noSaleReasonId: document.getElementById("noSaleReason").value || null,
      notes: document.getElementById("customerNotes").value
    });

    closeCustomerDialog();
    customersLoaded = false;
    await loadCustomersFromSupabase(true);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حفظ العميل.");
  } finally {
    const submitButton = event.submitter;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "حفظ العميل";
    }
  }
}

async function deleteCustomer(id) {
  if (!canDeleteCustomers()) {
    alert("حذف العملاء متاح للإدارة فقط.");
    return;
  }

  const customer = customers.find(item => item.id === id);
  if (!customer) return;
  if (!confirm(`هل تريد حذف العميل: ${customer.name}؟ سيتم حذف السجلات المرتبطة به وفق قواعد قاعدة البيانات.`)) return;

  try {
    await window.CustomersService.deleteCustomer(customer.id, customer.name);
    customersLoaded = false;
    await loadCustomersFromSupabase(true);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حذف العميل.");
  }
}


function customerById(id) {
  return customers.find(customer => customer.id === id);
}

function canManageFollowups() {
  return ["super_admin", "sales_manager", "sales_representative"].includes(currentRole());
}

async function loadFollowupsFromSupabase(force = false) {
  if (followupsLoading || (followupsLoaded && !force)) return;
  if (!window.FollowupsService || !window.customerSupabase) return;

  followupsLoading = true;
  showDataStatus("followupsStatus", "جاري تحميل المتابعات من Supabase...", "info");

  try {
    followups = await window.FollowupsService.listFollowups();
    followupsLoaded = true;
    followupsPage = 1;
    showDataStatus("followupsStatus", "");
    renderFollowups();
    renderDashboard();
  } catch (error) {
    console.error("Follow-up loading failed:", error);
    showDataStatus(
      "followupsStatus",
      error instanceof Error ? error.message : "تعذر تحميل المتابعات.",
      "error"
    );
  } finally {
    followupsLoading = false;
  }
}

function filteredFollowups() {
  const query = document.getElementById("followupSearch").value.trim().toLowerCase();
  const status = document.getElementById("followupStatusFilter").value;
  const rep = document.getElementById("followupRepFilter").value;

  return [...followups]
    .filter(item => {
      const customer = customerById(item.customerId);
      if (!customer) return false;
      const searchable = [
        customer.name,
        customer.phone,
        item.representative,
        item.result,
        item.quotationNumber
      ].join(" ").toLowerCase();

      return (!query || searchable.includes(query))
        && (!status || followupStatus(item) === status)
        && (!rep || item.representative === rep);
    })
    .sort((a, b) => String(b.contactDate).localeCompare(String(a.contactDate)));
}

function renderFollowups() {
  const counts = {
    total: followups.length,
    today: followups.filter(item => followupStatus(item) === "today").length,
    overdue: followups.filter(item => followupStatus(item) === "overdue").length,
    upcoming: followups.filter(item => followupStatus(item) === "upcoming").length
  };

  document.getElementById("followupStats").innerHTML = [
    ["إجمالي المتابعات", counts.total],
    ["متابعات اليوم", counts.today],
    ["المتابعات المتأخرة", counts.overdue],
    ["المتابعات القادمة", counts.upcoming]
  ].map(([label, value]) =>
    `<article class="followup-stat"><span>${label}</span><strong>${value}</strong></article>`
  ).join("");

  const allRows = filteredFollowups();
  const body = document.getElementById("followupsTableBody");
  const pageCount = Math.max(1, Math.ceil(allRows.length / FOLLOWUPS_PAGE_SIZE));

  if (followupsPage > pageCount) followupsPage = pageCount;
  const start = (followupsPage - 1) * FOLLOWUPS_PAGE_SIZE;
  const rows = allRows.slice(start, start + FOLLOWUPS_PAGE_SIZE);

  document.getElementById("addFollowupBtn")?.classList.toggle("hidden", !canManageFollowups());

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="10" class="empty-state">${
      followupsLoaded ? "لا توجد متابعات مطابقة." : "جاري تحميل المتابعات..."
    }</td></tr>`;
  } else {
    body.innerHTML = rows.map(item => {
      const customer = customerById(item.customerId);
      const status = followupStatus(item);
      return `
        <tr>
          <td><strong>${escapeHtml(customer?.name || item.customerName || "عميل غير معروف")}</strong></td>
          <td>${escapeHtml(customer?.phone || item.customerPhone || "—")}</td>
          <td>${formatDate(item.contactDate)}</td>
          <td><span class="badge">${escapeHtml(item.method)}</span></td>
          <td>${escapeHtml(item.representative || "—")}</td>
          <td>${escapeHtml(item.result)}</td>
          <td>${escapeHtml(item.quotationNumber || "—")}</td>
          <td>${formatDate(item.nextFollowupDate)}</td>
          <td><span class="status-badge status-${status}">${statusLabel(status)}</span></td>
          <td>
            <div class="row-actions">
              ${canManageFollowups() ? `<button class="edit-btn" data-edit-followup="${item.id}">تعديل</button>` : ""}
              ${canManageFollowups() ? `<button class="delete-btn" data-delete-followup="${item.id}">حذف</button>` : ""}
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  const info = document.getElementById("followupsPaginationInfo");
  const pageNumber = document.getElementById("followupsPageNumber");
  const prev = document.getElementById("followupsPrevPage");
  const next = document.getElementById("followupsNextPage");

  if (info) info.textContent = `${allRows.length} متابعة`;
  if (pageNumber) pageNumber.textContent = `${followupsPage} / ${pageCount}`;
  if (prev) prev.disabled = followupsPage <= 1;
  if (next) next.disabled = followupsPage >= pageCount;
}

function openFollowupDialog(customerId = null, followup = null) {
  editingFollowupId = followup?.id || null;
  document.getElementById("followupDialogTitle").textContent =
    followup ? "تعديل المتابعة" : "إضافة متابعة جديدة";
  document.getElementById("followupId").value = followup?.id || "";
  document.getElementById("followupCustomer").value = followup?.customerId || customerId || customers[0]?.id || "";
  document.getElementById("followupContactDate").value = followup?.contactDate || todayIso();
  document.getElementById("followupMethod").value = followup?.method || "اتصال";
  document.getElementById("followupRepresentative").value =
    followup?.representativeId
    || customerById(customerId)?.representativeId
    || representatives[0]?.uuid
    || "";
  document.getElementById("followupResult").value = followup?.result || "تم التواصل";
  document.getElementById("followupQuotationNumber").value = followup?.quotationNumber || "";
  document.getElementById("followupNoSaleReason").value = followup?.noSaleReasonId || "";
  document.getElementById("nextFollowupDate").value = followup?.nextFollowupDate || "";
  document.getElementById("followupCompleted").value = String(followup?.completed || false);
  document.getElementById("followupNotes").value = followup?.notes || "";
  document.getElementById("followupDialog").showModal();
}

function closeFollowupDialog() {
  document.getElementById("followupDialog").close();
  document.getElementById("followupForm").reset();
  editingFollowupId = null;
}

async function handleFollowupSubmit(event) {
  event.preventDefault();

  if (!canManageFollowups()) {
    alert("لا توجد صلاحية لإدارة المتابعات.");
    return;
  }

  const customerId = document.getElementById("followupCustomer").value;
  const representativeId = document.getElementById("followupRepresentative").value;

  if (!customerId) {
    alert("اختر العميل.");
    return;
  }

  if (!representativeId) {
    alert("اختر المندوب المسؤول.");
    return;
  }

  const submitButton = event.submitter;
  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "جاري الحفظ...";
    }

    await window.FollowupsService.saveFollowup({
      id: editingFollowupId,
      customerId,
      contactDate: document.getElementById("followupContactDate").value,
      method: document.getElementById("followupMethod").value,
      representativeId,
      result: document.getElementById("followupResult").value,
      quotationNumber: document.getElementById("followupQuotationNumber").value,
      noSaleReasonId: document.getElementById("followupNoSaleReason").value || null,
      nextFollowupDate: document.getElementById("nextFollowupDate").value,
      completed: document.getElementById("followupCompleted").value === "true",
      notes: document.getElementById("followupNotes").value
    });

    closeFollowupDialog();
    followupsLoaded = false;
    customersLoaded = false;
    await Promise.all([
      loadFollowupsFromSupabase(true),
      loadCustomersFromSupabase(true)
    ]);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حفظ المتابعة.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "حفظ المتابعة";
    }
  }
}

async function deleteFollowup(id) {
  if (!canManageFollowups()) {
    alert("لا توجد صلاحية لحذف المتابعات.");
    return;
  }

  const item = followups.find(followup => followup.id === id);
  if (!item) return;
  if (!confirm("هل تريد حذف هذه المتابعة؟")) return;

  try {
    await window.FollowupsService.deleteFollowup(item);
    followupsLoaded = false;
    customersLoaded = false;
    await Promise.all([
      loadFollowupsFromSupabase(true),
      loadCustomersFromSupabase(true)
    ]);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حذف المتابعة.");
  }
}

function customer360TimelineIcon(type) {
  const icons = {
    customer: "C",
    followup: "F",
    quotation: "Q"
  };
  return icons[type] || "•";
}

function customer360TimelineStatusLabel(status) {
  const labels = {
    completed: "مكتملة",
    overdue: "متأخرة",
    today: "اليوم",
    upcoming: "قادمة",
    no_date: "بدون موعد",
    accepted: "مقبول",
    rejected: "مرفوض",
    open: "مفتوح",
    info: "معلومة"
  };
  return labels[status] || status || "—";
}

function renderCustomer360UnifiedTimeline(view) {
  const timelineContainer = document.getElementById("customer360UnifiedTimeline");
  if (!timelineContainer) return;

  const filtered = customer360ActivityFilter === "all"
    ? view.timeline
    : view.timeline.filter(item => item.type === customer360ActivityFilter);

  timelineContainer.innerHTML = filtered.length
    ? filtered.map(item => `
      <article class="customer360-activity-item type-${item.type} status-${item.status}">
        <div class="customer360-activity-icon">${escapeHtml(customer360TimelineIcon(item.type))}</div>
        <div class="customer360-activity-content">
          <div class="customer360-activity-head">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.typeLabel)} · ${formatDate(item.date)}</small>
            </div>
            <span>${escapeHtml(customer360TimelineStatusLabel(item.status))}</span>
          </div>
          <p>${escapeHtml(item.detail || "—")}</p>
          <small>${escapeHtml(item.meta || "—")}</small>
        </div>
      </article>
    `).join("")
    : '<div class="empty-state">لا توجد أحداث من هذا النوع.</div>';
}

function customer360RiskClass(score) {
  const value = Number(score || 0);
  if (value >= 70) return "critical";
  if (value >= 45) return "high";
  if (value >= 20) return "medium";
  return "low";
}

function customer360PriorityLabelClass(key) {
  return ["critical", "high", "medium", "low"].includes(key)
    ? key
    : "low";
}

function customer360StatusClass(key) {
  const supported = [
    "active",
    "overdue",
    "needs_followup",
    "inactive",
    "today"
  ];
  return supported.includes(key) ? key : "inactive";
}

function customer360Metric(label, value, detail = "") {
  return `
    <article class="customer360-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value ?? "—"))}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </article>
  `;
}

function showCustomerDetails(customerId) {
  const customer = customerById(customerId);
  if (!customer || !window.Customer360Engine) return;

  const view = window.Customer360Engine.build(
    customer,
    followups,
    quotations
  );

  currentCustomer360View = view;

  document.getElementById("customerDetailsDialog").dataset.customerId = customerId;
  document.getElementById("customerDetailsTitle").textContent =
    `${customer.name} — Customer 360°`;
  document.getElementById("customerDetailsSubtitle").textContent =
    `${customer.phone || "بدون جوال"} · ${customer.type || "غير محدد"} · ${customer.representative || "بدون مندوب"}`;

  const statusBadge = document.getElementById("customer360StatusBadge");
  statusBadge.textContent = view.status.label;
  statusBadge.className =
    `customer360-status ${customer360StatusClass(view.status.key)}`;

  const editButton = document.getElementById("customer360EditBtn");
  const followupButton = document.getElementById("customer360AddFollowupBtn");
  editButton.classList.toggle("hidden", !canManageCustomers());
  followupButton.classList.toggle("hidden", !canManageFollowups());

  const profile = [
    ["رقم العميل", customer.customerNumber || customer.phone || "—"],
    ["رقم الجوال", customer.phone || "—"],
    ["التصنيف", customer.type || "—"],
    ["اسم المسؤول", customer.type === "شركة" ? (customer.contactPersonName || "—") : "—"],
    ["المدينة", customer.city || "—"],
    ["المندوب", customer.representative || "—"],
    ["تاريخ التواصل", formatDate(customer.contactDate)],
    ["آخر عرض مسجل", customer.quotationNumber || "—"],
    ["سبب عدم البيع", customer.noSaleReason || "—"]
  ];

  const nextFollowup = view.followups.find(item =>
    ["today", "upcoming"].includes(
      item.completed
        ? "completed"
        : (() => {
            const next = item.nextFollowupDate
              ? new Date(`${String(item.nextFollowupDate).slice(0, 10)}T00:00:00`)
              : null;
            if (!next) return "no_date";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (next < today) return "overdue";
            if (next.getTime() === today.getTime()) return "today";
            return "upcoming";
          })()
    )
  );

  document.getElementById("customerDetailsContent").innerHTML = `
    <section class="customer360-overview">
      <article class="customer360-status-card ${customer360StatusClass(view.status.key)}">
        <div>
          <span>حالة العميل</span>
          <strong>${escapeHtml(view.status.label)}</strong>
          <p>${escapeHtml(view.status.detail)}</p>
        </div>
        <div class="customer360-last-contact">
          <span>آخر تواصل</span>
          <strong>${view.lastContactDate ? formatDate(view.lastContactDate) : "—"}</strong>
          <small>${view.inactivityDays === null ? "لا توجد مدة محسوبة" : `منذ ${view.inactivityDays} يوم`}</small>
        </div>
      </article>

      <div class="customer360-kpis">
        ${customer360Metric("إجمالي المتابعات", view.totals.followups, `المتأخرة: ${view.totals.overdueFollowups}`)}
        ${customer360Metric("المتابعات القادمة", view.totals.upcomingFollowups, nextFollowup?.nextFollowupDate ? `القادم: ${formatDate(nextFollowup.nextFollowupDate)}` : "لا يوجد موعد قادم")}
        ${customer360Metric("عروض الأسعار", view.totals.quotations, `المفتوحة: ${view.totals.openQuotations}`)}
        ${customer360Metric("قيمة العروض", formatCurrency(view.totals.totalQuotationValue), `المقبول: ${formatCurrency(view.totals.acceptedValue)}`)}
        ${customer360Metric("نسبة التحويل", `${view.totals.conversionRate.toFixed(1)}%`, `${view.totals.acceptedQuotations} عروض مقبولة`)}
      </div>

      <section class="customer360-risk-dashboard">
        <article class="customer360-health-gauge ${customer360RiskClass(view.risk.score)}">
          <div class="customer360-gauge-ring" style="--score:${view.risk.healthScore}">
            <div>
              <strong>${view.risk.healthScore}%</strong>
              <span>صحة العميل</span>
            </div>
          </div>
          <div>
            <span>درجة الخطر</span>
            <strong>${view.risk.score}%</strong>
            <small>${escapeHtml(view.risk.priority.label)}</small>
          </div>
        </article>

        <article class="customer360-risk-card">
          <div class="customer360-risk-card-head">
            <div>
              <span>أولوية المتابعة</span>
              <strong>${escapeHtml(view.risk.priority.label)}</strong>
            </div>
            <b class="${customer360PriorityLabelClass(view.risk.priority.key)}">${view.risk.score}% خطر</b>
          </div>
          <div class="customer360-risk-progress">
            <span class="${customer360RiskClass(view.risk.score)}" style="width:${view.risk.score}%"></span>
          </div>
          <ul class="customer360-risk-reasons">
            ${view.risk.reasons.slice(0, 4).map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}
          </ul>
        </article>

        <article class="customer360-next-action">
          <span>الإجراء التالي المقترح</span>
          <strong>${escapeHtml(view.risk.nextAction.title)}</strong>
          <p>${escapeHtml(view.risk.nextAction.detail)}</p>
          <div class="customer360-next-action-metrics">
            <small>التفاعل: ${view.risk.engagementScore}%</small>
            <small>استجابة المتابعة: ${view.risk.responseRate.toFixed(1)}%</small>
          </div>
        </article>
      </section>

      <div class="customer360-value-kpis">
        ${customer360Metric("قيمة العميل المقبولة", formatCurrency(view.totals.acceptedValue), view.risk.valueTier.label)}
        ${customer360Metric("القيمة المحتملة", formatCurrency(view.risk.potentialValue), `المفتوح: ${formatCurrency(view.risk.openValue)}`)}
        ${customer360Metric("قيمة العروض المرفوضة", formatCurrency(view.risk.rejectedValue), "فرص تحتاج مراجعة")}
        ${customer360Metric("مؤشر التفاعل", `${view.risk.engagementScore}%`, `استجابة: ${view.risk.responseRate.toFixed(1)}%`)}
      </div>
    </section>

    <div class="customer360-layout">
      <section class="customer360-main">
        <article class="customer360-section">
          <div class="customer360-section-header">
            <div>
              <h3>البيانات الأساسية</h3>
              <p>ملخص بيانات العميل المسجلة في النظام.</p>
            </div>
          </div>
          <div class="customer-profile-grid customer360-profile-grid">
            ${profile.map(([label, value]) =>
              `<div class="profile-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? "—"))}</strong></div>`
            ).join("")}
          </div>

          <h4>مجالات الاهتمام</h4>
          <div class="tag-list">
            ${(customer.interests || []).length
              ? customer.interests.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join("")
              : '<span class="customer360-empty-inline">لا توجد اهتمامات مسجلة.</span>'}
          </div>

          <h4>ملاحظات العميل</h4>
          <div class="customer360-notes">${escapeHtml(customer.notes || "لا توجد ملاحظات مسجلة.")}</div>
        </article>

        <article class="customer360-section">
          <div class="customer360-section-header">
            <div>
              <h3>عروض الأسعار</h3>
              <p>جميع عروض السعر المرتبطة بالعميل.</p>
            </div>
            <span>${view.totals.quotations} عرض</span>
          </div>
          ${view.quotations.length ? `
            <div class="customer360-quotation-list">
              ${view.quotations.map(q => `
                <article>
                  <div>
                    <strong>${escapeHtml(q.code || q.quotationNumber || "عرض بدون رقم")}</strong>
                    <small>${formatDate(q.quotationDate || q.createdAt)} · ${escapeHtml(q.status || "غير محدد")}</small>
                  </div>
                  <div>
                    <strong>${formatCurrency(q.amount)}</strong>
                    ${q.rejectionReason || q.noSaleReason
                      ? `<small>${escapeHtml(q.rejectionReason || q.noSaleReason)}</small>`
                      : ""}
                  </div>
                </article>
              `).join("")}
            </div>
          ` : '<div class="empty-state">لا توجد عروض أسعار لهذا العميل.</div>'}
        </article>
      </section>

      <aside class="customer360-side">
        <article class="customer360-section">
          <div class="customer360-section-header">
            <div>
              <h3>ملخص المتابعة</h3>
              <p>حالة مواعيد المتابعة الحالية.</p>
            </div>
          </div>
          <div class="customer360-followup-summary">
            <div><span>مكتملة</span><strong>${view.totals.completedFollowups}</strong></div>
            <div><span>متأخرة</span><strong>${view.totals.overdueFollowups}</strong></div>
            <div><span>قادمة</span><strong>${view.totals.upcomingFollowups}</strong></div>
          </div>
        </article>

        <article class="customer360-section">
          <div class="customer360-section-header">
            <div>
              <h3>آخر متابعة</h3>
              <p>أحدث تواصل مسجل مع العميل.</p>
            </div>
          </div>
          ${view.latestFollowup ? `
            <div class="customer360-latest-card">
              <strong>${escapeHtml(view.latestFollowup.result || "متابعة")}</strong>
              <span>${formatDate(view.latestFollowup.contactDate || view.latestFollowup.createdAt)}</span>
              <p>${escapeHtml(view.latestFollowup.method || "—")} · ${escapeHtml(view.latestFollowup.representative || "—")}</p>
              ${view.latestFollowup.notes ? `<p>${escapeHtml(view.latestFollowup.notes)}</p>` : ""}
            </div>
          ` : '<div class="empty-state">لم تتم إضافة متابعات.</div>'}
        </article>
      </aside>
    </div>

    <article class="customer360-section customer360-activity-section">
      <div class="customer360-section-header">
        <div>
          <h3>سجل النشاط الموحد</h3>
          <p>جميع أحداث العميل مرتبة من الأحدث إلى الأقدم.</p>
        </div>
        <span>${view.timeline.length} حدث</span>
      </div>

      <div class="customer360-activity-summary">
        <article>
          <span>آخر نشاط</span>
          <strong>${view.latestActivity ? formatDate(view.latestActivity.date) : "—"}</strong>
          <small>${view.latestActivity ? escapeHtml(view.latestActivity.typeLabel) : "لا يوجد نشاط"}</small>
        </article>
        <article>
          <span>المتابعات</span>
          <strong>${view.followups.length}</strong>
          <small>إجمالي المتابعات</small>
        </article>
        <article>
          <span>عروض الأسعار</span>
          <strong>${view.quotations.length}</strong>
          <small>إجمالي العروض</small>
        </article>
      </div>

      <div class="customer360-activity-filters">
        <button type="button" class="customer360-activity-filter active" data-customer360-filter="all">الكل</button>
        <button type="button" class="customer360-activity-filter" data-customer360-filter="followup">المتابعات</button>
        <button type="button" class="customer360-activity-filter" data-customer360-filter="quotation">عروض الأسعار</button>
        <button type="button" class="customer360-activity-filter" data-customer360-filter="customer">بيانات العميل</button>
      </div>

      <div id="customer360UnifiedTimeline" class="customer360-unified-timeline"></div>
    </article>

    <article class="customer360-section customer360-timeline-section">
      <div class="customer360-section-header">
        <div>
          <h3>سجل المتابعات</h3>
          <p>جميع عمليات التواصل مرتبة من الأحدث إلى الأقدم.</p>
        </div>
        <span>${view.totals.followups} متابعة</span>
      </div>
      ${view.followups.length ? `<div class="timeline customer360-timeline">${view.followups.map(item => `
        <div class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <strong>${escapeHtml(item.result || "متابعة")}</strong>
              <span>${formatDate(item.contactDate || item.createdAt)}</span>
            </div>
            <p>${escapeHtml(item.method || "—")} · ${escapeHtml(item.representative || "—")}</p>
            ${item.quotationNumber ? `<p>عرض السعر: ${escapeHtml(item.quotationNumber)}</p>` : ""}
            ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}
            ${item.nextFollowupDate ? `<p>المتابعة القادمة: ${formatDate(item.nextFollowupDate)}</p>` : ""}
          </div>
        </div>`).join("")}</div>` : '<div class="empty-state">لم تتم إضافة متابعات لهذا العميل.</div>'}
    </article>
  `;

  document.querySelectorAll("[data-customer360-filter]").forEach(button => {
    button.addEventListener("click", () => {
      customer360ActivityFilter = button.dataset.customer360Filter;
      document.querySelectorAll("[data-customer360-filter]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      renderCustomer360UnifiedTimeline(view);
    });
  });

  customer360ActivityFilter = "all";
  renderCustomer360UnifiedTimeline(view);
  document.getElementById("customerDetailsDialog").showModal();
}


function canManageQuotations() {
  return ["super_admin", "sales_manager", "sales_representative"].includes(currentRole());
}

async function loadQuotationsFromSupabase(force = false) {
  if (quotationsLoading || (quotationsLoaded && !force)) return;
  if (!window.QuotationsService || !window.customerSupabase) return;

  quotationsLoading = true;
  showDataStatus("quotationsStatus", "جاري تحميل عروض الأسعار من Supabase...", "info");

  try {
    quotations = await window.QuotationsService.listQuotations();
    quotationsLoaded = true;
    quotationsPage = 1;
    showDataStatus("quotationsStatus", "");
    renderQuotations();
    renderCustomers();
    renderDashboard();
  } catch (error) {
    console.error("Quotation loading failed:", error);
    showDataStatus(
      "quotationsStatus",
      error instanceof Error ? error.message : "تعذر تحميل عروض الأسعار.",
      "error"
    );
  } finally {
    quotationsLoading = false;
  }
}

function filteredQuotations() {
  const query = document.getElementById("quotationSearch").value.trim().toLowerCase();
  const status = document.getElementById("quotationStatusFilter").value;
  const rep = document.getElementById("quotationRepFilter").value;

  return [...quotations]
    .filter(item => {
      const customer = customerById(item.customerId);
      if (!customer) return false;
      const searchable = [
        item.code,
        customer.name,
        customer.phone,
        item.representative,
        item.status
      ].join(" ").toLowerCase();

      return (!query || searchable.includes(query))
        && (!status || item.status === status)
        && (!rep || item.representative === rep);
    })
    .sort((a, b) => String(b.quotationDate).localeCompare(String(a.quotationDate)));
}

function renderQuotations() {
  const totalValue = quotations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const accepted = quotations.filter(item => item.status === "مقبول");
  const acceptedValue = accepted.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const rejected = quotations.filter(item => item.status === "مرفوض").length;
  const conversionRate = quotations.length
    ? (accepted.length / quotations.length) * 100
    : 0;

  document.getElementById("quotationStats").innerHTML = [
    ["إجمالي العروض", quotations.length],
    ["إجمالي القيمة", formatCurrency(totalValue)],
    ["العروض المقبولة", accepted.length],
    ["قيمة العروض المقبولة", formatCurrency(acceptedValue)],
    ["العروض المرفوضة", rejected],
    ["نسبة التحويل", `${conversionRate.toFixed(1)}%`]
  ].map(([label, value]) =>
    `<article class="followup-stat"><span>${label}</span><strong>${value}</strong></article>`
  ).join("");

  const allRows = filteredQuotations();
  const body = document.getElementById("quotationsTableBody");
  const pageCount = Math.max(1, Math.ceil(allRows.length / QUOTATIONS_PAGE_SIZE));

  if (quotationsPage > pageCount) quotationsPage = pageCount;
  const start = (quotationsPage - 1) * QUOTATIONS_PAGE_SIZE;
  const rows = allRows.slice(start, start + QUOTATIONS_PAGE_SIZE);

  document.getElementById("addQuotationBtn")
    ?.classList.toggle("hidden", !canManageQuotations());

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="10" class="empty-state">${
      quotationsLoaded ? "لا توجد عروض أسعار مطابقة." : "جاري تحميل عروض الأسعار..."
    }</td></tr>`;
  } else {
    body.innerHTML = rows.map(item => {
      const customer = customerById(item.customerId);
      const customerName = customer?.name || item.customerName || "عميل غير معروف";
      const customerPhone = customer?.phone || item.customerPhone || "—";
      const statusClass = quotationStatusClass(item.status);

      return `
        <tr>
          <td><strong>${escapeHtml(item.code)}</strong></td>
          <td>${escapeHtml(customerName)}</td>
          <td>${escapeHtml(customerPhone)}</td>
          <td>${escapeHtml(item.representative || "—")}</td>
          <td>${formatDate(item.quotationDate)}</td>
          <td class="quotation-value">${formatCurrency(item.amount)}</td>
          <td><span class="quotation-status quotation-status-${statusClass}">${escapeHtml(item.status)}</span></td>
          <td>${formatDate(item.expiryDate)}</td>
          <td>${escapeHtml(item.rejectionReason || "—")}</td>
          <td>
            <div class="row-actions">
              ${canManageQuotations() ? `<button class="edit-btn" data-edit-quotation="${item.id}">تعديل</button>` : ""}
              ${canManageQuotations() ? `<button class="delete-btn" data-delete-quotation="${item.id}">حذف</button>` : ""}
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  const info = document.getElementById("quotationsPaginationInfo");
  const pageNumber = document.getElementById("quotationsPageNumber");
  const prev = document.getElementById("quotationsPrevPage");
  const next = document.getElementById("quotationsNextPage");

  if (info) info.textContent = `${allRows.length} عرض`;
  if (pageNumber) pageNumber.textContent = `${quotationsPage} / ${pageCount}`;
  if (prev) prev.disabled = quotationsPage <= 1;
  if (next) next.disabled = quotationsPage >= pageCount;
}

function openQuotationDialog(quotation = null, customerId = null) {
  editingQuotationId = quotation?.id || null;
  document.getElementById("quotationDialogTitle").textContent =
    quotation ? "تعديل عرض السعر" : "إضافة عرض سعر";

  document.getElementById("quotationId").value = quotation?.id || "";
  document.getElementById("quotationCode").value = quotation?.code || nextQuotationCode();
  document.getElementById("quotationCustomer").value =
    quotation?.customerId || customerId || customers[0]?.id || "";
  document.getElementById("quotationRepresentative").value =
    quotation?.representativeId
    || customerById(customerId)?.representativeId
    || representatives[0]?.uuid
    || "";
  document.getElementById("quotationDate").value = quotation?.quotationDate || todayIso();
  document.getElementById("quotationAmount").value = quotation?.amount ?? "";
  document.getElementById("quotationStatus").value = quotation?.status || "تحت التجهيز";
  document.getElementById("quotationExpiryDate").value = quotation?.expiryDate || "";
  document.getElementById("quotationRejectionReason").value =
    quotation?.rejectionReasonId || "";
  document.getElementById("quotationDescription").value = quotation?.description || "";
  document.getElementById("quotationNotes").value = quotation?.notes || "";

  document.getElementById("quotationDialog").showModal();
}

function closeQuotationDialog() {
  document.getElementById("quotationDialog").close();
  document.getElementById("quotationForm").reset();
  editingQuotationId = null;
}

async function handleQuotationSubmit(event) {
  event.preventDefault();

  if (!canManageQuotations()) {
    alert("لا توجد صلاحية لإدارة عروض الأسعار.");
    return;
  }

  const code = document.getElementById("quotationCode").value.trim();
  const customerId = document.getElementById("quotationCustomer").value;
  const representativeId = document.getElementById("quotationRepresentative").value;
  const status = document.getElementById("quotationStatus").value;
  const rejectionReasonId = document.getElementById("quotationRejectionReason").value || null;
  const amount = Number(document.getElementById("quotationAmount").value || 0);

  if (!code) {
    alert("أدخل رقم عرض السعر.");
    document.getElementById("quotationCode").focus();
    return;
  }

  if (!customerId) {
    alert("اختر العميل.");
    return;
  }

  if (!representativeId) {
    alert("اختر المندوب المسؤول.");
    return;
  }

  if (amount < 0) {
    alert("قيمة عرض السعر لا يمكن أن تكون سالبة.");
    return;
  }

  if (status === "مرفوض" && !rejectionReasonId) {
    alert("اختر سبب رفض عرض السعر.");
    document.getElementById("quotationRejectionReason").focus();
    return;
  }

  const submitButton = event.submitter;

  try {
    const duplicate = await window.QuotationsService.findByNumber(code, editingQuotationId);

    if (duplicate) {
      alert(`رقم عرض السعر ${code} مسجل بالفعل ولا يمكن تكراره.`);
      document.getElementById("quotationCode").focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "جاري الحفظ...";
    }

    await window.QuotationsService.saveQuotation({
      id: editingQuotationId,
      code,
      customerId,
      representativeId,
      quotationDate: document.getElementById("quotationDate").value,
      amount,
      status,
      expiryDate: document.getElementById("quotationExpiryDate").value,
      rejectionReasonId,
      description: document.getElementById("quotationDescription").value,
      notes: document.getElementById("quotationNotes").value
    });

    closeQuotationDialog();
    quotationsLoaded = false;
    customersLoaded = false;

    await Promise.all([
      loadQuotationsFromSupabase(true),
      loadCustomersFromSupabase(true)
    ]);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حفظ عرض السعر.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "حفظ عرض السعر";
    }
  }
}

async function deleteQuotation(id) {
  if (!canManageQuotations()) {
    alert("لا توجد صلاحية لحذف عروض الأسعار.");
    return;
  }

  const item = quotations.find(quotation => quotation.id === id);
  if (!item) return;

  if (!confirm(`هل تريد حذف عرض السعر ${item.code}؟`)) return;

  try {
    await window.QuotationsService.deleteQuotation(item);
    quotationsLoaded = false;
    customersLoaded = false;

    await Promise.all([
      loadQuotationsFromSupabase(true),
      loadCustomersFromSupabase(true)
    ]);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر حذف عرض السعر.");
  }
}


function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-SA").format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function initializeSidebarGroups() {
  document.querySelectorAll(".nav-group").forEach(group => {
    const toggle = group.querySelector(".nav-group-toggle");
    const storageKey = `kyum-nav-group-${group.dataset.navGroup}`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState === "closed") {
      group.classList.add("is-collapsed");
      toggle?.setAttribute("aria-expanded", "false");
    }

    toggle?.addEventListener("click", () => {
      const collapsed = group.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      localStorage.setItem(storageKey, collapsed ? "closed" : "open");
    });
  });
}

initializeSidebarGroups();

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("[data-open-customers]").addEventListener("click", () => switchView("customers"));

["dashboardRepFilter", "dashboardTypeFilter", "dashboardInterestFilter", "dashboardDateFrom", "dashboardDateTo"].forEach(id => {
  document.getElementById(id).addEventListener("change", renderDashboard);
});

document.getElementById("resetDashboardFilters").addEventListener("click", () => {
  document.getElementById("dashboardRepFilter").value = "";
  document.getElementById("dashboardTypeFilter").value = "";
  document.getElementById("dashboardInterestFilter").value = "";
  document.getElementById("dashboardDateFrom").value = "";
  document.getElementById("dashboardDateTo").value = "";
  renderDashboard();
});

document.querySelector("[data-open-followups]").addEventListener("click", () => switchView("followups"));

document.getElementById("addCustomerBtn").addEventListener("click", () => openCustomerDialog());
document.getElementById("customerType")?.addEventListener("change", syncCustomerContactPersonField);
document.getElementById("addFollowupBtn").addEventListener("click", () => openFollowupDialog());
document.getElementById("addQuotationBtn").addEventListener("click", () => openQuotationDialog());
document.getElementById("closeQuotationDialogBtn").addEventListener("click", closeQuotationDialog);
document.getElementById("cancelQuotationDialogBtn").addEventListener("click", closeQuotationDialog);
document.getElementById("quotationForm").addEventListener("submit", handleQuotationSubmit);
document.getElementById("closeFollowupDialogBtn").addEventListener("click", closeFollowupDialog);
document.getElementById("cancelFollowupDialogBtn").addEventListener("click", closeFollowupDialog);
document.getElementById("followupForm").addEventListener("submit", handleFollowupSubmit);
document.getElementById("closeCustomerDetailsBtn").addEventListener("click", () => document.getElementById("customerDetailsDialog").close());
document.getElementById("customer360EditBtn")?.addEventListener("click", () => {
  const dialog = document.getElementById("customerDetailsDialog");
  const customer = customerById(dialog.dataset.customerId);
  if (!customer) return;
  dialog.close();
  openCustomerDialog(customer);
});
document.getElementById("customer360AddFollowupBtn")?.addEventListener("click", () => {
  const dialog = document.getElementById("customerDetailsDialog");
  const customerId = dialog.dataset.customerId;
  if (!customerId) return;
  dialog.close();
  openFollowupDialog(customerId);
});

document.getElementById("customer360ExportBtn")?.addEventListener("click", () => {
  if (!currentCustomer360View) return;
  document.getElementById("customer360ExportSubtitle").textContent =
    `${currentCustomer360View.customer.name} · ${currentCustomer360View.customer.phone || "بدون جوال"}`;
  document.getElementById("customer360ExportDialog").showModal();
});

function closeCustomer360ExportDialog() {
  document.getElementById("customer360ExportDialog").close();
}

document.getElementById("closeCustomer360ExportDialogBtn")?.addEventListener(
  "click",
  closeCustomer360ExportDialog
);
document.getElementById("closeCustomer360ExportDialogFooterBtn")?.addEventListener(
  "click",
  closeCustomer360ExportDialog
);

document.getElementById("customer360ExportExcelBtn")?.addEventListener("click", () => {
  if (!currentCustomer360View) return;
  try {
    window.Customer360Export.createExcel(currentCustomer360View);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر تصدير ملف Excel.");
  }
});

document.getElementById("customer360ExportPdfBtn")?.addEventListener("click", () => {
  if (!currentCustomer360View) return;
  try {
    window.Customer360Export.openPrint(currentCustomer360View);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر إنشاء تقرير PDF.");
  }
});

document.getElementById("customer360PrintBtn")?.addEventListener("click", () => {
  if (!currentCustomer360View) return;
  try {
    window.Customer360Export.openPrint(currentCustomer360View);
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر فتح الطباعة.");
  }
});

document.getElementById("customer360ExportPngBtn")?.addEventListener("click", async () => {
  if (!currentCustomer360View) return;

  const button = document.getElementById("customer360ExportPngBtn");
  button.disabled = true;
  button.textContent = "جاري إنشاء الصورة...";

  try {
    await window.Customer360Export.createPng(
      document.querySelector("#customerDetailsDialog .customer360-shell"),
      currentCustomer360View
    );
  } catch (error) {
    alert(error instanceof Error ? error.message : "تعذر تصدير صورة PNG.");
  } finally {
    button.disabled = false;
    button.textContent = "تصدير PNG";
  }
});


document.getElementById("closeDialogBtn").addEventListener("click", closeCustomerDialog);
document.getElementById("cancelDialogBtn").addEventListener("click", closeCustomerDialog);
document.getElementById("customerForm").addEventListener("submit", handleCustomerSubmit);

["customerSearch", "typeFilter", "interestFilter", "repFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    customersPage = 1;
    renderCustomers();
  });
  document.getElementById(id).addEventListener("change", () => {
    customersPage = 1;
    renderCustomers();
  });
});

["followupSearch", "followupStatusFilter", "followupRepFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    followupsPage = 1;
    renderFollowups();
  });
  document.getElementById(id).addEventListener("change", () => {
    followupsPage = 1;
    renderFollowups();
  });
});

["quotationSearch", "quotationStatusFilter", "quotationRepFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    quotationsPage = 1;
    renderQuotations();
  });

  document.getElementById(id).addEventListener("change", () => {
    quotationsPage = 1;
    renderQuotations();
  });
});

document.getElementById("customersTableBody").addEventListener("click", event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const detailsId = event.target.dataset.details;
  const addFollowupCustomerId = event.target.dataset.addFollowup;

  if (editId) {
    const customer = customers.find(item => item.id === editId);
    if (customer) openCustomerDialog(customer);
  }

  if (deleteId) deleteCustomer(deleteId);
  if (detailsId) showCustomerDetails(detailsId);
  if (addFollowupCustomerId) openFollowupDialog(addFollowupCustomerId);
});

document.getElementById("followupsTableBody").addEventListener("click", event => {
  const editId = event.target.dataset.editFollowup;
  const deleteId = event.target.dataset.deleteFollowup;

  if (editId) {
    const item = followups.find(followup => followup.id === editId);
    if (item) openFollowupDialog(null, item);
  }

  if (deleteId) deleteFollowup(deleteId);
});

document.getElementById("quotationsTableBody").addEventListener("click", event => {
  const editId = event.target.dataset.editQuotation;
  const deleteId = event.target.dataset.deleteQuotation;

  if (editId) {
    const item = quotations.find(quotation => quotation.id === editId);
    if (item) openQuotationDialog(item);
  }

  if (deleteId) deleteQuotation(deleteId);
});


document.getElementById("addRepresentativeBtn")?.addEventListener("click", () => openRepresentativeDialog());
document.getElementById("closeRepresentativeDialogBtn")?.addEventListener("click", closeRepresentativeDialog);
document.getElementById("cancelRepresentativeDialogBtn")?.addEventListener("click", closeRepresentativeDialog);
document.getElementById("representativeForm")?.addEventListener("submit", saveRepresentativeForm);

document.getElementById("closeReferenceDialogBtn")?.addEventListener("click", closeReferenceDialog);
document.getElementById("cancelReferenceDialogBtn")?.addEventListener("click", closeReferenceDialog);
document.getElementById("referenceItemForm")?.addEventListener("submit", saveReferenceForm);

document.querySelectorAll("[data-add-reference]").forEach(button => {
  button.addEventListener("click", () => openReferenceDialog(button.dataset.addReference));
});

document.getElementById("representativesGrid")?.addEventListener("click", event => {
  const id = event.target.dataset.editRepresentative;
  if (!id) return;
  const record = representativeRecords.find(item => item.id === id);
  if (record) openRepresentativeDialog(record);
});

document.getElementById("settingsView")?.addEventListener("click", event => {
  const id = event.target.dataset.editReference;
  const type = event.target.dataset.referenceType;
  if (!id || !type) return;
  const records = type === "interest" ? interestRecords : reasonRecords;
  const record = records.find(item => item.id === id);
  if (record) openReferenceDialog(type, record);
});

window.addEventListener("customer-auth-ready", async () => {
  await loadReferenceDataFromSupabase(true);
  await loadCustomersFromSupabase(true);
  await loadFollowupsFromSupabase(true);
  await loadQuotationsFromSupabase(true);
  populateSecurityOptions();
  renderDashboard();
});


document.getElementById("customersPrevPage")?.addEventListener("click", () => {
  if (customersPage > 1) {
    customersPage -= 1;
    renderCustomers();
  }
});

document.getElementById("customersNextPage")?.addEventListener("click", () => {
  const pageCount = Math.max(1, Math.ceil(filteredCustomers().length / CUSTOMERS_PAGE_SIZE));
  if (customersPage < pageCount) {
    customersPage += 1;
    renderCustomers();
  }
});


document.getElementById("followupsPrevPage")?.addEventListener("click", () => {
  if (followupsPage > 1) {
    followupsPage -= 1;
    renderFollowups();
  }
});

document.getElementById("followupsNextPage")?.addEventListener("click", () => {
  const pageCount = Math.max(1, Math.ceil(filteredFollowups().length / FOLLOWUPS_PAGE_SIZE));
  if (followupsPage < pageCount) {
    followupsPage += 1;
    renderFollowups();
  }
});


document.getElementById("quotationsPrevPage")?.addEventListener("click", () => {
  if (quotationsPage > 1) {
    quotationsPage -= 1;
    renderQuotations();
  }
});

document.getElementById("quotationsNextPage")?.addEventListener("click", () => {
  const pageCount = Math.max(
    1,
    Math.ceil(filteredQuotations().length / QUOTATIONS_PAGE_SIZE)
  );

  if (quotationsPage < pageCount) {
    quotationsPage += 1;
    renderQuotations();
  }
});


document.getElementById("addUserBtn")?.addEventListener("click", () => openUserDialog());
document.getElementById("closeUserDialogBtn")?.addEventListener("click", closeUserDialog);
document.getElementById("cancelUserDialogBtn")?.addEventListener("click", closeUserDialog);
document.getElementById("userForm")?.addEventListener("submit", saveUserForm);

document.getElementById("usersTableBody")?.addEventListener("click", event => {
  const editId = event.target.dataset.editUser;
  const resetId = event.target.dataset.resetPassword;
  if (editId) {
    const user = userRecords.find(item => item.id === editId);
    if (user) openUserDialog(user);
  }
  if (resetId) resetUserPassword(resetId);
});

["usersSearch","usersRoleFilter","usersStatusFilter"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", renderUsers);
  document.getElementById(id)?.addEventListener("change", renderUsers);
});

document.getElementById("permissionsRoleSelect")?.addEventListener("change", event => {
  loadRolePermissions(event.target.value).catch(error => showDataStatus("permissionsStatus", error.message, "error"));
});
document.getElementById("savePermissionsBtn")?.addEventListener("click", savePermissions);
document.getElementById("refreshActivityBtn")?.addEventListener("click", () => loadActivity(true));
["activitySearch","activityActionFilter"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", renderActivity);
  document.getElementById(id)?.addEventListener("change", renderActivity);
});


document.getElementById("createBackupBtn")?.addEventListener("click", exportBackup);
document.getElementById("downloadBackupBtn")?.addEventListener("click", exportBackup);
document.getElementById("backupFileInput")?.addEventListener("change", event => {
  inspectBackupFile(event.target.files?.[0] || null);
});
document.getElementById("restoreBackupBtn")?.addEventListener("click", restoreSelectedBackup);
document.getElementById("refreshBackupHistoryBtn")?.addEventListener("click", () => loadBackupHistory(true));
document.getElementById("saveSystemSettingsBtn")?.addEventListener("click", saveSystemSettings);
document.getElementById("systemSettingsForm")?.addEventListener("submit", saveSystemSettings);

document.getElementById("refreshSystemHealthBtn")?.addEventListener("click", () => loadSystemHealth(true));
document.getElementById("refreshReportsBtn")?.addEventListener("click", async () => {
  await Promise.all([
    loadCustomersFromSupabase(true),
    loadFollowupsFromSupabase(true),
    loadQuotationsFromSupabase(true)
  ]);
  populateReportsRepresentativeFilter();
  renderReportsOverview();
});
document.getElementById("openExportCenterBtn")?.addEventListener("click", openReportsExportCenter);
document.getElementById("closeReportsExportDialogBtn")?.addEventListener("click", closeReportsExportCenter);
document.getElementById("closeReportsExportDialogFooterBtn")?.addEventListener("click", closeReportsExportCenter);
document.getElementById("exportReportsExcelBtn")?.addEventListener("click", exportReportsExcel);
document.getElementById("exportReportsPdfBtn")?.addEventListener("click", exportReportsPdf);
document.getElementById("exportReportsPngBtn")?.addEventListener("click", exportReportsPng);
document.getElementById("exportReportsCsvBtn")?.addEventListener("click", exportReportsCsv);
document.getElementById("resetReportsFiltersBtn")?.addEventListener("click", resetReportsFilters);
["reportsDateFrom","reportsDateTo","reportsRepresentativeFilter"].forEach(id => {
  document.getElementById(id)?.addEventListener("change", renderReportsOverview);
});
document.getElementById("reportsSalesTarget")?.addEventListener("change", () => {
  saveReportsTarget();
  renderReportsOverview();
});
document.querySelectorAll("[data-customer-analytics]").forEach(button => {
  button.addEventListener("click", () => {
    activeCustomerAnalyticsTab = button.dataset.customerAnalytics;
    document.querySelectorAll("[data-customer-analytics]").forEach(item => {
      item.classList.toggle("active", item === button);
    });
    if (currentReportsSnapshot) renderCustomerAnalytics(currentReportsSnapshot);
  });
});


document.getElementById("runDiagnosticsBtn")?.addEventListener("click", runEnterpriseDiagnostics);
document.getElementById("downloadDiagnosticsJsonBtn")?.addEventListener("click", () => {
  if (!latestDiagnosticsReport) return;
  const stamp = new Date().toISOString().replaceAll(":", "-");
  downloadTextFile(
    `kyum-diagnostics-${stamp}.json`,
    JSON.stringify(latestDiagnosticsReport, null, 2),
    "application/json;charset=utf-8"
  );
});
document.getElementById("downloadDiagnosticsHtmlBtn")?.addEventListener("click", () => {
  if (!latestDiagnosticsReport) return;
  const stamp = new Date().toISOString().replaceAll(":", "-");
  downloadTextFile(
    `kyum-diagnostics-${stamp}.html`,
    diagnosticsHtml(latestDiagnosticsReport),
    "text/html;charset=utf-8"
  );
});

document.getElementById("resetPerformanceMetricsBtn")?.addEventListener("click", () => {
  window.PerformanceMonitor?.reset?.();
  window.HealthAlertsEngine?.resetHistory?.();
  renderPerformanceMonitor();
  if (systemHealthSnapshot) renderSystemHealth();
});

setOptions();
(() => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = document.getElementById("reportsDateFrom");
  const to = document.getElementById("reportsDateTo");
  if (from) from.value = first.toISOString().slice(0, 10);
  if (to) to.value = now.toISOString().slice(0, 10);
  const target = document.getElementById("reportsSalesTarget");
  if (target) {
    target.value = localStorage.getItem("kyum_reports_sales_target") || "100000";
  }
})();

