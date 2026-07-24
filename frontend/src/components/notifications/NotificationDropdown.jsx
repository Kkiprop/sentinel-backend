import { useState, useRef, useEffect, useCallback } from "react";
import { FiBell, FiCheck, FiX } from "react-icons/fi";
import { useNotifications } from "../../hooks/useNotifications";

/**
 * Notification bell icon with a dropdown showing recent notifications.
 * Uses polling (via useNotifications) for unread count and list.
 */
export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
  } = useNotifications(30000);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      // Fetch notifications when opening
      fetchNotifications();
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    await markAsRead(); // null = mark all
  }, [markAsRead]);

  const handleMarkOneRead = useCallback(
    async (id) => {
      await markAsRead([id]);
    },
    [markAsRead]
  );

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-menu">
          <div className="notification-menu-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read"
                onClick={handleMarkAllRead}
                title="Mark all as read"
              >
                <FiCheck size={14} />
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : recentNotifications.length === 0 ? (
              <div className="notification-empty">
                No notifications yet.
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${
                    notif.is_read ? "read" : "unread"
                  }`}
                >
                  <div className="notification-title">
                    {notif.title}
                  </div>
                  <div className="notification-body">
                    {notif.body}
                  </div>
                  <div className="notification-time">
                    {new Date(notif.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {!notif.is_read && (
                    <button
                      className="mark-one-read"
                      onClick={() => handleMarkOneRead(notif.id)}
                      title="Mark as read"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              <button
                className="view-all"
                onClick={() => {
                  /* Could navigate to a full notifications page */
                  setOpen(false);
                }}
              >
                View all ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .notification-dropdown {
          position: relative;
          display: inline-block;
        }
        .notification-bell {
          position: relative;
          border: none;
          background: #f8fafc;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 0.85rem;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #475569;
        }
        .notification-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.55rem;
          width: 0.7rem;
          height: 0.7rem;
          border-radius: 50%;
          background: #ef4444;
          color: #ffffff;
          font-size: 0.55rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px #ffffff;
        }
        .notification-menu {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          max-height: 480px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
          z-index: 1000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .notification-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .notification-menu-header h3 {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
        }
        .mark-all-read {
          background: none;
          border: none;
          color: #2563eb;
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 0.3rem;
        }
        .notification-list {
          overflow-y: auto;
          max-height: 380px;
        }
        .notification-item {
          position: relative;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .notification-item.unread {
          background: #f0f6ff;
        }
        .notification-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.2rem;
        }
        .notification-body {
          font-size: 0.75rem;
          color: #475569;
          line-height: 1.3;
        }
        .notification-time {
          font-size: 0.65rem;
          color: #94a3b8;
          margin-top: 0.3rem;
        }
        .mark-one-read {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.15rem;
        }
        .notification-loading,
        .notification-empty {
          padding: 1rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.8rem;
        }
        .notification-footer {
          padding: 0.5rem 1rem;
          border-top: 1px solid #e2e8f0;
        }
        .view-all {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.3rem;
        }
      `}</style>
    </div>
  );
}
