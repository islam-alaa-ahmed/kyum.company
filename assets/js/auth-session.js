(function () {
  const state = { session: null, user: null, profile: null, initialized: false };
  const el = () => ({
    overlay: document.getElementById("authLoadingOverlay"),
    loginView: document.getElementById("loginView"),
    appView: document.getElementById("appView"),
    loginForm: document.getElementById("loginForm"),
    email: document.getElementById("loginEmail"),
    password: document.getElementById("loginPassword"),
    submit: document.getElementById("loginSubmitBtn"),
    message: document.getElementById("loginMessage"),
    logout: document.getElementById("logoutBtn"),
    userName: document.getElementById("currentUserName"),
    userMeta: document.getElementById("currentUserMeta")
  });

  function message(text="", type="error") {
    const node = el().message;
    if (!node) return;
    node.textContent = text;
    node.className = text ? `auth-message ${type}` : "auth-message hidden";
  }
  function loading(on) {
    const button = el().submit;
    if (!button) return;
    button.disabled = on;
    button.textContent = on ? "جاري تسجيل الدخول..." : "تسجيل الدخول";
  }
  function showLogin(text="") {
    const e = el();
    e.overlay?.classList.add("hidden");
    e.loginView?.classList.remove("hidden");
    e.appView?.classList.add("hidden");
    if (text) message(text);
  }
  function showApp() {
    const e = el();
    e.overlay?.classList.add("hidden");
    e.loginView?.classList.add("hidden");
    e.appView?.classList.remove("hidden");
  }
  async function loadProfile(userId) {
    const { data, error } = await window.customerSupabase
      .from("user_profiles")
      .select("id, full_name, email, role, representative_id, is_active, must_change_password, last_login_at")
      .eq("id", userId).single();
    if (error) throw new Error(`تعذر تحميل ملف المستخدم: ${error.message}`);
    if (!data?.is_active) throw new Error("هذا الحساب غير نشط.");
    return data;
  }
  async function activate(session) {
    if (!session?.user) return showLogin();
    const profile = await loadProfile(session.user.id);
    state.session = session; state.user = session.user; state.profile = profile;
    const e = el();
    const roleLabel = window.CustomerPermissions?.roleLabels?.[profile.role] || profile.role;
    if (e.userName) e.userName.textContent = profile.full_name || session.user.email || "مستخدم";
    if (e.userMeta) e.userMeta.textContent = `${roleLabel} · ${session.user.email || ""}`;
    const avatar = document.querySelector(".avatar");
    if (avatar) avatar.textContent = (profile.full_name || session.user.email || "م").trim().charAt(0).toUpperCase();
    window.CustomerPermissions?.apply(profile);
    await window.CustomerPermissions?.loadCurrentPermissions?.();
    window.CustomerPermissions?.applyScreenVisibility?.();
    showApp();
    window.dispatchEvent(new CustomEvent("customer-auth-ready", { detail: { session, user: session.user, profile } }));
  }
  async function initialize() {
    const status = window.customerSupabaseStatus;
    if (!status?.configured || !window.customerSupabase) return showLogin(status?.reason || "إعدادات Supabase غير مكتملة.");
    try {
      const { data, error } = await window.customerSupabase.auth.getSession();
      if (error) throw error;
      await activate(data.session);
    } catch (error) {
      showLogin(error instanceof Error ? error.message : "تعذر التحقق من الجلسة.");
    } finally { state.initialized = true; }
  }
  async function signIn(email, password) {
    message(""); loading(true);
    try {
      const { data, error } = await window.customerSupabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await activate(data.session);
    } catch (error) {
      const text = error?.message === "Invalid login credentials"
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        : (error instanceof Error ? error.message : "تعذر تسجيل الدخول.");
      message(text);
    } finally { loading(false); }
  }
  async function signOut() {
    try { await window.customerSupabase?.auth.signOut(); }
    finally {
      state.session = null; state.user = null; state.profile = null;
      showLogin(); message("تم تسجيل الخروج بنجاح.", "success");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const e = el();
    e.loginForm?.addEventListener("submit", event => { event.preventDefault(); signIn(e.email.value, e.password.value); });
    e.logout?.addEventListener("click", event => { event.preventDefault(); signOut(); });
    initialize();
    window.customerSupabase?.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") showLogin();
      else if (["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event) && session) {
        try { await activate(session); }
        catch (error) { await window.customerSupabase.auth.signOut(); showLogin(error instanceof Error ? error.message : "تعذر تفعيل الجلسة."); }
      }
    });
  });
  window.CustomerAuth = { getState: () => ({...state}), signIn, signOut };
})();
