import Dexie from "dexie";
import api from "./api";

const MAX_LOCAL_RECORDS = 120;
const defaultState = {
  queue: [],
  shift: null,
  sites: [],
  scans: [],
  incidents: [],
  shifts: [],
  visitors: [],
  offlineShifts: [],
  offlineIncidents: [],
};

const supportIndexedDb = typeof window !== "undefined" && typeof indexedDB !== "undefined";
const db = supportIndexedDb
  ? new Dexie("SentinelOfflineDB")
  : null;

if (db) {
  db.version(1).stores({
    queue: "&id,createdAt",
    sites: "id",
    scans: "++_localId,created_at",
    incidents: "++_localId,created_at",
    shifts: "++_localId,created_at",
    visitors: "++_localId,created_at",
    metadata: "&key",
  });
}

let storageState = { ...defaultState };
let storageInitialized = false;

export const isNetworkError = (error) => {
  if (!error) return false;
  if (!error.response) return true;
  const message = error.message || "";
  return ["Network Error", "Failed to fetch", "ERR_NETWORK"].some((term) => message.includes(term));
};

function getLocalStorageData() {
  if (typeof window === "undefined") return { ...defaultState };
  try {
    const raw = window.localStorage.getItem("sentinel-offline-storage");
    if (!raw) return { ...defaultState };
    return JSON.parse(raw);
  } catch (err) {
    return { ...defaultState };
  }
}

function saveLocalStorageData(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("sentinel-offline-storage", JSON.stringify(data));
}

function normalizeRecords(records) {
  return records.map((record) => ({
    ...record,
    created_at: record.created_at || record.createdAt || new Date().toISOString(),
  }));
}

async function openDatabase() {
  if (!db) return;
  if (!db.isOpen()) {
    await db.open();
  }
}

async function loadIndexedState() {
  if (!db) return { ...defaultState };

  await openDatabase();

  const [queue, sites, scans, incidents, shifts, visitors, shiftState, offlineShifts, offlineIncidents] = await Promise.all([
    db.queue.orderBy("createdAt").toArray(),
    db.sites.toArray(),
    db.scans.orderBy("created_at").reverse().limit(MAX_LOCAL_RECORDS).toArray(),
    db.incidents.orderBy("created_at").reverse().limit(MAX_LOCAL_RECORDS).toArray(),
    db.shifts.orderBy("created_at").reverse().limit(MAX_LOCAL_RECORDS).toArray(),
    db.visitors.orderBy("created_at").reverse().limit(MAX_LOCAL_RECORDS).toArray(),
    db.metadata.get("shiftState"),
    db.metadata.get("offlineShifts"),
    db.metadata.get("offlineIncidents"),
  ]);

  return {
    queue: queue || [],
    shift: shiftState?.value || null,
    sites: sites || [],
    scans: normalizeRecords(scans || []),
    incidents: normalizeRecords(incidents || []),
    shifts: normalizeRecords(shifts || []),
    visitors: normalizeRecords(visitors || []),
    offlineShifts: offlineShifts?.value || [],
    offlineIncidents: offlineIncidents?.value || [],
  };
}

async function saveStateToIndexedDb(data) {
  if (!db) return;

  await openDatabase();

  await db.transaction("rw", db.queue, db.sites, db.scans, db.incidents, db.shifts, db.visitors, db.metadata, async () => {
    await db.queue.clear();
    if (data.queue?.length) await db.queue.bulkPut(data.queue);

    await db.sites.clear();
    if (data.sites?.length) await db.sites.bulkPut(data.sites);

    await db.scans.clear();
    if (data.scans?.length) await db.scans.bulkAdd(normalizeRecords(data.scans));

    await db.incidents.clear();
    if (data.incidents?.length) await db.incidents.bulkAdd(normalizeRecords(data.incidents));

    await db.shifts.clear();
    if (data.shifts?.length) await db.shifts.bulkAdd(normalizeRecords(data.shifts));

    await db.visitors.clear();
    if (data.visitors?.length) await db.visitors.bulkAdd(normalizeRecords(data.visitors));

    await db.metadata.put({ key: "shiftState", value: data.shift ?? null });
    await db.metadata.put({ key: "offlineShifts", value: data.offlineShifts || [] });
    await db.metadata.put({ key: "offlineIncidents", value: data.offlineIncidents || [] });
  });
}

async function saveOfflineMetadata(key, value) {
  if (!db) return;
  await openDatabase();
  await db.metadata.put({ key, value });
}

function getLocalStorageAuthUser() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("senti_offline_user");
  return raw ? JSON.parse(raw) : null;
}

function getLocalStorageAuthPin() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("senti_offline_pin");
}

async function migrateLocalStorageToIndexedDb() {
  if (!db) return;
  await openDatabase();

  const [queueCount, metadataCount] = await Promise.all([
    db.queue.count(),
    db.metadata.count(),
  ]);

  if (queueCount > 0 || metadataCount > 0) return;

  const localData = getLocalStorageData();
  if (localData && Object.keys(localData).length) {
    await saveStateToIndexedDb(localData);
  }

  const localOfflineUser = getLocalStorageAuthUser();
  if (localOfflineUser) {
    await saveOfflineAuthUser(localOfflineUser);
  }

  const localOfflinePin = getLocalStorageAuthPin();
  if (localOfflinePin) {
    await saveOfflineAuthPin(localOfflinePin);
  }
}

async function loadOfflineMetadata(key) {
  if (!db) return null;
  await openDatabase();
  const record = await db.metadata.get(key);
  return record?.value ?? null;
}

async function clearOfflineMetadata(key) {
  if (!db) return;
  await openDatabase();
  await db.metadata.delete(key);
}

export async function saveOfflineAuthUser(user) {
  await saveOfflineMetadata("offlineUser", user || null);
}

export async function loadOfflineAuthUser() {
  return loadOfflineMetadata("offlineUser");
}

export async function saveOfflineAuthPin(pin) {
  await saveOfflineMetadata("offlinePin", pin || "");
}

export async function loadOfflineAuthPin() {
  return loadOfflineMetadata("offlinePin");
}

export async function clearOfflineAuthData() {
  await Promise.all([clearOfflineMetadata("offlineUser"), clearOfflineMetadata("offlinePin")]);
}

function parseStorage() {
  if (!storageInitialized) {
    if (supportIndexedDb) return { ...defaultState };
    const data = getLocalStorageData();
    storageInitialized = true;
    storageState = data;
    return data;
  }

  return storageState;
}

function saveStorage(data) {
  storageState = data;

  if (supportIndexedDb) {
    saveStateToIndexedDb(data).catch((err) => {
      console.warn("Failed to persist offline state to IndexedDB:", err);
    });
    return;
  }

  saveLocalStorageData(data);
}

export const isOnline = () => typeof navigator !== "undefined" && navigator.onLine;

export function getNetworkStatus() {
  return {
    online: isOnline(),
    pending: getPendingCount(),
  };
}

function broadcastNetworkState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("offline-sync-state", {
      detail: getNetworkStatus(),
    })
  );
}

export function getPendingQueue() {
  return parseStorage().queue || [];
}

export function getPendingCount() {
  return getPendingQueue().length;
}

export function loadOfflineShiftState() {
  return parseStorage().shift || null;
}

export function saveOfflineShiftState(shiftState) {
  const data = parseStorage();
  data.shift = shiftState;
  saveStorage(data);
}

export function loadCachedSites() {
  return parseStorage().sites || [];
}

export function saveCachedSites(sites) {
  const data = parseStorage();
  data.sites = sites || [];
  saveStorage(data);
}

export function appendLocalRecord(type, record) {
  if (!type || !["scans", "incidents", "visitors", "shifts"].includes(type)) return;

  const data = parseStorage();
  const list = Array.isArray(data[type]) ? data[type] : [];
  const normalized = { ...record, created_at: record.created_at || new Date().toISOString() };
  const updated = [normalized, ...list].slice(0, MAX_LOCAL_RECORDS);

  data[type] = updated;
  saveStorage(data);
}

export function saveOfflineShifts(shifts) {
  const data = parseStorage();
  data.offlineShifts = Array.isArray(shifts) ? shifts : [];
  saveStorage(data);
}

export function loadOfflineShifts() {
  const data = parseStorage();
  return data.offlineShifts || [];
}

export function saveOfflineIncidents(incidents) {
  const data = parseStorage();
  data.offlineIncidents = Array.isArray(incidents) ? incidents : [];
  saveStorage(data);
}

export function loadOfflineIncidents() {
  const data = parseStorage();
  return data.offlineIncidents || [];
}

export function loadLocalRecords(type) {
  const data = parseStorage();
  return data[type] || [];
}

/* ------------------------------------------------------------------ */
/*  Dashboard Metrics Caching                                         */
/* ------------------------------------------------------------------ */
export async function saveCachedDashboardMetrics(metrics) {
  await saveOfflineMetadata("dashboardMetrics", metrics ?? null);
}

export async function loadCachedDashboardMetrics() {
  return loadOfflineMetadata("dashboardMetrics");
}

/* ------------------------------------------------------------------ */
/*  Shifts By Month Caching (keyed by "YYYY-MM")                      */
/* ------------------------------------------------------------------ */
export async function saveCachedShiftsByMonth(yearMonth, shifts) {
  await saveOfflineMetadata(`shifts:${yearMonth}`, shifts ?? []);
}

export async function loadCachedShiftsByMonth(yearMonth) {
  return loadOfflineMetadata(`shifts:${yearMonth}`) || [];
}

/* ------------------------------------------------------------------ */
/*  Patrol Logs Caching                                               */
/* ------------------------------------------------------------------ */
export async function saveCachedPatrolLogs(logs) {
  await saveOfflineMetadata("patrolLogs", logs ?? []);
}

export async function loadCachedPatrolLogs() {
  return loadOfflineMetadata("patrolLogs") || [];
}

/* ------------------------------------------------------------------ */
/*  Shift Filters Caching                                             */
/* ------------------------------------------------------------------ */
export async function saveCachedShiftFilters(filters) {
  await saveOfflineMetadata("shiftFilters", filters ?? null);
}

export async function loadCachedShiftFilters() {
  return loadOfflineMetadata("shiftFilters");
}

/* ------------------------------------------------------------------ */
/*  Incident Filters Caching                                          */
/* ------------------------------------------------------------------ */
export async function saveCachedIncidentFilters(filters) {
  await saveOfflineMetadata("incidentFilters", filters ?? null);
}

export async function loadCachedIncidentFilters() {
  return loadOfflineMetadata("incidentFilters");
}

/* ------------------------------------------------------------------ */
/*  Team / Site Assignments Caching                                   */
/* ------------------------------------------------------------------ */
export async function saveCachedTeamAssignments(assignments) {
  await saveOfflineMetadata("teamAssignments", assignments ?? []);
}

export async function loadCachedTeamAssignments() {
  return loadOfflineMetadata("teamAssignments") || [];
}

/* ------------------------------------------------------------------ */
/*  Active Shift Map Markers Caching                                  */
/* ------------------------------------------------------------------ */
export async function saveCachedActiveShiftMarkers(markers) {
  await saveOfflineMetadata("activeShiftMarkers", markers ?? []);
}

export async function loadCachedActiveShiftMarkers() {
  return loadOfflineMetadata("activeShiftMarkers") || [];
}

export function enqueueOfflineAction(action) {
  const data = parseStorage();
  const queued = Array.isArray(data.queue) ? data.queue : [];
  const prepared = {
    id: action.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    ...action,
  };
  queued.push(prepared);
  data.queue = queued;
  saveStorage(data);
  broadcastNetworkState();
  return prepared;
}

export function removeOfflineAction(id) {
  const data = parseStorage();
  data.queue = Array.isArray(data.queue)
    ? data.queue.filter((item) => item.id !== id)
    : [];
  saveStorage(data);
  broadcastNetworkState();
}

async function sendOfflineAction(action) {
  if (!action) throw new Error("Missing offline action.");
  const url = action.endpoint;
  if (!url) throw new Error("Missing offline action endpoint.");

  if (action.method === "patch" || action.method === "put") {
    return api[action.method](url, action.payload);
  }

  return api.post(url, action.payload);
}

export async function syncOfflineQueue() {
  if (!isOnline()) return;
  const queue = getPendingQueue();
  if (!queue.length) {
    broadcastNetworkState();
    return;
  }

  const status = [];
  for (const action of queue.slice()) {
    try {
      await sendOfflineAction(action);
      removeOfflineAction(action.id);
      if (action.category) {
        appendLocalRecord(action.category, {
          ...action.payload,
          pending: false,
          syncedAt: new Date().toISOString(),
        });
      }
      if (action.category === "shift") {
        if (action.type === "start") {
          saveOfflineShiftState({
            active: true,
            siteId: action.payload.site_id,
            latitude: action.payload.latitude,
            longitude: action.payload.longitude,
            startedAt: action.payload.created_at,
            syncedAt: new Date().toISOString(),
          });
        }
        if (action.type === "end") {
          saveOfflineShiftState({
            active: false,
            endedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString(),
          });
        }
      }
      status.push({ id: action.id, success: true });
    } catch (error) {
      if (!isNetworkError(error)) {
        removeOfflineAction(action.id);
      }
      status.push({ id: action.id, success: false, error: error.message || "Offline sync failed" });
    }
  }

  broadcastNetworkState();
  return status;
}

export async function initOfflineSync() {
  if (typeof window === "undefined") return;

  if (supportIndexedDb) {
    try {
      await migrateLocalStorageToIndexedDb();
      storageState = await loadIndexedState();
      storageInitialized = true;
    } catch (error) {
      console.warn("IndexedDB init failed, falling back to localStorage.", error);
      storageState = getLocalStorageData();
      storageInitialized = true;
    }
  } else {
    storageState = getLocalStorageData();
    storageInitialized = true;
  }

  const updateState = () => {
    broadcastNetworkState();
    if (isOnline()) {
      syncOfflineQueue();
    }
  };

  window.addEventListener("online", updateState);
  window.addEventListener("offline", updateState);
  broadcastNetworkState();
  syncOfflineQueue();
}
