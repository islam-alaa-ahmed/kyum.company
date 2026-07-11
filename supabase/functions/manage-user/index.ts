import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Missing authorization.");

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = authorization.replace("Bearer ", "");
    const { data: caller, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !caller.user) throw new Error("Invalid user.");

    const { data: profile } = await admin.from("user_profiles").select("role,is_active").eq("id", caller.user.id).single();
    if (!profile?.is_active || profile.role !== "super_admin") {
      return new Response(JSON.stringify({ success: false, error: "Super Admin only." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await request.json();

    if (body.action === "create") {
      if (!body.email || !body.password || body.password.length < 8) throw new Error("Invalid email or password.");
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email, password: body.password, email_confirm: true,
        user_metadata: { full_name: body.full_name || "" }
      });
      if (error) throw error;

      const { error: updateError } = await admin.from("user_profiles").update({
        full_name: body.full_name || "", email: body.email, role: body.role || "viewer",
        representative_id: body.representative_id || null, is_active: body.is_active !== false,
        must_change_password: body.must_change_password !== false
      }).eq("id", data.user.id);

      if (updateError) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw updateError;
      }

      return new Response(JSON.stringify({ success: true, user: { id: data.user.id, email: data.user.email } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (body.action === "reset_password") {
      if (!body.user_id || !body.password || body.password.length < 8) throw new Error("Invalid password.");
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
      if (error) throw error;
      await admin.from("user_profiles").update({ must_change_password: true }).eq("id", body.user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});