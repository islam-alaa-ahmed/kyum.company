// KYUM Phase 16.2 — Daily Performance Report Service
(function () {
  function client() {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  }

  function localDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  }

  async function loadTaskCompletions(workDate) {
    const { data, error } = await client()
      .from("daily_task_completions")
      .select(`
        id, task_key, work_date, user_id, representative_id,
        is_completed, completed_at, updated_at,
        user_profile:user_profiles(full_name, role, is_active),
        representative:sales_representatives(id, full_name, representative_code, is_active)
      `)
      .eq("work_date", workDate);

    if (error) throw new Error(`تعذر تحميل تنفيذ المهام: ${error.message}`);
    return data || [];
  }

  async function loadRepresentatives() {
    const { data, error } = await client()
      .from("sales_representatives")
      .select("id, representative_code, full_name, is_active")
      .order("full_name", { ascending: true });

    if (error) throw new Error(`تعذر تحميل المندوبين: ${error.message}`);
    return data || [];
  }

  async function loadUsers() {
    const { data, error } = await client()
      .from("user_profiles")
      .select("id, full_name, role, is_active, representative_id")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) throw new Error(`تعذر تحميل المستخدمين: ${error.message}`);
    return data || [];
  }

  function sameDate(value, date) {
    return localDate(value) === date;
  }

  function assignedTo(row, employee) {
    if (!employee) return false;

    return Boolean(
      (employee.representativeId && row.representativeId === employee.representativeId)
      || (employee.representativeName && row.representative === employee.representativeName)
      || (employee.userId && row.createdBy === employee.userId)
    );
  }

  function buildEmployees(users, representatives) {
    const repById = new Map(representatives.map(rep => [rep.id, rep]));
    const employees = [];
    const usedRepresentativeIds = new Set();

    users.forEach(user => {
      const rep = user.representative_id
        ? repById.get(user.representative_id)
        : null;

      if (rep?.id) usedRepresentativeIds.add(rep.id);

      employees.push({
        key: `user:${user.id}`,
        userId: user.id,
        representativeId: rep?.id || user.representative_id || null,
        representativeName: rep?.full_name || "",
        name: user.full_name || rep?.full_name || "مستخدم بدون اسم",
        code: rep?.representative_code || "",
        role: user.role || "",
        active: user.is_active !== false
      });
    });

    representatives.forEach(rep => {
      if (usedRepresentativeIds.has(rep.id)) return;
      employees.push({
        key: `rep:${rep.id}`,
        userId: null,
        representativeId: rep.id,
        representativeName: rep.full_name || "",
        name: rep.full_name || "مندوب بدون اسم",
        code: rep.representative_code || "",
        role: "sales_representative",
        active: rep.is_active !== false
      });
    });

    return employees.filter(item => item.active);
  }

  function buildReport({
    workDate,
    taskCompletions,
    users,
    representatives,
    customers,
    followups,
    quotations
  }) {
    const employees = buildEmployees(users, representatives);

    const rows = employees.map(employee => {
      const task = taskCompletions.find(item =>
        item.task_key === "ads_update"
        && (
          (employee.userId && item.user_id === employee.userId)
          || (
            employee.representativeId
            && item.representative_id === employee.representativeId
          )
        )
      );

      const employeeCustomers = customers.filter(item =>
        sameDate(item.createdAt || item.contactDate, workDate)
        && assignedTo(item, employee)
      );

      const employeeFollowups = followups.filter(item =>
        sameDate(item.contactDate || item.createdAt, workDate)
        && assignedTo(item, employee)
      );

      const employeeQuotations = quotations.filter(item =>
        sameDate(item.quotationDate || item.createdAt, workDate)
        && assignedTo(item, employee)
      );

      const overdueFollowups = followups.filter(item =>
        item.nextFollowupDate
        && localDate(item.nextFollowupDate) < workDate
        && !item.completed
        && assignedTo(item, employee)
      );

      const adsCompleted = Boolean(task?.is_completed);
      const points =
        (adsCompleted ? 20 : 0)
        + employeeCustomers.length * 10
        + employeeFollowups.length * 5
        + employeeQuotations.length * 15
        - Math.min(30, overdueFollowups.length * 3);

      const targetPoints = 100;
      const completionRate = Math.max(
        0,
        Math.min(100, Math.round(points / targetPoints * 100))
      );

      return {
        ...employee,
        adsCompleted,
        adsCompletedAt: task?.completed_at || null,
        customers: employeeCustomers,
        followups: employeeFollowups,
        quotations: employeeQuotations,
        overdueFollowups,
        points,
        completionRate
      };
    })
      .sort((a, b) =>
        b.points - a.points
        || b.followups.length - a.followups.length
        || a.name.localeCompare(b.name, "ar")
      )
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return {
      workDate,
      rows,
      totals: {
        employees: rows.length,
        adsCompleted: rows.filter(item => item.adsCompleted).length,
        customers: rows.reduce((sum, item) => sum + item.customers.length, 0),
        followups: rows.reduce((sum, item) => sum + item.followups.length, 0),
        quotations: rows.reduce((sum, item) => sum + item.quotations.length, 0),
        overdue: rows.reduce((sum, item) => sum + item.overdueFollowups.length, 0)
      },
      generatedAt: new Date().toISOString()
    };
  }

  async function loadReport(workDate, existingData) {
    const [taskCompletions, representatives, users] = await Promise.all([
      loadTaskCompletions(workDate),
      loadRepresentatives(),
      loadUsers()
    ]);

    return buildReport({
      workDate,
      taskCompletions,
      users,
      representatives,
      customers: existingData.customers || [],
      followups: existingData.followups || [],
      quotations: existingData.quotations || []
    });
  }

  function toCsv(report) {
    const lines = [
      ["KYUM Daily Performance Report", report.workDate],
      ["Generated At", report.generatedAt],
      [],
      [
        "Rank",
        "Employee",
        "Code",
        "Ads Updated",
        "New Customers",
        "Follow-ups",
        "Quotations",
        "Overdue",
        "Completion %",
        "Points"
      ],
      ...report.rows.map(item => [
        item.rank,
        item.name,
        item.code,
        item.adsCompleted ? "Completed" : "Not Completed",
        item.customers.length,
        item.followups.length,
        item.quotations.length,
        item.overdueFollowups.length,
        item.completionRate,
        item.points
      ])
    ];

    return "\ufeff" + lines.map(row =>
      row.map(value =>
        `"${String(value ?? "").replaceAll('"', '""')}"`
      ).join(",")
    ).join("\n");
  }

  window.DailyPerformanceService = Object.freeze({
    localDate,
    loadReport,
    toCsv
  });
})();