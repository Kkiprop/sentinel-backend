import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { endpoints } from "../lib/endpoints";
import {
  saveCachedUnreadCount,
  loadCachedUnreadCount,
  saveCachedNotifications,
  loadCachedNotifications,
} from "../lib/offlineChat";

/**
 * Hook that polls for unread notification counts and provides
 * helpers to fetch the full list and mark notifications as read.
 *
 * Offline capabilities:
 *   - Unread count and notification list are cached in IndexedDB
 *   - When offline, cached data is returned immediately
 *
 * @param {number} pollInterval - Milliseconds between polls (default 30 000)
 * @returns {object}
 */
export function useNotifications(pollInterval = 30000) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!navigator.onLine) {
      // Load cached count when offline
      const cached = await loadCachedUnreadCount();
      setUnreadCount(cached);
      return;
    }

    try {
      const response = await api.get(endpoints.communication.notificationUnreadCount);
      const count = response.data.unread_count || 0;
      setUnreadCount(count);
      // Cache to IndexedDB
      await saveCachedUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread notification count:", error);
      // Fall back to cached count
      const cached = await loadCachedUnreadCount();
      if (cached > 0) setUnreadCount(cached);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!navigator.onLine) {
      // Load cached notifications when offline
      const cached = await loadCachedNotifications();
      setNotifications(cached);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(endpoints.communication.notifications);
      const notifs = response.data || [];
      setNotifications(notifs);
      // Cache to IndexedDB
      await saveCachedNotifications(notifs);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      // Fall back to cached notifications
      const cached = await loadCachedNotifications();
      setNotifications(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (ids = null) => {
      if (!navigator.onLine) {
        // Optimistically mark as read locally
        if (ids) {
          setNotifications((prev) =>
            prev.map((n) =>
              ids.includes(n.id) ? { ...n, is_read: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - ids.length));
        } else {
          setNotifications((prev) =>
            prev.map((n) => ({ ...n, is_read: true }))
          );
          setUnreadCount(0);
        }
        // Cache updated state
        await saveCachedNotifications(notifications.map((n) =>
          ids ? (ids.includes(n.id) ? { ...n, is_read: true } : n) : { ...n, is_read: true }
        ));
        await saveCachedUnreadCount(ids ? Math.max(0, unreadCount - ids.length) : 0);
        return;
      }

      try {
        await api.post(endpoints.communication.notificationMarkRead, { ids });
        if (ids) {
          setNotifications((prev) =>
            prev.map((n) =>
              ids.includes(n.id) ? { ...n, is_read: true } : n
            )
          );
          setUnreadCount((prev) =>
            Math.max(0, prev - ids.length)
          );
        } else {
          setNotifications((prev) =>
            prev.map((n) => ({ ...n, is_read: true }))
          );
          setUnreadCount(0);
        }
        // Cache updated state
        await saveCachedNotifications(notifications);
        await saveCachedUnreadCount(0);
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    },
    [notifications, unreadCount]
  );

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
  };
}
