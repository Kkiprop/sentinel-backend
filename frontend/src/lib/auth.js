import { saveOfflineAuthUser, loadOfflineAuthUser, saveOfflineAuthPin, loadOfflineAuthPin, clearOfflineAuthData } from "./offline.js";

const ACCESS_TOKEN_KEY = "senti_access_token";
const REFRESH_TOKEN_KEY = "senti_refresh_token";
const AUTH_USER_KEY = "senti_user";
const OFFLINE_USER_KEY = "senti_offline_user";
const OFFLINE_PIN_KEY = "senti_offline_pin";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser() {
  const stored = localStorage.getItem(AUTH_USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setAuthTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function setAuthUser(user) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getOfflineUser() {
  const stored = localStorage.getItem(OFFLINE_USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export async function loadOfflineUser() {
  const loaded = await loadOfflineAuthUser();
  if (loaded) return loaded;
  return getOfflineUser();
}

export function setOfflineUser(user) {
  if (!user) {
    localStorage.removeItem(OFFLINE_USER_KEY);
    saveOfflineAuthUser(null).catch((err) => {
      console.warn("Unable to clear offline auth user in IndexedDB:", err);
    });
    return;
  }

  const offlineUser = {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name || user.first_name || user.username || "",
  };

  localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(offlineUser));
  saveOfflineAuthUser(offlineUser).catch((err) => {
    console.warn("Unable to persist offline auth user in IndexedDB:", err);
  });
}

export function getOfflinePin() {
  return localStorage.getItem(OFFLINE_PIN_KEY);
}

export async function loadOfflinePin() {
  const loaded = await loadOfflineAuthPin();
  if (loaded) return loaded;
  return getOfflinePin();
}

export function setOfflinePin(pin) {
  if (/^\d{4}$/.test(pin)) {
    localStorage.setItem(OFFLINE_PIN_KEY, pin);
    saveOfflineAuthPin(pin).catch((err) => {
      console.warn("Unable to persist offline PIN in IndexedDB:", err);
    });
  } else {
    localStorage.removeItem(OFFLINE_PIN_KEY);
    saveOfflineAuthPin("").catch((err) => {
      console.warn("Unable to clear offline PIN in IndexedDB:", err);
    });
  }
}

export async function verifyOfflinePin(pin) {
  const storedPin = await loadOfflinePin();
  return pin && storedPin === pin;
}

export function clearOfflineAuth() {
  localStorage.removeItem(OFFLINE_USER_KEY);
  localStorage.removeItem(OFFLINE_PIN_KEY);
  clearOfflineAuthData().catch((err) => {
    console.warn("Unable to clear offline auth data in IndexedDB:", err);
  });
}
