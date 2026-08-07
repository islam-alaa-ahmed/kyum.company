// KYUM CRM — Unified Geographic Address Component
(function () {
  "use strict";

  let catalog = { regions: [], cities: [], districts: [] };
  let catalogPromise = null;
  let searchIndex = { region: new Map(), city: new Map(), district: new Map() };

  function normalizeValue(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function normalizeSearch(value) {
    return normalizeValue(value)
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/ـ/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[،,;؛:._\-–—/\\()\[\]{}]+/g, " ")
      .replace(/^(?:ال)?منطقه\s+/g, "")
      .replace(/^حي\s+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function tokenizeSearch(value) {
    return normalizeSearch(value).split(" ").filter(Boolean);
  }

  function buildSearchIndex() {
    const build = rows => new Map(rows.map(row => [String(row.id), {
      key: normalizeSearch(row.name),
      tokens: tokenizeSearch(row.name)
    }]));
    searchIndex = {
      region: build(catalog.regions),
      city: build(catalog.cities),
      district: build(catalog.districts)
    };
    return searchIndex;
  }

  function scoreSearch(type, row, query) {
    const q = normalizeSearch(query);
    if (!q) return 0;
    const meta = searchIndex[type]?.get(String(row.id)) || { key: normalizeSearch(row.name), tokens: tokenizeSearch(row.name) };
    if (meta.key === q) return 1000;
    if (meta.key.startsWith(q)) return 800;
    const queryTokens = tokenizeSearch(q);
    if (queryTokens.length && queryTokens.every(token => meta.tokens.some(item => item.startsWith(token)))) return 650;
    if (meta.key.includes(q)) return 500;
    if (queryTokens.length && queryTokens.every(token => meta.key.includes(token))) return 350;
    return -1;
  }

  async function fetchAll(table, columns) {
    if (!window.customerSupabase) throw new Error("اتصال Supabase غير جاهز.");
    const rows = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await window.customerSupabase
        .from(table)
        .select(columns)
        .eq("is_active", true)
        .order("name")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const batch = Array.isArray(data) ? data : [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  }

  async function loadCatalog(force = false) {
    if (!force && catalog.regions.length && catalog.cities.length && catalog.districts.length) return catalog;
    if (!force && catalogPromise) return catalogPromise;
    catalogPromise = Promise.all([
      fetchAll("installation_regions", "id,name,is_active,national_address_region_id"),
      fetchAll("installation_cities", "id,region_id,name,is_active,national_address_city_id"),
      fetchAll("installation_neighborhoods", "id,region_id,city_id,name,city,region,is_active,national_address_district_id")
    ]).then(([regions, cities, districts]) => {
      catalog = { regions, cities, districts };
      buildSearchIndex();
      return catalog;
    }).finally(() => {
      catalogPromise = null;
    });
    return catalogPromise;
  }

  function setCatalog(next = {}) {
    catalog = {
      regions: Array.isArray(next.regions) ? next.regions.filter(row => row?.is_active !== false) : catalog.regions,
      cities: Array.isArray(next.cities) ? next.cities.filter(row => row?.is_active !== false) : catalog.cities,
      districts: Array.isArray(next.districts || next.neighborhoods)
        ? (next.districts || next.neighborhoods).filter(row => row?.is_active !== false)
        : catalog.districts
    };
    buildSearchIndex();
    return catalog;
  }

  function getCatalog() {
    return catalog;
  }

  function findByName(type, name, parentId = "") {
    const normalized = normalizeSearch(name);
    if (!normalized) return null;
    const rows = type === "region" ? catalog.regions : type === "city" ? catalog.cities : catalog.districts;
    return rows.find(row => {
      if (normalizeSearch(row.name) !== normalized) return false;
      if (!parentId) return true;
      return String(type === "city" ? row.region_id : row.city_id) === String(parentId);
    }) || null;
  }

  function canonicalizeAddress(address = {}) {
    let region = address.regionId
      ? catalog.regions.find(row => String(row.id) === String(address.regionId))
      : findByName("region", address.region);
    let city = address.cityId
      ? catalog.cities.find(row => String(row.id) === String(address.cityId))
      : findByName("city", address.city, region?.id || "");
    let district = address.districtId
      ? catalog.districts.find(row => String(row.id) === String(address.districtId))
      : findByName("district", address.district, city?.id || "");

    if (!city && district) city = catalog.cities.find(row => String(row.id) === String(district.city_id)) || null;
    if (!region && city) region = catalog.regions.find(row => String(row.id) === String(city.region_id)) || null;
    if (district && city && String(district.city_id) !== String(city.id)) district = null;
    if (city && region && String(city.region_id) !== String(region.id)) city = null;

    return {
      regionId: region?.id || "",
      region: region?.name || normalizeValue(address.region),
      cityId: city?.id || "",
      city: city?.name || normalizeValue(address.city),
      districtId: district?.id || "",
      district: district?.name || normalizeValue(address.district),
      complete: Boolean(region && city && district),
      validRegionCity: Boolean(region && city && String(city.region_id) === String(region.id)),
      validDistrictCity: Boolean(city && district && String(district.city_id) === String(city.id))
    };
  }

  function createController(config) {
    const documentRef = config.document || document;
    const ids = config.ids;
    const optionLimit = Number(config.optionLimit || 300);
    const boundAttr = config.boundAttribute || "geoUnifiedBound";

    const elements = type => {
      const item = ids[type] || {};
      return {
        wrapper: documentRef.getElementById(item.wrapper),
        hidden: documentRef.getElementById(item.hidden),
        search: documentRef.getElementById(item.search),
        options: documentRef.getElementById(item.options)
      };
    };

    const rowsFor = type => {
      const regionId = elements("region").hidden?.value || "";
      const cityId = elements("city").hidden?.value || "";
      if (type === "region") return catalog.regions;
      if (type === "city") return regionId ? catalog.cities.filter(row => String(row.region_id) === String(regionId)) : [];
      return cityId ? catalog.districts.filter(row => String(row.city_id) === String(cityId)) : [];
    };

    const close = type => {
      const { wrapper, search, options } = elements(type);
      if (!wrapper || !search || !options) return;
      wrapper.dataset.open = "false";
      search.setAttribute("aria-expanded", "false");
      search.removeAttribute("aria-activedescendant");
      options.classList.add("hidden");
      config.onClose?.(type, { wrapper, search, options });
    };

    const closeAll = except => ["region", "city", "district"].forEach(type => type !== except && close(type));

    const setEnabled = (type, enabled, placeholder) => {
      const { wrapper, search } = elements(type);
      if (!wrapper || !search) return;
      search.disabled = !enabled;
      wrapper.classList.toggle("is-disabled", !enabled);
      wrapper.querySelector(".geo-searchable-toggle")?.toggleAttribute("disabled", !enabled);
      if (placeholder) search.placeholder = placeholder;
    };

    const render = (type, query = "") => {
      const { hidden, options } = elements(type);
      if (!options) return;
      const q = normalizeSearch(query);
      const rows = rowsFor(type)
        .map(row => ({ row, score: q ? scoreSearch(type, row, q) : 0 }))
        .filter(item => !q || item.score >= 0)
        .sort((a, b) => b.score - a.score || normalizeValue(a.row.name).localeCompare(normalizeValue(b.row.name), "ar"))
        .slice(0, optionLimit)
        .map(item => item.row);
      options.replaceChildren();
      if (!rows.length) {
        const empty = documentRef.createElement("div");
        empty.className = "geo-searchable-empty";
        empty.textContent = "لا توجد نتائج مطابقة.";
        options.appendChild(empty);
        return;
      }
      rows.forEach(row => {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = `geo-searchable-option${String(hidden?.value || "") === String(row.id) ? " is-selected" : ""}`;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(String(hidden?.value || "") === String(row.id)));
        button.id = `geo-option-${type}-${String(row.id)}`;
        button.dataset.geoUnifiedId = String(row.id);
        button.textContent = normalizeValue(row.name);
        options.appendChild(button);
      });
    };

    const open = type => {
      const { wrapper, search, options } = elements(type);
      if (!wrapper || !search || !options || search.disabled) return;
      closeAll(type);
      render(type, search.value);
      wrapper.dataset.open = "true";
      search.setAttribute("aria-expanded", "true");
      options.classList.remove("hidden");
      const selected = options.querySelector(".geo-searchable-option.is-selected");
      if (selected) selected.scrollIntoView?.({ block: "nearest" });
      config.onOpen?.(type, { wrapper, search, options });
    };

    const select = (type, id, options = {}) => {
      const { cascade = true, closeAfter = true } = options;
      const { hidden, search } = elements(type);
      if (!hidden || !search) return null;
      const source = type === "region" ? catalog.regions : type === "city" ? catalog.cities : catalog.districts;
      const row = source.find(item => String(item.id) === String(id || "")) || null;
      hidden.value = row ? String(row.id) : "";
      search.value = row ? normalizeValue(row.name) : "";
      search.dataset.selectedId = row ? String(row.id) : "";
      search.setCustomValidity("");
      if (type === "region" && cascade) {
        select("city", "", { cascade: false, closeAfter: false });
        select("district", "", { cascade: false, closeAfter: false });
        setEnabled("city", Boolean(row), row ? "ابحث واختر المدينة" : "اختر المنطقة أولًا");
        setEnabled("district", false, "اختر المدينة أولًا");
      }
      if (type === "city" && cascade) {
        select("district", "", { cascade: false, closeAfter: false });
        setEnabled("district", Boolean(row), row ? "ابحث واختر الحي" : "اختر المدينة أولًا");
      }
      if (closeAfter) close(type);
      config.onChange?.(type, row, value());
      return row;
    };

    const value = () => {
      const regionId = elements("region").hidden?.value || "";
      const cityId = elements("city").hidden?.value || "";
      const districtId = elements("district").hidden?.value || "";
      return canonicalizeAddress({ regionId, cityId, districtId });
    };

    const setValue = current => {
      const resolved = canonicalizeAddress(current || {});
      select("region", resolved.regionId, { cascade: true, closeAfter: false });
      select("city", resolved.cityId, { cascade: true, closeAfter: false });
      select("district", resolved.districtId, { cascade: false, closeAfter: false });
      setEnabled("city", Boolean(resolved.regionId), resolved.regionId ? "ابحث واختر المدينة" : "اختر المنطقة أولًا");
      setEnabled("district", Boolean(resolved.cityId), resolved.cityId ? "ابحث واختر الحي" : "اختر المدينة أولًا");
      return resolved;
    };

    const validate = ({ requireRegion = true, requireCity = true, requireDistrict = true } = {}) => {
      const current = value();
      if (requireRegion && !current.regionId) return { valid: false, field: "region", message: "اختر المنطقة." };
      if (requireCity && !current.cityId) return { valid: false, field: "city", message: "اختر المدينة." };
      if (requireDistrict && !current.districtId) return { valid: false, field: "district", message: "اختر الحي." };
      if (current.cityId && !current.validRegionCity) return { valid: false, field: "city", message: "المدينة لا تتبع المنطقة المختارة." };
      if (current.districtId && !current.validDistrictCity) return { valid: false, field: "district", message: "الحي لا يتبع المدينة المختارة." };
      return { valid: true, value: current };
    };

    const bind = () => {
      ["region", "city", "district"].forEach(type => {
        const { wrapper, hidden, search, options } = elements(type);
        if (!wrapper || !hidden || !search || !options || wrapper.dataset[boundAttr]) return;
        wrapper.dataset[boundAttr] = "1";
        search.addEventListener("focus", () => open(type));
        search.addEventListener("input", () => {
          hidden.value = "";
          search.dataset.selectedId = "";
          if (type === "region") {
            select("city", "", { cascade: false, closeAfter: false });
            select("district", "", { cascade: false, closeAfter: false });
            setEnabled("city", false, "اختر المنطقة أولًا");
            setEnabled("district", false, "اختر المدينة أولًا");
          } else if (type === "city") {
            select("district", "", { cascade: false, closeAfter: false });
            setEnabled("district", false, "اختر المدينة أولًا");
          }
          render(type, search.value);
          open(type);
        });
        search.addEventListener("keydown", event => {
          if (event.key === "Escape") { event.preventDefault(); close(type); return; }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            open(type);
            const buttons = [...options.querySelectorAll(".geo-searchable-option")];
            if (!buttons.length) return;
            const target = event.key === "End" || event.key === "ArrowUp" ? buttons[buttons.length - 1] : buttons[0];
            target.focus();
            search.setAttribute("aria-activedescendant", target.id);
            return;
          }
          if (event.key === "Enter" && wrapper.dataset.open === "true") {
            const first = options.querySelector(".geo-searchable-option");
            if (first) { event.preventDefault(); select(type, first.dataset.geoUnifiedId); }
          }
        });
        wrapper.querySelector(".geo-searchable-toggle")?.addEventListener("click", () => wrapper.dataset.open === "true" ? close(type) : open(type));
        options.addEventListener("click", event => {
          const button = event.target.closest(".geo-searchable-option");
          if (button) select(type, button.dataset.geoUnifiedId);
        });
        options.addEventListener("keydown", event => {
          const current = event.target.closest(".geo-searchable-option");
          if (!current) return;
          const buttons = [...options.querySelectorAll(".geo-searchable-option")];
          const index = buttons.indexOf(current);
          let target = null;
          if (event.key === "ArrowDown") target = buttons[Math.min(index + 1, buttons.length - 1)];
          if (event.key === "ArrowUp") target = index > 0 ? buttons[index - 1] : search;
          if (event.key === "Home") target = buttons[0];
          if (event.key === "End") target = buttons[buttons.length - 1];
          if (target) {
            event.preventDefault();
            target.focus();
            if (target.id) search.setAttribute("aria-activedescendant", target.id);
            else search.removeAttribute("aria-activedescendant");
          }
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(type, current.dataset.geoUnifiedId); }
          if (event.key === "Escape") { event.preventDefault(); close(type); search.focus(); }
        });
        options.addEventListener("focusin", event => {
          const current = event.target.closest(".geo-searchable-option");
          if (current?.id) search.setAttribute("aria-activedescendant", current.id);
        });
      });
      documentRef.addEventListener("click", event => {
        if (!event.target.closest(".geo-searchable-select") && !event.target.closest(".geo-searchable-options")) closeAll();
      });
      return api;
    };

    const api = Object.freeze({ bind, open, close, select, setValue, value, validate, setEnabled, render, elements });
    return api;
  }

  window.KYUMGeography = Object.freeze({
    normalizeValue,
    normalizeSearch,
    tokenizeSearch,
    scoreSearch,
    loadCatalog,
    setCatalog,
    getCatalog,
    findByName,
    canonicalizeAddress,
    createController
  });
})();
