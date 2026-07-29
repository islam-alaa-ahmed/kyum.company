// KYUM Phase M13.6 — Enterprise Offline Write Queue & Conflict Resolution
(function () {
  "use strict";

  const DB_NAME = "kyum_crm_offline_queue";
  const DB_VERSION = 1;
  const OPS_STORE = "operations";
  const CONFLICTS_STORE = "conflicts";
  const MAP_STORE = "id_map";
  const MAX_ATTEMPTS = 8;
  const handlers = new Map();
  const processors = new Map();
  let dbPromise = null;
  let lifecycleInstalled = false;

  class ConflictError extends Error {
    constructor(message, details = {}) {
      super(message || "offline_sync_conflict");
      this.name = "KYUMOfflineConflictError";
      this.code = "OFFLINE_CONFLICT";
      this.details = details;
    }
  }

  function uid(prefix = "op") {
    if (crypto?.randomUUID) return `${prefix}:${crypto.randomUUID()}`;
    return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  }

  function openDb() {
    if (!("indexedDB" in window)) return Promise.reject(new Error("indexeddb_unavailable"));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OPS_STORE)) {
          const store = db.createObjectStore(OPS_STORE, { keyPath: "id" });
          store.createIndex("namespace", "namespace", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(CONFLICTS_STORE)) {
          const store = db.createObjectStore(CONFLICTS_STORE, { keyPath: "id" });
          store.createIndex("namespace", "namespace", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(MAP_STORE)) {
          const store = db.createObjectStore(MAP_STORE, { keyPath: "id" });
          store.createIndex("namespace", "namespace", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("offline_queue_open_failed"));
      request.onblocked = () => reject(new Error("offline_queue_open_blocked"));
    });
    return dbPromise;
  }

  async function request(storeName, mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = action(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("offline_queue_transaction_failed"));
      tx.onabort = () => reject(tx.error || new Error("offline_queue_transaction_aborted"));
    });
  }

  async function getNamespace() {
    try {
      const stateId = window.CustomerAuth?.getState?.().user?.id;
      if (stateId) return `user:${stateId}`;
      const result = await window.customerSupabase?.auth?.getUser?.();
      return `user:${result?.data?.user?.id || "anonymous"}`;
    } catch (_) {
      return "user:anonymous";
    }
  }

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent(type, { detail: { ...detail, at: Date.now() } }));
    window.dispatchEvent(new CustomEvent("kyum-offline-queue-changed", { detail: { ...detail, at: Date.now() } }));
  }

  async function putOperation(operation) {
    await request(OPS_STORE, "readwrite", store => store.put(operation));
    emit("kyum-offline-operation-updated", { operation });
    return operation;
  }

  async function getOperation(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OPS_STORE, "readonly");
      const req = tx.objectStore(OPS_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("offline_operation_read_failed"));
    });
  }

  async function list(options = {}) {
    const namespace = options.namespace || await getNamespace();
    const db = await openDb();
    const rows = [];
    await new Promise((resolve, reject) => {
      const tx = db.transaction(OPS_STORE, "readonly");
      const req = tx.objectStore(OPS_STORE).index("namespace").openCursor(IDBKeyRange.only(namespace));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if (!options.statuses || options.statuses.includes(cursor.value.status)) rows.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error || new Error("offline_operation_list_failed"));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("offline_operation_list_failed"));
    });
    return rows.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  }

  async function enqueue(options = {}) {
    const namespace = options.namespace || await getNamespace();
    if (!options.entity || !options.action || !options.payload) throw new Error("invalid_offline_operation");
    const localEntityId = options.localEntityId || (options.action === "create" ? uid("local") : options.payload?.id || null);
    const operation = {
      id: uid("operation"),
      namespace,
      entity: options.entity,
      action: options.action,
      payload: typeof structuredClone === "function" ? structuredClone(options.payload) : JSON.parse(JSON.stringify(options.payload)),
      localEntityId,
      baseUpdatedAt: options.baseUpdatedAt || options.payload?.updatedAt || options.payload?.updated_at || "",
      dependsOn: Array.isArray(options.dependsOn) ? options.dependsOn.filter(Boolean) : [],
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nextAttemptAt: 0,
      lastError: "",
      resultId: null
    };
    await putOperation(operation);
    emit("kyum-offline-operation-queued", { operation });
    return { operationId: operation.id, localEntityId };
  }

  async function writeIdMap(namespace, localId, serverId, entity) {
    if (!localId || !serverId) return;
    const row = { id: `${namespace}::${localId}`, namespace, localId, serverId, entity, updatedAt: Date.now() };
    await request(MAP_STORE, "readwrite", store => store.put(row));
  }

  async function resolveServerId(localId, namespace) {
    if (!String(localId || "").startsWith("local:")) return localId;
    const ns = namespace || await getNamespace();
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MAP_STORE, "readonly");
      const req = tx.objectStore(MAP_STORE).get(`${ns}::${localId}`);
      req.onsuccess = () => resolve(req.result?.serverId || null);
      req.onerror = () => reject(req.error || new Error("offline_id_map_read_failed"));
    });
  }

  async function findCreateOperationByLocalId(localId, namespace) {
    const rows = await list({ namespace: namespace || await getNamespace(), statuses: ["pending", "retry", "processing"] });
    return rows.find(row => row.action === "create" && row.localEntityId === localId) || null;
  }

  async function dependenciesReady(operation) {
    for (const dependencyId of operation.dependsOn || []) {
      const dependency = await getOperation(dependencyId);
      if (!dependency || dependency.status !== "synced") return false;
    }
    return true;
  }

  function isRetryableError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();
    return navigator.onLine === false ||
      code === "typeerror" || code === "fetch_error" ||
      /failed to fetch|network|load failed|connection|timeout|offline|fetch/i.test(message);
  }

  async function saveConflict(operation, error) {
    const conflict = {
      id: uid("conflict"),
      namespace: operation.namespace,
      operationId: operation.id,
      entity: operation.entity,
      action: operation.action,
      payload: operation.payload,
      baseUpdatedAt: operation.baseUpdatedAt,
      reason: String(error?.message || "offline_sync_conflict"),
      details: error?.details || {},
      createdAt: Date.now(),
      status: "open"
    };
    await request(CONFLICTS_STORE, "readwrite", store => store.put(conflict));
    emit("kyum-offline-conflict-created", { conflict });
    return conflict;
  }

  async function processOperation(operation) {
    const handler = handlers.get(operation.entity);
    if (!handler) return false;
    if (!(await dependenciesReady(operation))) return false;

    operation.status = "processing";
    operation.attempts = Number(operation.attempts || 0) + 1;
    operation.updatedAt = Date.now();
    await putOperation(operation);

    try {
      const result = await handler(operation, { resolveServerId });
      operation.status = "synced";
      operation.resultId = result?.id || result || null;
      operation.syncedAt = Date.now();
      operation.updatedAt = Date.now();
      operation.lastError = "";
      if (operation.action === "create" && operation.localEntityId && operation.resultId) {
        await writeIdMap(operation.namespace, operation.localEntityId, operation.resultId, operation.entity);
      }
      await putOperation(operation);
      emit("kyum-offline-operation-synced", { operation });
      return true;
    } catch (error) {
      operation.updatedAt = Date.now();
      operation.lastError = String(error?.message || error);
      if (error?.code === "OFFLINE_CONFLICT") {
        operation.status = "conflict";
        await saveConflict(operation, error);
      } else if (isRetryableError(error) && operation.attempts < MAX_ATTEMPTS) {
        operation.status = "retry";
        operation.nextAttemptAt = Date.now() + Math.min(5 * 60 * 1000, 3000 * Math.pow(2, operation.attempts - 1));
      } else {
        operation.status = "failed";
      }
      await putOperation(operation);
      return false;
    }
  }

  async function process(options = {}) {
    if (navigator.onLine === false) return { processed: 0, synced: 0 };
    const namespace = options.namespace || await getNamespace();
    if (processors.has(namespace)) return processors.get(namespace);
    const job = (async () => {
      const rows = await list({ namespace, statuses: ["pending", "retry"] });
      let synced = 0;
      for (const operation of rows) {
        if (operation.nextAttemptAt && operation.nextAttemptAt > Date.now()) continue;
        if (await processOperation(operation)) synced += 1;
      }
      if (synced && window.KYUMSyncEngine?.triggerAll) await window.KYUMSyncEngine.triggerAll("offline-queue");
      emit("kyum-offline-queue-processed", { namespace, processed: rows.length, synced });
      return { processed: rows.length, synced };
    })();
    processors.set(namespace, job);
    try { return await job; } finally { processors.delete(namespace); }
  }

  function register(entity, handler) {
    if (!entity || typeof handler !== "function") return () => {};
    handlers.set(entity, handler);
    installLifecycle();
    return () => handlers.delete(entity);
  }

  async function stats(options = {}) {
    const rows = await list(options);
    const counts = rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    return { total: rows.length, counts, lastQueuedAt: rows.reduce((max, row) => Math.max(max, row.createdAt || 0), 0) || null };
  }

  function installLifecycle() {
    if (lifecycleInstalled) return;
    lifecycleInstalled = true;
    window.addEventListener("online", () => process().catch(() => {}));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) process().catch(() => {});
    });
    setTimeout(() => { if (navigator.onLine !== false) process().catch(() => {}); }, 1500);
  }

  window.KYUMOfflineQueue = Object.freeze({
    version: "M13.6",
    ConflictError,
    enqueue,
    register,
    process,
    list,
    stats,
    resolveServerId,
    findCreateOperationByLocalId,
    isRetryableError
  });
  installLifecycle();
})();
