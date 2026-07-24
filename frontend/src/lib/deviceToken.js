import api from "./api";
import { endpoints } from "./endpoints";

/**
 * Register a device token for push notifications.
 *
 * Uses window.Capacitor.Plugins.PushNotifications (available in Capacitor
 * native apps) instead of a direct import, so the web build doesn't need
 * to resolve the @capacitor/push-notifications package at build time.
 *
 * Falls back to a generated web token for browser/PWA usage.
 *
 * @param {string} platform - "android", "ios", or "web"
 * @returns {Promise<string|null>} The registered token, or null on failure.
 */
export async function registerDeviceToken(platform = "web") {
  let token = null;

  // --- Try Capacitor PushNotifications (mobile) ---
  if (platform === "android" || platform === "ios") {
    try {
      // Access PushNotifications via the Capacitor global bridge
      // This avoids needing to import @capacitor/push-notifications at build time
      const capacitor =
        typeof window !== "undefined" ? window.Capacitor : null;
      const PushNotifications =
        capacitor &&
        capacitor.Plugins &&
        capacitor.Plugins.PushNotifications;

      if (PushNotifications) {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.register();
          // Wait for the registration event
          token = await new Promise((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error("Registration timeout")),
              10000
            );
            PushNotifications.addListener("registration", (result) => {
              clearTimeout(timeout);
              resolve(result.value);
            });
            PushNotifications.addListener(
              "registrationError",
              (err) => {
                clearTimeout(timeout);
                reject(err);
              }
            );
          });
        }
      } else {
        console.warn(
          "Capacitor PushNotifications plugin not available on this platform."
        );
      }
    } catch (e) {
      console.warn("Capacitor PushNotifications registration failed:", e);
    }
  }

  // --- Fallback: generate a web token ---
  if (!token) {
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
    token = `web-${btoa(userAgent).replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // --- Send to backend ---
  try {
    await api.post(endpoints.communication.devices, {
      token,
      platform,
    });
    return token;
  } catch (error) {
    console.error("Failed to register device token:", error);
    return null;
  }
}

/**
 * Detect the current platform from the user agent.
 * @returns {"android"|"ios"|"web"}
 */
export function detectPlatform() {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
  return "web";
}
