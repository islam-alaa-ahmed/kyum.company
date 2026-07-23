(() => {
  "use strict";

  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
  if (isNative) return;

  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  let deferredPrompt = null;

  function createInstallBanner() {
    if (document.getElementById("pwaInstallBanner") || isStandalone()) return null;
    const banner = document.createElement("aside");
    banner.id = "pwaInstallBanner";
    banner.className = "pwa-install-banner";
    banner.hidden = true;
    banner.innerHTML = `
      <div class="pwa-install-icon"><img src="assets/images/apple-touch-icon.png" alt=""></div>
      <div class="pwa-install-copy"><strong>تثبيت KYUM CRM</strong><span>افتح النظام كتطبيق مستقل على هاتفك.</span></div>
      <button type="button" class="pwa-install-action" data-pwa-install>تثبيت</button>
      <button type="button" class="pwa-install-close" data-pwa-dismiss aria-label="إغلاق">×</button>`;
    document.body.appendChild(banner);
    banner.querySelector("[data-pwa-dismiss]").addEventListener("click", () => {
      banner.hidden = true;
      sessionStorage.setItem("kyumPwaInstallDismissed", "1");
    });
    banner.querySelector("[data-pwa-install]").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.hidden = true;
    });
    return banner;
  }

  function showIosHint() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!ios || isStandalone() || sessionStorage.getItem("kyumPwaIosHintDismissed")) return;
    const hint = document.createElement("aside");
    hint.className = "pwa-ios-hint";
    hint.innerHTML = `<strong>تثبيت KYUM CRM على iPhone</strong><span>من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية».</span><button type="button" aria-label="إغلاق">×</button>`;
    document.body.appendChild(hint);
    hint.querySelector("button").addEventListener("click", () => {
      sessionStorage.setItem("kyumPwaIosHintDismissed", "1");
      hint.remove();
    });
  }


  function openShortcutView() {
    const view = new URLSearchParams(location.search).get("view");
    if (!view) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      const target = document.querySelector(`.nav-item[data-view="${CSS.escape(view)}"]`);
      if (target && !target.classList.contains("hidden")) {
        target.click();
        window.clearInterval(timer);
        history.replaceState({}, document.title, location.pathname + location.hash);
      } else if (++attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 300);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            document.documentElement.dataset.pwaUpdateReady = "true";
          }
        });
      });
    } catch (error) {
      console.warn("KYUM PWA registration failed", error);
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    if (sessionStorage.getItem("kyumPwaInstallDismissed")) return;
    const banner = createInstallBanner();
    if (banner) banner.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    document.getElementById("pwaInstallBanner")?.remove();
  });

  window.addEventListener("online", () => document.documentElement.classList.remove("is-offline"));
  window.addEventListener("offline", () => document.documentElement.classList.add("is-offline"));

  document.addEventListener("DOMContentLoaded", () => {
    if (!navigator.onLine) document.documentElement.classList.add("is-offline");
    registerServiceWorker();
    openShortcutView();
    setTimeout(showIosHint, 1800);
  });
})();
