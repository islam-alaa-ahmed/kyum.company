// KYUM Phase 12 — Backup Service
(function () {
  function client() {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    return window.customerSupabase;
  }

  async function invoke(body) {
    const { data, error } = await client().functions.invoke("backup-admin", { body });
    if (error) throw new Error(`تعذر تنفيذ عملية النسخ الاحتياطي: ${error.message}`);
    if (!data?.success) throw new Error(data?.error || "فشلت عملية النسخ الاحتياطي.");
    return data;
  }

  async function createBackup() {
    return invoke({ action: "export" });
  }

  async function validateBackup(backup) {
    return invoke({ action: "validate", backup });
  }

  async function restoreBackup(backup, confirmation) {
    return invoke({ action: "restore", backup, confirmation });
  }

  async function listHistory() {
    const { data, error } = await client()
      .from("backup_operations")
      .select(`
        id,
        operation_type,
        file_name,
        total_records,
        status,
        details,
        created_at,
        user:user_profiles (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(`تعذر تحميل سجل النسخ الاحتياطي: ${error.message}`);
    return data || [];
  }

  window.BackupService = Object.freeze({
    createBackup,
    validateBackup,
    restoreBackup,
    listHistory
  });
})();