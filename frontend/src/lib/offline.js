import api from "./api";

const STORAGE_KEY = "sentinel-offline-storage";
const MAX_LOCAL_RECORDS = 120;

const defaultState = {
  queue: [],
  shift: null,
  sites: [],
  scans: [],
  incidents: [],
  visitors: [],
};

export const isNetworkError = (error) => {
  if (!error) return false;
  if (!error.response) return true;
  const message = error.message || "";
  return ["Network Error", "Failed to fetch", "ERR_NETWORK"].some((term) => message.includes(term));
};

function parseStorage() {
  if (typeof window === "undefined") return { ...defaultState };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultState };
  try {
    return JSON.parse(raw);
  } catch (err) {
    return { ...defaultState };
  }
}

function saveStorage(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const isOnline = () => typeof navigator !== "undefined" && navigator.onLine;

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
  if (!type || !["scans", "incidents", "visitors"].includes(type)) return;
  const data = parseStorage();
  const list = Array.isArray(data[type]) ? data[type] : [];
  list.unshift(record);
  data[type] = list.slice(0, MAX_LOCAL_RECORDS);
  saveStorage(data);
}

export function loadLocalRecords(type) {
  const data = parseStorage();
  return data[type] || [];
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
  return prepared;
}

export function removeOfflineAction(id) {
  const data = parseStorage();
  data.queue = Array.isArray(data.queue)
    ? data.queue.filter((item) => item.id !== id)
    : [];
  saveStorage(data);
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
  if (!queue.length) return;

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
            active: false, endedAt: new Date().toISOString(), syncedAt: new Date().toISOString() });
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

  return status;
}

export function initOfflineSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    syncOfflineQueue();
  });
  syncOfflineQueue();
}
