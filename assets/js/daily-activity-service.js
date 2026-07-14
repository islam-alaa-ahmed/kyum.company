// KYUM Phase 16.6 — Daily Attendance & Activity Timeline Service
(function () {
  let heartbeatTimer = null;
  let lastInteractionAt = Date.now();

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

  function authState() {
    return window.CustomerAuth?.getState?.() || {};
  }

  async function heartbeat(eventType = "heartbeat") {
    const state = authState();
    const userId = state.user?.id;
    if (!userId) return null;

    const { data, error } = await client().rpc(
      "touch_daily_employee_session",
      {
        p_event_type: eventType,
        p_representative_id: state.profile?.representative_id || null
      }
    );

    if (error) {
      console.warn("Daily activity heartbeat failed:", error);
      return null;
    }
    return data;
  }

  function markInteraction() {
    lastInteractionAt = Date.now();
  }

  function startHeartbeat() {
    if (heartbeatTimer) return;

    ["click", "keydown", "input", "change", "pointerdown"].forEach(type => {
      document.addEventListener(type, markInteraction, { passive: true });
    });

    heartbeat("login");
    heartbeatTimer = window.setInterval(() => {
      const idleMinutes = (Date.now() - lastInteractionAt) / 60000;
      if (idleMinutes <= 15 && document.visibilityState === "visible") {
        heartbeat("heartbeat");
      }
    }, 5 * 60 * 1000);
  }

  async function endDay() {
    const state = authState();
    const userId = state.user?.id;
    if (!userId) throw new Error("تعذر تحديد المستخدم الحالي.");

    const { data, error } = await client().rpc(
      "end_daily_employee_session",
      {}
    );
    if (error) throw new Error(`تعذر إنهاء يوم العمل: ${error.message}`);
    return data;
  }

  async function getCurrentSession(workDate = localDate()) {
    const state = authState();
    const userId = state.user?.id;
    if (!userId) return null;

    const { data, error } = await client()
      .from("daily_employee_sessions")
      .select("*")
      .eq("work_date", workDate)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(`تعذر تحميل جلسة العمل: ${error.message}`);
    return data || null;
  }

  async function listSessions(workDate) {
    const { data, error } = await client()
      .from("daily_employee_sessions")
      .select(`
        id,user_id,representative_id,work_date,first_activity_at,
        last_activity_at,ended_at,heartbeat_count,event_count,last_event_type,
        user_profile:user_profiles(full_name,role,is_active),
        representative:sales_representatives(full_name,representative_code)
      `)
      .eq("work_date", workDate)
      .order("first_activity_at", { ascending: true });

    if (error) throw new Error(`تعذر تحميل الحضور اليومي: ${error.message}`);
    return data || [];
  }

  async function listAudit(workDate, limit = 1000) {
    const from = `${workDate}T00:00:00`;
    const toDate = new Date(`${workDate}T00:00:00`);
    toDate.setDate(toDate.getDate() + 1);

    const { data, error } = await client()
      .from("audit_logs")
      .select(`
        id,user_id,action,entity_type,entity_id,new_data,metadata,created_at,
        user:user_profiles(full_name,role,representative_id)
      `)
      .gte("created_at", from)
      .lt("created_at", toDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`تعذر تحميل سجل النشاط: ${error.message}`);
    return data || [];
  }

  async function listTaskEvents(workDate) {
    const { data, error } = await client()
      .from("daily_task_completions")
      .select(`
        id,user_id,representative_id,task_key,is_completed,completed_at,updated_at,
        task:daily_task_definitions(task_name),
        user_profile:user_profiles!daily_task_completions_user_profile_fkey(full_name,role)
      `)
      .eq("work_date", workDate)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(`تعذر تحميل أحداث المهام: ${error.message}`);
    return data || [];
  }

  async function listAlertEvents(workDate) {
    const { data, error } = await client()
      .from("daily_alert_actions")
      .select(`
        id,alert_id,action_type,note,action_by,created_at,
        user:user_profiles!daily_alert_actions_action_by_fkey(full_name,role),
        alert:daily_alerts!daily_alert_actions_alert_id_fkey(
          work_date,title,alert_type,severity,user_id,representative_id
        )
      `)
      .eq("alert.work_date", workDate)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Alert activity query skipped:", error);
      return [];
    }
    return data || [];
  }

  function categoryFor(entityType) {
    const type = String(entityType || "").toLowerCase();
    if (type.includes("customer_followup")) return "followups";
    if (type.includes("quotation")) return "quotations";
    if (type === "customers" || type.includes("customer")) return "customers";
    if (type.includes("daily_task")) return "daily_tasks";
    if (type.includes("daily_alert")) return "daily_alerts";
    if (type.includes("user") || type.includes("permission")) return "users";
    if (type.includes("interest") || type.includes("reason") || type.includes("representative")) {
      return "reference_data";
    }
    return "other";
  }

  function actionLabel(action) {
    const labels = {
      create: "إضافة",
      insert: "إضافة",
      update: "تعديل",
      delete: "حذف",
      complete: "إكمال",
      reopen: "إعادة فتح",
      start: "بدء المعالجة",
      escalate: "تصعيد",
      close: "إغلاق",
      login: "تسجيل الدخول",
      heartbeat: "نشاط داخل النظام",
      end_day: "إنهاء يوم العمل"
    };
    return labels[action] || action || "نشاط";
  }

  function buildTimeline({ sessions, auditLogs, taskEvents, alertEvents }) {
    const events = [];

    sessions.forEach(session => {
      events.push({
        id: `session-start-${session.id}`,
        userId: session.user_id,
        representativeId: session.representative_id,
        employeeName: session.user_profile?.full_name
          || session.representative?.full_name
          || "غير محدد",
        type: "session",
        action: "login",
        title: "بدء يوم العمل",
        detail: "تم تسجيل أول نشاط للمستخدم.",
        createdAt: session.first_activity_at
      });

      if (session.ended_at) {
        events.push({
          id: `session-end-${session.id}`,
          userId: session.user_id,
          representativeId: session.representative_id,
          employeeName: session.user_profile?.full_name
            || session.representative?.full_name
            || "غير محدد",
          type: "session",
          action: "end_day",
          title: "إنهاء يوم العمل",
          detail: `إجمالي العمليات المسجلة: ${session.event_count || 0}`,
          createdAt: session.ended_at
        });
      }
    });

    auditLogs.forEach(log => {
      events.push({
        id: `audit-${log.id}`,
        userId: log.user_id,
        representativeId: log.user?.representative_id || null,
        employeeName: log.user?.full_name || "غير محدد",
        type: categoryFor(log.entity_type),
        action: log.action,
        title: `${actionLabel(log.action)} — ${log.entity_type}`,
        detail: log.metadata?.description
          || log.new_data?.name
          || log.new_data?.customer_name
          || log.entity_id
          || "تم تسجيل عملية داخل النظام.",
        createdAt: log.created_at
      });
    });

    taskEvents.forEach(item => {
      events.push({
        id: `task-${item.id}`,
        userId: item.user_id,
        representativeId: item.representative_id,
        employeeName: item.user_profile?.full_name || "غير محدد",
        type: "daily_tasks",
        action: item.is_completed ? "complete" : "reopen",
        title: item.is_completed ? "إكمال مهمة يومية" : "إعادة فتح مهمة يومية",
        detail: item.task?.task_name || item.task_key,
        createdAt: item.completed_at || item.updated_at
      });
    });

    alertEvents.forEach(item => {
      events.push({
        id: `alert-${item.id}`,
        userId: item.action_by,
        representativeId: item.alert?.representative_id || null,
        employeeName: item.user?.full_name || "غير محدد",
        type: "daily_alerts",
        action: item.action_type,
        title: `${actionLabel(item.action_type)} تنبيه`,
        detail: [item.alert?.title, item.note].filter(Boolean).join(" — "),
        createdAt: item.created_at
      });
    });

    return events
      .filter(item => item.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async function load(workDate) {
    const [sessions, auditLogs, taskEvents, alertEvents] = await Promise.all([
      listSessions(workDate),
      listAudit(workDate),
      listTaskEvents(workDate),
      listAlertEvents(workDate)
    ]);

    return {
      sessions,
      timeline: buildTimeline({ sessions, auditLogs, taskEvents, alertEvents })
    };
  }

  window.DailyActivityService = Object.freeze({
    localDate,
    heartbeat,
    startHeartbeat,
    endDay,
    getCurrentSession,
    load
  });
})();