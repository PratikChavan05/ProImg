import { useState, useEffect } from "react";
import customAxios from "../config/axios";
import { useAuthStore } from "../store/authStore";
import { useNavigate, useParams } from "react-router-dom";
import {
  UserCircle,
  UserPlus,
  UserMinus,
  Clock,
  AlertCircle,
  ChevronLeft,
  Search,
  Users,
  Heart,
  Loader,
  MessageSquare,
  Globe
} from "lucide-react";
import AllUsersPopup from "../components/AllUsersPopup";

const UserConnections = () => {
  const [userData, setUserData] = useState({ followers: [], following: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("followers");
  const [followLoading, setFollowLoading] = useState({});
  const currentUser = useAuthStore((s) => s.user);
  const toggleFollow = useAuthStore((s) => s.toggleFollow);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("");
  const [showAllUsersPopup, setShowAllUsersPopup] = useState(false);
  const [relationshipByUser, setRelationshipByUser] = useState({});

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    customAxios
      .get(`/api/user/${id}`)
      .then((res) => setUserName(res.data?.name || "User"))
      .catch(() => setUserName("User"));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await customAxios.get(`/api/user/get/${id}`);
        setUserData(res.data);
        setError(null);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("This account is private. Follow them to see their network.");
          setUserData({ followers: [], following: [] });
        } else {
          setError(err.response?.data?.message || "Could not load connections");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getViewerRelationship = (user) => {
    const uid = user._id?.toString();
    if (relationshipByUser[uid]) return relationshipByUser[uid];
    if (user.relationship) return user.relationship;
    if (
      currentUser?.following?.some((f) => (f._id || f).toString() === uid)
    ) {
      return "following";
    }
    return "none";
  };

  const handleFollowToggle = async (userId, event) => {
    event?.stopPropagation?.();
    if (!currentUser || currentUser._id === userId) return;

    setFollowLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const result = await toggleFollow(userId);
      const rel =
        result.relationship ||
        (result.followStatus === "requested"
          ? "requested"
          : result.followStatus === "following"
            ? "following"
            : "none");

      setRelationshipByUser((prev) => ({
        ...prev,
        [userId.toString()]: rel
      }));

      setUserData((prev) => ({
        followers: (prev.followers || []).map((u) =>
          u._id?.toString() === userId.toString() ? { ...u, relationship: rel } : u
        ),
        following: (prev.following || []).map((u) =>
          u._id?.toString() === userId.toString() ? { ...u, relationship: rel } : u
        )
      }));

      try {
        const res = await customAxios.get(`/api/user/get/${id}`);
        setUserData(res.data);
        setError(null);
      } catch (reloadErr) {
        if (reloadErr.response?.status !== 403) throw reloadErr;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getFilteredUsers = (users) => {
    if (!searchQuery) return users || [];
    const q = searchQuery.toLowerCase();
    return (users || []).filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  };

  const renderUserCard = (user) => (
    <div
      key={user._id}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/user/${user._id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/user/${user._id}`)}
      className="card p-4 flex items-center gap-4 hover:border-ocean-200 transition cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center text-white font-bold shrink-0">
        {user.name?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-ink truncate">{user.name}</h3>
        {user.email && <p className="text-sm text-ink-muted truncate">{user.email}</p>}
      </div>
      {currentUser && currentUser._id !== user._id && (
        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {user.canMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/messages/${user._id}`);
              }}
              className="btn-ghost !p-2"
              title="Message"
            >
              <MessageSquare size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => handleFollowToggle(user._id, e)}
            disabled={followLoading[user._id]}
            className={
              ["following", "requested"].includes(getViewerRelationship(user))
                ? "btn-secondary !py-2"
                : "btn-primary !py-2 !px-3"
            }
            title={
              getViewerRelationship(user) === "requested"
                ? "Cancel follow request"
                : getViewerRelationship(user) === "following"
                  ? "Unfollow"
                  : user.isPrivate
                    ? "Request to follow"
                    : "Follow"
            }
          >
            {followLoading[user._id] ? (
              <Loader size={16} className="animate-spin" />
            ) : getViewerRelationship(user) === "following" ? (
              <UserMinus size={16} />
            ) : getViewerRelationship(user) === "requested" ? (
              <Clock size={16} />
            ) : (
              <UserPlus size={16} />
            )}
          </button>
        </div>
      )}
    </div>
  );

  const list = activeTab === "followers" ? userData.followers : userData.following;
  const filtered = getFilteredUsers(list);

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Loader className="w-10 h-10 text-ocean-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-ink font-medium mb-4">{error}</p>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const displayName = userName || "User";

  return (
    <div className="page-shell">
      <div className="page-container max-w-3xl">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-ghost !p-2 mt-1" aria-label="Back">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="section-title">{displayName}&apos;s network</h1>
              <p className="section-sub">
                {activeTab === "followers" ? "People who follow them" : "People they follow"}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setShowAllUsersPopup(true)} className="btn-secondary !p-2.5" title="Discover users">
            <Globe size={20} />
          </button>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field !pl-10"
          />
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("followers")}
            className={activeTab === "followers" ? "chip-active" : "chip-inactive"}
          >
            <Users size={16} className="inline mr-1 -mt-0.5" />
            Followers ({userData.followers?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("following")}
            className={activeTab === "following" ? "chip-active" : "chip-inactive"}
          >
            <Heart size={16} className="inline mr-1 -mt-0.5" />
            Following ({userData.following?.length || 0})
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-ink-faint mb-3" />
            <p className="font-medium text-ink">
              {searchQuery ? "No matching users" : `No ${activeTab} yet`}
            </p>
            <button type="button" onClick={() => setShowAllUsersPopup(true)} className="btn-primary mt-4">
              Find people to follow
            </button>
          </div>
        ) : (
          <div className="space-y-3">{filtered.map(renderUserCard)}</div>
        )}
      </div>

      <AllUsersPopup
        isOpen={showAllUsersPopup}
        onClose={() => setShowAllUsersPopup(false)}
        onNavigateToProfile={(uid) => navigate(`/user/${uid}`)}
        onMessageUser={(uid, e) => {
          e.stopPropagation();
          navigate(`/messages/${uid}`);
        }}
        onFollowToggle={handleFollowToggle}
        followLoading={followLoading}
      />
    </div>
  );
};

export default UserConnections;
