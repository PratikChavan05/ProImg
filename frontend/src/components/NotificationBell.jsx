import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotificationStore } from "../store/notificationStore";

const typeEmoji = {
  like: "❤️",
  comment: "💬",
  follow: "👤",
  follow_request: "📩",
  follow_accepted: "✓",
  message: "✉️",
  system: "ℹ️",
  digest: "📬"
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const {
    items,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead
  } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    const pollMs = Number(import.meta.env.VITE_NOTIFICATION_POLL_MS) || (import.meta.env.DEV ? 10000 : 30000);
    const interval = setInterval(fetchUnreadCount, pollMs);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications(false);
  }, [open, fetchNotifications]);

  useEffect(() => {
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleClick = async (n) => {
    if (!n.read) await markRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-ink-muted hover:bg-paper-dark hover:text-ink transition"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-ocean-600 text-white text-[10px] font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,380px)] card shadow-lift z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h2 className="font-semibold text-ink">Notifications</h2>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="btn-ghost !py-1 !px-2 text-xs"
                  title="Mark all read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost !p-1.5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader className="animate-spin text-ocean-600" size={28} />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-10 px-4">No notifications yet</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-paper-dark transition border-b border-stone-50 ${
                        !n.read ? "bg-ocean-50/40" : ""
                      }`}
                    >
                      <span className="text-lg shrink-0">{typeEmoji[n.type] || "•"}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${!n.read ? "font-semibold text-ink" : "text-ink-soft"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-ink-muted truncate mt-0.5">{n.body}</p>
                        )}
                        <p className="text-[11px] text-ink-faint mt-1">
                          {n.createdAt
                            ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                            : ""}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-ocean-500 shrink-0 mt-2" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-sm text-ocean-700 font-medium py-3 border-t border-stone-100 hover:bg-paper-dark"
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
