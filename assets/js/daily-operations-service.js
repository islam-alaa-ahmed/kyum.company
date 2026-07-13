// KYUM Phase 16.1 — Daily Operations Supabase Service
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

  function normalize(row) {
    return {
      id: row.id,
      taskKey: row.task_key,
      taskName: row.task?.task_name || row.task_key,
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

  async function listForDate(workDate = todayIso()) {
    const { data, error } = await client()
      .from("daily_task_completions")
      .select(`
        id, task_key, work_date, user_id, representative_id,
        is_completed, completed_at, updated_at,
        task:daily_task_definitions(task_name),
        user_profile:user_profiles(full_name),
        representative:sales_representatives(full_name)
      `)
      .eq("work_date", workDate);

    if (error) throw new Error(`تعذر تحميل المهام اليومية: ${error.message}`);
    return (data || []).map(normalize);
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
        task:daily_task_definitions(task_name),
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
        metadata: { source: "kyum-crm-web", phase: "16.1" }
      });
    } catch (auditError) {
      console.warn("Daily task audit skipped:", auditError);
    }

    return normalize(data);
  }

  window.DailyOperationsService = Object.freeze({ todayIso, listForDate, setTaskState });
})();
