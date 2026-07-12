import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLE_ORDER = [
  "interest_categories",
  "no_sale_reasons",
  "sales_representatives",
  "customers",
  "customer_interests",
  "customer_followups",
  "quotations",
  "system_settings",
  "app_screens",
  "role_screen_permissions",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateStructure(backup: any) {
  if (!backup || typeof backup !== "object") throw new Error("Invalid backup object.");
  if (backup.product !== "KYUM CRM") throw new Error("This file is not a KYUM CRM backup.");
  if (!backup.version || !backup.tables || typeof backup.tables !== "object") {
    throw new Error("Backup metadata or tables are missing.");
  }

  const counts: Record<string, number> = {};
  for (const table of TABLE_ORDER) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows)) throw new Error(`Missing or invalid table: ${table}`);
    counts[table] = rows.length;
  }
  return counts;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Missing authorization.");

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authorization.replace("Bearer ", "");
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData.user) throw new Error("Invalid authenticated user.");

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("role,is_active")
      .eq("id", callerData.user.id)
      .single();

    if (profileError || !profile?.is_active || profile.role !== "super_admin") {
      return jsonResponse({ success: false, error: "Super Admin only." }, 403);
    }

    const body = await request.json();

    if (body.action === "export") {
      const tables: Record<string, unknown[]> = {};
      for (const table of TABLE_ORDER) {
        const { data, error } = await admin.from(table).select("*");
        if (error) throw new Error(`Export failed for ${table}: ${error.message}`);
        tables[table] = data || [];
      }

      const generatedAt = new Date().toISOString();
      const fileName = `kyum-crm-backup-${generatedAt.slice(0, 10)}-${generatedAt.slice(11, 19).replaceAll(":", "-")}.json`;
      const totalRecords = Object.values(tables).reduce((sum, rows) => sum + rows.length, 0);
      const backup = {
        product: "KYUM CRM",
        version: "1.1",
        generated_at: generatedAt,
        generated_by: callerData.user.id,
        tables,
      };

      await admin.from("backup_operations").insert({
        operation_type: "export",
        file_name: fileName,
        total_records: totalRecords,
        status: "completed",
        details: { table_counts: Object.fromEntries(TABLE_ORDER.map((table) => [table, tables[table].length])) },
        created_by: callerData.user.id,
      });

      return jsonResponse({ success: true, file_name: fileName, total_records: totalRecords, backup });
    }

    if (body.action === "validate") {
      const counts = validateStructure(body.backup);
      return jsonResponse({
        success: true,
        version: body.backup.version,
        generated_at: body.backup.generated_at || null,
        table_counts: counts,
        total_records: Object.values(counts).reduce((sum, count) => sum + count, 0),
      });
    }

    if (body.action === "restore") {
      if (body.confirmation !== "RESTORE KYUM DATA") {
        throw new Error("Restore confirmation phrase is invalid.");
      }

      const counts = validateStructure(body.backup);
      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const fileName = `restore-${new Date().toISOString()}.json`;

      const { data: operation, error: operationError } = await admin
        .from("backup_operations")
        .insert({
          operation_type: "restore",
          file_name: fileName,
          total_records: totalRecords,
          status: "started",
          details: { table_counts: counts, restore_mode: "transactional_rpc" },
          created_by: callerData.user.id,
        })
        .select("id")
        .single();

      if (operationError) throw operationError;

      const { data: restoreResult, error: restoreError } = await admin.rpc(
        "restore_kyum_backup_transactional",
        {
          p_backup: body.backup,
          p_actor: callerData.user.id,
        },
      );

      if (restoreError) {
        await admin.from("backup_operations").update({
          status: "failed",
          details: {
            table_counts: counts,
            restore_mode: "transactional_rpc",
            error: restoreError.message,
          },
        }).eq("id", operation.id);
        throw new Error(`Transactional restore failed: ${restoreError.message}`);
      }

      await admin.from("backup_operations").update({
        status: "completed",
        details: {
          table_counts: restoreResult?.table_counts || counts,
          restore_mode: "transactional_rpc",
        },
      }).eq("id", operation.id);

      return jsonResponse({
        success: true,
        total_records: restoreResult?.total_records ?? totalRecords,
        table_counts: restoreResult?.table_counts ?? counts,
        transactional: true,
      });
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 400);
  }
});
