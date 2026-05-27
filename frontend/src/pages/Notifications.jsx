import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotificationStore } from "../store/notificationStore";

const Notifications = () => {
  const navigate = useNavigate();
  const {
    items,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  const open = async (n) => {
    if (!n.read) await markRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Bell size={28} className="text-ocean-600" />
              Notifications
            </h1>
            <p className="section-sub">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="btn-secondary !text-sm">
              <CheckCheck size={18} /> Mark all read
            </button>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin text-ocean-600" size={32} />
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center text-ink-muted">No notifications yet.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n._id} className="card card-hover p-4 flex gap-3 items-start">
                <button type="button" onClick={() => open(n)} className="flex-1 text-left min-w-0">
                  <p className={`text-sm ${!n.read ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {n.title}
                  </p>
                  {n.body && <p className="text-sm text-ink-muted mt-1">{n.body}</p>}
                  <p className="text-xs text-ink-faint mt-2">
                    {n.createdAt &&
                      formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteNotification(n._id)}
                  className="btn-ghost !p-2 text-ink-faint hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
