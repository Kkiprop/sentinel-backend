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

export function setOfflineUser(user) {
  if (!user) {
    localStorage.removeItem(OFFLINE_USER_KEY);
    return;
  }

  const offlineUser = {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name || user.first_name || user.username || "",
  };

  localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(offlineUser));
}

export function getOfflinePin() {
  return localStorage.getItem(OFFLINE_PIN_KEY);
}

export function setOfflinePin(pin) {
  if (/^\d{4}$/.test(pin)) {
    localStorage.setItem(OFFLINE_PIN_KEY, pin);
  } else {
    localStorage.removeItem(OFFLINE_PIN_KEY);
  }
}

export function verifyOfflinePin(pin) {
  return pin && localStorage.getItem(OFFLINE_PIN_KEY) === pin;
}

export function clearOfflineAuth() {
  localStorage.removeItem(OFFLINE_USER_KEY);
  localStorage.removeItem(OFFLINE_PIN_KEY);
}
