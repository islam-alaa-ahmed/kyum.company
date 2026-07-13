// KYUM Phase 16.3 — Expanded Daily Operations Service
(function () {
  function client() {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  }

  function todayIso() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  }

  function normalizeCompletion(row) {
    return {
      id: row.id,
      taskKey: row.task_key,
      taskName: row.task?.task_name || row.task_key,
      permissionKey: row.task?.permission_key || "",
      workDate: row.work_date,
      userId: row.user_id,
      representativeId: row.representative_id || null,
      completed: Boolean(row.is_completed),
      completedAt: row.completed_at || null,
      updatedAt: row.updated_at || null,
      userName: row.user_profile?.full_name || "",
      representativeName: row.representative?.full_name || ""
    };
  }

  async function listDefinitions() {
    const { data, error } = await client()
      .from("daily_task_definitions")
      .select("task_key, task_name, description, display_order, permission_key, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw new Error(`تعذر تحميل تعريفات المهام: ${error.message}`);

    return (data || []).map(row => ({
      taskKey: row.task_key,
      taskName: row.task_name,
      description: row.description || "",
      displayOrder: Number(row.display_order || 100),
      permissionKey: row.permission_key || ""
    }));
  }

  async function listForDate(workDate = todayIso()) {
    const { data, error } = await client()
      .from("daily_task_completions")
      .select(`
        id, task_key, work_date, user_id, representative_id,
        is_completed, completed_at, updated_at,
        task:daily_task_definitions(task_name, permission_key),
        user_profile:user_profiles(full_name),
        representative:sales_representatives(full_name)
      `)
      .eq("work_date", workDate);

    if (error) throw new Error(`تعذر تحميل المهام اليومية: ${error.message}`);
    return (data || []).map(normalizeCompletion);
  }

  async function setTaskState(taskKey, completed, workDate = todayIso()) {
    const authState = window.CustomerAuth?.getState?.();
    const userId = authState?.user?.id;
    const representativeId = authState?.profile?.representative_id || null;
    if (!userId) throw new Error("تعذر تحديد المستخدم الحالي.");

    const payload = {
      task_key: taskKey,
      work_date: workDate,
      user_id: userId,
      representative_id: representativeId,
      is_completed: Boolean(completed),
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client()
      .from("daily_task_completions")
      .upsert(payload, { onConflict: "task_key,work_date,user_id" })
      .select(`
        id, task_key, work_date, user_id, representative_id,
        is_completed, completed_at, updated_at,
        task:daily_task_definitions(task_name, permission_key),
        user_profile:user_profiles(full_name),
        representative:sales_representatives(full_name)
      `)
      .single();

    if (error) throw new Error(`تعذر تحديث المهمة اليومية: ${error.message}`);

    try {
      await client().from("audit_logs").insert({
        user_id: userId,
        action: completed ? "complete" : "reopen",
        entity_type: "daily_task_completions",
        entity_id: String(data.id),
        new_data: { task_key: taskKey, work_date: workDate, is_completed: Boolean(completed) },
        metadata: { source: "kyum-crm-web", phase: "16.3" }
      });
    } catch (auditError) {
      console.warn("Daily task audit skipped:", auditError);
    }

    return normalizeCompletion(data);
  }

  async function getTargets(workDate = todayIso()) {
    const { data, error } = await client()
      .from("daily_operation_targets")
      .select("work_date, customers_target, followups_target, quotations_target, updated_at")
      .eq("work_date", workDate)
      .maybeSingle();

    if (error) throw new Error(`تعذر تحميل الأهداف اليومية: ${error.message}`);

    return data ? {
      workDate: data.work_date,
      customersTarget: Number(data.customers_target || 0),
      followupsTarget: Number(data.followups_target || 0),
      quotationsTarget: Number(data.quotations_target || 0),
      updatedAt: data.updated_at || null
    } : {
      workDate,
      customersTarget: 3,
      followupsTarget: 10,
      quotationsTarget: 3,
      updatedAt: null
    };
  }

  async function saveTargets(targets, workDate = todayIso()) {
    const auth = window.CustomerAuth?.getState?.();
    const payload = {
      work_date: workDate,
      customers_target: Math.max(0, Number(targets.customersTarget || 0)),
      followups_target: Math.max(0, Number(targets.followupsTarget || 0)),
      quotations_target: Math.max(0, Number(targets.quotationsTarget || 0)),
      updated_by: auth?.user?.id || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client()
      .from("daily_operation_targets")
      .upsert(payload, { onConflict: "work_date" })
      .select("*")
      .single();

    if (error) throw new Error(`تعذر حفظ الأهداف اليومية: ${error.message}`);
    return data;
  }

  async function getManagerNote(workDate = todayIso()) {
    const { data, error } = await client()
      .from("daily_manager_notes")
      .select("id, work_date, title, note_text, created_by, updated_at")
      .eq("work_date", workDate)
      .maybeSingle();

    if (error) throw new Error(`تعذر تحميل ملاحظة المدير: ${error.message}`);

    return data ? {
      id: data.id,
      workDate: data.work_date,
      title: data.title || "",
      noteText: data.note_text || "",
      createdBy: data.created_by || null,
      updatedAt: data.updated_at || null
    } : null;
  }

  async function saveManagerNote(note, workDate = todayIso()) {
    const auth = window.CustomerAuth?.getState?.();
    const payload = {
      work_date: workDate,
      title: String(note.title || "").trim(),
      note_text: String(note.noteText || "").trim(),
      created_by: auth?.user?.id || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client()
      .from("daily_manager_notes")
      .upsert(payload, { onConflict: "work_date" })
      .select("*")
      .single();

    if (error) throw new Error(`تعذر حفظ ملاحظة المدير: ${error.message}`);
    return data;
  }

  window.DailyOperationsService = Object.freeze({
    todayIso,
    listDefinitions,
    listForDate,
    setTaskState,
    getTargets,
    saveTargets,
    getManagerNote,
    saveManagerNote
  });
})();