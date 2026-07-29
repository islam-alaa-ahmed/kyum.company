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
  const AUTH_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  function authCacheNamespace(userId) {
    return `auth:${String(userId || "anonymous")}`;
  }

  function isNetworkFailure(error) {
    const text = String(error?.message || error || "").toLowerCase();
    return !navigator.onLine || text.includes("failed to fetch") || text.includes("network") || text.includes("load failed");
  }

  async function readCachedProfile(userId) {
    if (!window.KYUMSmartCache || !userId) return null;
    const cached = await window.KYUMSmartCache.get("current-profile", {
      namespace: authCacheNamespace(userId),
      allowStale: true,
      staleMaxMs: AUTH_CACHE_MAX_AGE_MS
    });
    return cached.hit ? cached.data : null;
  }

  async function cacheProfile(userId, profile) {
    if (!window.KYUMSmartCache || !userId || !profile) return;
    await window.KYUMSmartCache.set("current-profile", profile, {
      namespace: authCacheNamespace(userId),
      ttlMs: 24 * 60 * 60 * 1000,
      staleMaxMs: AUTH_CACHE_MAX_AGE_MS,
      source: "supabase-auth-profile",
      schemaVersion: 1
    });
  }

  async function loadProfile(userId) {
    const cachedProfile = await readCachedProfile(userId);

    if (!navigator.onLine) {
      if (!cachedProfile) throw new Error("فتح البرنامج بدون إنترنت متاح فقط بعد تسجيل دخول ناجح سابقًا على هذا الجهاز.");
      if (!cachedProfile.is_active) throw new Error("هذا الحساب غير نشط.");
      return cachedProfile;
    }

    try {
      const { data, error } = await window.customerSupabase
        .from("user_profiles")
        .select("id, full_name, email, role, representative_id, is_active, must_change_password, last_login_at")
        .eq("id", userId).single();
      if (error) throw new Error(`تعذر تحميل ملف المستخدم: ${error.message}`);
      if (!data?.is_active) throw new Error("هذا الحساب غير نشط.");
      await cacheProfile(userId, data);
      return data;
    } catch (error) {
      if (cachedProfile && isNetworkFailure(error)) return cachedProfile;
      throw error;
    }
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
    try {
      await window.CustomerPermissions?.loadCurrentPermissions?.();
    } catch (error) {
      state.session = null; state.user = null; state.profile = null;
      await window.customerSupabase.auth.signOut();
      throw new Error(`تعذر تحميل صلاحيات المستخدم: ${error instanceof Error ? error.message : error}`);
    }
    window.CustomerPermissions?.applyScreenVisibility?.();
    showApp();
    window.dispatchEvent(new CustomEvent("customer-auth-ready", { detail: { session, user: session.user, profile } }));
  }
  async function initialize() {
    const status = window.customerSupabaseStatus;
    if (!status?.configured || !window.customerSupabase) {
      const reason = !navigator.onLine
        ? "تعذر تحميل مكوّن تسجيل الدخول من النسخة المخزنة. افتح البرنامج مرة واحدة مع الإنترنت لتجهيز وضع Offline."
        : (status?.reason || "إعدادات Supabase غير مكتملة.");
      showLogin(reason);
      state.initialized = true;
      return;
    }
    try {
      const { data, error } = await window.customerSupabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        showLogin(navigator.onLine ? "" : "لا توجد جلسة دخول محفوظة على هذا الجهاز. يلزم الاتصال بالإنترنت لتسجيل الدخول.");
        return;
      }
      await activate(data.session);
    } catch (error) {
      showLogin(error instanceof Error ? error.message : "تعذر التحقق من الجلسة.");
    } finally { state.initialized = true; }
  }
  async function signIn(email, password) {
    message("");
    if (!navigator.onLine) {
      message("تسجيل الدخول لأول مرة أو بعد انتهاء الجلسة يحتاج اتصالًا بالإنترنت. افتح البرنامج بالإنترنت ثم سيعمل لاحقًا بدون اتصال.");
      return;
    }
    if (!window.customerSupabase?.auth) {
      message("مكوّن تسجيل الدخول غير جاهز. أعد تحميل الصفحة بعد التأكد من الاتصال.");
      return;
    }
    loading(true);
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
      window.CustomerPermissions?.reset?.();
      showLogin(); message("تم تسجيل الخروج بنجاح.", "success");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const e = el();
    e.loginForm?.addEventListener("submit", event => { event.preventDefault(); signIn(e.email.value, e.password.value); });
    e.logout?.addEventListener("click", event => { event.preventDefault(); signOut(); });
    initialize();
    window.customerSupabase?.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        state.session = null;
        state.user = null;
        state.profile = null;
        showLogin();
        return;
      }

      // Phase M10.7.1 — A background Supabase token refresh must not reactivate
      // the whole application. activate() dispatches customer-auth-ready, whose
      // listeners reload customers, follow-ups, quotations and Daily Operations.
      // That full render was the visible periodic refresh inside the open page.
      if (event === "TOKEN_REFRESHED" && session) {
        state.session = session;
        state.user = session.user || state.user;
        return;
      }

      if (["SIGNED_IN", "USER_UPDATED"].includes(event) && session) {
        // signIn() and initialize() may already have activated this exact session.
        // Avoid a duplicate full boot/render when the auth callback reports it.
        const sameUserAlreadyActive = Boolean(
          state.profile
          && state.user?.id
          && state.user.id === session.user?.id
          && event === "SIGNED_IN"
        );
        if (sameUserAlreadyActive) {
          state.session = session;
          state.user = session.user;
          return;
        }

        try {
          await activate(session);
        } catch (error) {
          await window.customerSupabase.auth.signOut();
          showLogin(error instanceof Error ? error.message : "تعذر تفعيل الجلسة.");
        }
      }
    });
  });
  window.CustomerAuth = { getState: () => ({...state}), signIn, signOut };
})();
