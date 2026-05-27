import { useEffect, useState } from "react";
import { Loader, UserCheck, UserX, Users } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const FollowRequestsPanel = () => {
  const fetchFollowRequests = useAuthStore((s) => s.fetchFollowRequests);
  const acceptFollowRequest = useAuthStore((s) => s.acceptFollowRequest);
  const rejectFollowRequest = useAuthStore((s) => s.rejectFollowRequest);
  const incomingCount = useAuthStore((s) => s.user?.incomingFollowRequestsCount);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      setRequests(await fetchFollowRequests());
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [incomingCount]);

  if (loading) {
    return (
      <div className="card p-6 flex justify-center">
        <Loader className="w-8 h-8 text-ocean-600 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="card p-6 mb-8">
      <h2 className="font-semibold text-ink flex items-center gap-2 mb-4">
        <Users size={20} className="text-ocean-600" />
        Follow requests
        <span className="text-sm font-normal text-ink-muted">({requests.length})</span>
      </h2>
      <ul className="space-y-3">
        {requests.map((req) => {
          const u = req.user;
          if (!u?._id) return null;
          return (
            <li
              key={req._id || u._id}
              className="flex items-center gap-3 p-3 rounded-xl bg-paper-50 border border-paper-200"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center text-white font-bold shrink-0">
                {u.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{u.name}</p>
                {u.email && <p className="text-xs text-ink-muted truncate">{u.email}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={acting[u._id]}
                  onClick={async () => {
                    setActing((p) => ({ ...p, [u._id]: true }));
                    try {
                      await acceptFollowRequest(u._id);
                      setRequests((prev) => prev.filter((r) => r.user?._id !== u._id));
                    } finally {
                      setActing((p) => ({ ...p, [u._id]: false }));
                    }
                  }}
                  className="btn-primary !py-2 !px-3"
                  title="Accept"
                >
                  {acting[u._id] ? <Loader size={16} className="animate-spin" /> : <UserCheck size={16} />}
                </button>
                <button
                  type="button"
                  disabled={acting[u._id]}
                  onClick={async () => {
                    setActing((p) => ({ ...p, [u._id]: true }));
                    try {
                      await rejectFollowRequest(u._id);
                      setRequests((prev) => prev.filter((r) => r.user?._id !== u._id));
                    } finally {
                      setActing((p) => ({ ...p, [u._id]: false }));
                    }
                  }}
                  className="btn-secondary !py-2 !px-3"
                  title="Decline"
                >
                  <UserX size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FollowRequestsPanel;
