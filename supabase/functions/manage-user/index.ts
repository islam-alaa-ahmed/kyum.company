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

const RESTORE_DELETE_ORDER = [
  "customer_interests",
  "customer_followups",
  "quotations",
  "customers",
  "sales_representatives",
  "interest_categories",
  "no_sale_reasons",
  "role_screen_permissions",
  "app_screens",
  "system_settings",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function countRecords(tables: Record<string, unknown[]>) {
  return Object.values(tables).reduce(
    (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
    0,
  );
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
      const totalRecords = countRecords(tables);

      const backup = {
        product: "KYUM CRM",
        version: "1.0",
        generated_at: generatedAt,
        generated_by: callerData.user.id,
        tables,
      };

      await admin.from("backup_operations").insert({
        operation_type: "export",
        file_name: fileName,
        total_records: totalRecords,
        status: "completed",
        details: { table_counts: Object.fromEntries(TABLE_ORDER.map(t => [t, tables[t].length])) },
        created_by: callerData.user.id,
      });

      return jsonResponse({
        success: true,
        file_name: fileName,
        total_records: totalRecords,
        backup,
      });
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
      const backup = body.backup;
      const fileName = `restored-backup-${new Date().toISOString()}.json`;

      const { data: operation, error: operationError } = await admin
        .from("backup_operations")
        .insert({
          operation_type: "restore",
          file_name: fileName,
          total_records: Object.values(counts).reduce((sum, count) => sum + count, 0),
          status: "started",
          details: { table_counts: counts },
          created_by: callerData.user.id,
        })
        .select("id")
        .single();

      if (operationError) throw operationError;

      try {
        for (const table of RESTORE_DELETE_ORDER) {
          const { error } = await admin.from(table).delete().not("created_at", "is", null);
          if (error) {
            // Tables without created_at need a different universal predicate.
            const fallback = await admin.from(table).delete().neq(
              table === "system_settings" ? "setting_key" : table === "app_screens" ? "screen_key" : table === "role_screen_permissions" ? "screen_key" : "id",
              "__never__",
            );
            if (fallback.error) throw new Error(`Delete failed for ${table}: ${fallback.error.message}`);
          }
        }

        for (const table of TABLE_ORDER) {
          const rows = backup.tables[table];
          if (!rows.length) continue;

          const { error } = await admin.from(table).insert(rows);
          if (error) throw new Error(`Restore failed for ${table}: ${error.message}`);
        }

        await admin.from("backup_operations")
          .update({ status: "completed" })
          .eq("id", operation.id);

        return jsonResponse({
          success: true,
          total_records: Object.values(counts).reduce((sum, count) => sum + count, 0),
          table_counts: counts,
        });
      } catch (error) {
        await admin.from("backup_operations")
          .update({
            status: "failed",
            details: { table_counts: counts, error: error instanceof Error ? error.message : String(error) },
          })
          .eq("id", operation.id);
        throw error;
      }
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 400);
  }
});