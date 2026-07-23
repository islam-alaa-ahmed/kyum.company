const CACHE_VERSION = "kyum-crm-pwa-18-3-3";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "./offline.html";

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./site.webmanifest",
  "./version.json",
  "./assets/css/style.css",
  "./assets/css/mobile.css",
  "./assets/js/activity-service.js",
  "./assets/js/app.js",
  "./assets/js/auth-session.js",
  "./assets/js/backup-service.js",
  "./assets/js/customer-excel-center.js",
  "./assets/js/customer360-engine.js",
  "./assets/js/customer360-export.js",
  "./assets/js/customers-service.js",
  "./assets/js/daily-activity-service.js",
  "./assets/js/daily-alerts-service.js",
  "./assets/js/daily-operations-service.js",
  "./assets/js/daily-performance-service.js",
  "./assets/js/diagnostics-engine.js",
  "./assets/js/diagnostics-service.js",
  "./assets/js/export-center.js",
  "./assets/js/followups-service.js",
  "./assets/js/health-alerts-engine.js",
  "./assets/js/mobile.js",
  "./assets/js/performance-monitor.js",
  "./assets/js/permissions-service.js",
  "./assets/js/permissions.js",
  "./assets/js/pwa.js",
  "./assets/js/quotations-service.js",
  "./assets/js/reference-data-service.js",
  "./assets/js/reports-engine.js",
  "./assets/js/supabase-client.js",
  "./assets/js/supabase-config.js",
  "./assets/js/system-health-service.js",
  "./assets/js/system-settings-service.js",
  "./assets/js/users-service.js",
  "./assets/images/android-chrome-192x192.png",
  "./assets/images/android-chrome-512x512.png",
  "./assets/images/apple-touch-icon.png",
  "./assets/images/maskable-icon-192x192.png",
  "./assets/images/maskable-icon-512x512.png",
  "./assets/images/kyum-header-logo.png"
];

function isDynamicOrSensitive(url) {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  return host.includes("supabase") ||
    path.includes("/rest/v1/") ||
    path.includes("/auth/v1/") ||
    path.includes("/functions/v1/") ||
    path.includes("/api/");
}

function isStaticAsset(request, url) {
  return request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(CACHE_VERSION)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }
  if (isDynamicOrSensitive(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("./index.html")) || caches.match(OFFLINE_URL))
    );
    return;
  }

  if (url.origin === self.location.origin && isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
