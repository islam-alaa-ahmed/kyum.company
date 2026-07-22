(() => {
  "use strict";

  const MOBILE_MEDIA = window.matchMedia("(max-width: 767px)");
  const nav = document.getElementById("mobileBottomNav");
  if (!nav) return;

  const viewButtons = [...nav.querySelectorAll("[data-mobile-view]")];
  const menuButton = nav.querySelector("[data-mobile-action='menu']");

  function desktopViewButton(view) {
    return document.querySelector(`.nav-item[data-view="${view}"]`);
  }

  function syncPermissionVisibility() {
    viewButtons.forEach(button => {
      const source = desktopViewButton(button.dataset.mobileView);
      const unavailable = !source || source.hidden || source.classList.contains("hidden") || source.getAttribute("aria-hidden") === "true";
      button.hidden = unavailable;
    });
  }

  function currentView() {
    const active = document.querySelector(".nav-item[data-view].active");
    if (active?.dataset.view) return active.dataset.view;
    const hash = location.hash.replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || "dashboard";
  }

  function syncActiveState() {
    const activeView = currentView();
    viewButtons.forEach(button => {
      const active = button.dataset.mobileView === activeView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    menuButton?.classList.remove("is-active");
  }

  function openView(view) {
    const source = desktopViewButton(view);
    if (!source || source.hidden || source.classList.contains("hidden")) return;
    source.click();
    syncActiveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  viewButtons.forEach(button => {
    button.addEventListener("click", () => openView(button.dataset.mobileView));
  });

  menuButton?.addEventListener("click", () => {
    const launcher = document.getElementById("sidebarMenuToggle");
    if (!launcher) return;
    launcher.click();
    menuButton.classList.toggle("is-active", launcher.getAttribute("aria-expanded") === "true");
  });

  document.getElementById("sidebarBackdrop")?.addEventListener("click", () => menuButton?.classList.remove("is-active"));
  document.getElementById("mainSidebar")?.addEventListener("click", event => {
    if (event.target.closest(".nav-item[data-view]")) menuButton?.classList.remove("is-active");
  });

  const observer = new MutationObserver(() => {
    syncPermissionVisibility();
    syncActiveState();
  });

  document.querySelectorAll(".nav-item[data-view]").forEach(button => {
    observer.observe(button, { attributes: true, attributeFilter: ["class", "hidden", "aria-hidden"] });
  });

  window.addEventListener("hashchange", syncActiveState);
  window.addEventListener("popstate", syncActiveState);
  window.addEventListener("customer-auth-ready", () => {
    syncPermissionVisibility();
    syncActiveState();
  });

  MOBILE_MEDIA.addEventListener?.("change", () => {
    if (!MOBILE_MEDIA.matches) menuButton?.classList.remove("is-active");
  });

  syncPermissionVisibility();
  syncActiveState();
})();
