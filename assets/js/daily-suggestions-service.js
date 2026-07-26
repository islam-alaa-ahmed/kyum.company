// Phase M10.6.2 — persisted daily customer suggestions service.
(function () {
  function client() {
    return window.customerSupabase || null;
  }

  function currentUserId() {
    return window.CustomerAuth?.getState?.().user?.id || null;
  }

  function riyadhDate() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  async function load(options = {}) {
    const supabase = client();
    const userId = options.userId || currentUserId();
    const suggestionDate = options.date || riyadhDate();

    if (!supabase) throw new Error("Supabase client is not available.");
    if (!userId) throw new Error("Authenticated user is required.");

    const { data: activeRows, error: activeError } = await supabase.rpc(
      "get_daily_customer_suggestions",
      { p_suggestion_date: suggestionDate, p_user_id: userId }
    );
    if (activeError) throw activeError;

    const { data: statusRows, error: statusError } = await supabase
      .from("daily_customer_suggestions")
      .select("customer_type,status")
      .eq("user_id", userId)
      .eq("suggestion_date", suggestionDate);
    if (statusError) throw statusError;

    const progress = {
      "شركة": { active: 0, completed: 0, total: 0 },
      "فردي": { active: 0, completed: 0, total: 0 }
    };

    (statusRows || []).forEach(row => {
      const type = row.customer_type === "فردي" ? "فردي" : "شركة";
      if (row.status === "completed") progress[type].completed += 1;
      if (row.status === "active") progress[type].active += 1;
      progress[type].total += 1;
    });

    return {
      date: suggestionDate,
      rows: Array.isArray(activeRows) ? activeRows : [],
      progress
    };
  }

  async function loadTeamSummary(options = {}) {
    const supabase = client();
    const suggestionDate = options.date || riyadhDate();

    if (!supabase) throw new Error("Supabase client is not available.");

    const { data, error } = await supabase.rpc(
      "get_daily_customer_suggestions_team_summary",
      { p_suggestion_date: suggestionDate }
    );
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function complete(options = {}) {
    const supabase = client();
    const suggestionId = options.suggestionId;
    const followupId = options.followupId;

    if (!supabase) throw new Error("Supabase client is not available.");
    if (!suggestionId) throw new Error("Suggestion id is required.");
    if (!followupId) throw new Error("Follow-up id is required.");

    const { data, error } = await supabase.rpc(
      "complete_daily_customer_suggestion",
      { p_suggestion_id: suggestionId, p_followup_id: followupId }
    );
    if (error) throw error;
    return Number(data || 0);
  }

  window.DailySuggestionsService = { load, loadTeamSummary, complete, riyadhDate };
})();
