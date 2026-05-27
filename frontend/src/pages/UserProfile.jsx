import React, { useEffect, useState } from "react";
import customAxios from "../config/axios";
import { useParams, useNavigate } from "react-router-dom";
import PinCard from "../components/PinCard";
import { useAuthStore } from "../store/authStore";
import {
  UserCircle,
  Grid,
  Loader,
  MessageSquare,
  AlertCircle,
  Calendar,
  BookmarkPlus,
  UserPlus,
  UserMinus,
  ChevronLeft,
  Lock,
  Heart,
  Clock
} from "lucide-react";

const UserProfile = ({ user: loggedInUser }) => {
  const toggleFollow = useAuthStore((s) => s.toggleFollow);
  const params = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profilePins, setProfilePins] = useState([]);
  const [pinsLoading, setPinsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pins");

  const relationship = user?.relationship || "none";
  const canViewContent = user?.canViewContent !== false;
  const isOwnProfile = relationship === "self";

  async function fetchUser() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await customAxios.get(`/api/user/${params.id}`);
      setUser(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfilePins(profile = user) {
    if (!params.id || profile?.canViewContent === false) {
      setProfilePins([]);
      return;
    }
    setPinsLoading(true);
    try {
      const { data } = await customAxios.get(`/api/pin/user/${params.id}`);
      setProfilePins(Array.isArray(data) ? data : []);
    } catch {
      setProfilePins([]);
    } finally {
      setPinsLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) fetchUser();
  }, [params.id]);

  useEffect(() => {
    if (user) fetchProfilePins(user);
  }, [user?._id, user?.canViewContent, user?.relationship]);

  const followHandler = async () => {
    if (!loggedInUser?._id) {
      navigate("/login");
      return;
    }

    setFollowLoading(true);
    try {
      const result = await toggleFollow(user._id);
      const rel =
        result.relationship ||
        (result.followStatus === "requested"
          ? "requested"
          : result.followStatus === "following"
            ? "following"
            : "none");

      setUser((prev) =>
        prev
          ? {
              ...prev,
              relationship: rel,
              canViewContent: rel === "following" || rel === "self",
              followersCount:
                typeof result.targetFollowersCount === "number"
                  ? result.targetFollowersCount
                  : prev.followersCount
            }
          : prev
      );

      await fetchUser();
      if (result.followStatus === "following") {
        await fetchProfilePins();
      } else {
        setProfilePins([]);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
  };

  const renderFollowButton = () => {
    if (!loggedInUser || isOwnProfile) return null;

    if (relationship === "following") {
      return (
        <button type="button" onClick={followHandler} disabled={followLoading} className="btn-secondary">
          {followLoading ? <Loader size={18} className="animate-spin" /> : <UserMinus size={18} />}
          {followLoading ? "Updating…" : "Unfollow"}
        </button>
      );
    }

    if (relationship === "requested") {
      return (
        <button type="button" onClick={followHandler} disabled={followLoading} className="btn-secondary">
          {followLoading ? <Loader size={18} className="animate-spin" /> : <Clock size={18} />}
          {followLoading ? "Updating…" : "Requested"}
        </button>
      );
    }

    return (
      <button type="button" onClick={followHandler} disabled={followLoading} className="btn-primary">
        {followLoading ? <Loader size={18} className="animate-spin" /> : <UserPlus size={18} />}
        {followLoading ? "Updating…" : user?.isPrivate ? "Request to follow" : "Follow"}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[50vh]">
        <Loader className="w-10 h-10 text-ocean-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[50vh] p-6">
        <div className="card p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-ink mb-4">{error}</p>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[50vh] p-6">
        <div className="card p-8 text-center">
          <UserCircle className="w-12 h-12 mx-auto mb-3 text-ink-faint" />
          <p className="font-semibold text-ink mb-4">User not found</p>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const pinsCount = canViewContent
    ? profilePins.length
    : undefined;
  const followersCount = user.followersCount ?? user.followers?.length ?? 0;
  const followingCount = user.followingCount ?? user.following?.length ?? 0;

  return (
    <div className="page-shell pb-12">
      <div className="page-container">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost !pl-0 mb-4 flex items-center gap-1">
          <ChevronLeft size={20} />
          Back
        </button>

        <div className="card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center shrink-0 shadow-lift overflow-hidden relative">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white">
                  {user.name?.slice(0, 1).toUpperCase() || "?"}
                </span>
              )}
              {user.isPrivate && !isOwnProfile && (
                <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
                  <Lock size={14} className="text-ocean-600" />
                </span>
              )}
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="section-title capitalize flex items-center justify-center md:justify-start gap-2">
                {user.name || "Unknown user"}
                {user.isPrivate && (
                  <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-paper-100 text-ink-muted border border-paper-200">
                    Private
                  </span>
                )}
              </h1>
              {canViewContent && user.email && (
                <p className="text-ink-muted mb-2">{user.email}</p>
              )}
              <p className="text-sm text-ink-faint mb-5 flex items-center justify-center md:justify-start gap-1">
                <Calendar size={15} className="text-ocean-600" />
                Joined {formatJoinDate(user.createdAt)}
              </p>

              {canViewContent && user.bio && (
                <p className="text-ink-muted text-sm mb-5 p-4 rounded-xl bg-paper-100 border border-paper-200">
                  {user.bio}
                </p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                {canViewContent && (
                  <div className="card !shadow-none px-5 py-3 min-w-[100px]">
                    <p className="text-xs text-ink-muted uppercase tracking-wide">Pins</p>
                    <p className="text-2xl font-bold text-ink">{pinsCount ?? profilePins.length}</p>
                  </div>
                )}
                {canViewContent && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/get/${user._id}`)}
                      className="card !shadow-none px-5 py-3 text-left hover:border-ocean-200 min-w-[100px]"
                    >
                      <p className="text-xs text-ink-muted uppercase tracking-wide">Followers</p>
                      <p className="text-2xl font-bold text-ink">{followersCount}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/get/${user._id}`)}
                      className="card !shadow-none px-5 py-3 text-left hover:border-ocean-200 min-w-[100px]"
                    >
                      <p className="text-xs text-ink-muted uppercase tracking-wide">Following</p>
                      <p className="text-2xl font-bold text-ink">{followingCount}</p>
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {renderFollowButton()}
                {loggedInUser && !isOwnProfile && user.canMessage && (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${user._id}`)}
                    className="btn-secondary"
                  >
                    <MessageSquare size={18} />
                    Message
                  </button>
                )}
                {isOwnProfile && (
                  <>
                    <button type="button" onClick={() => navigate("/create")} className="btn-primary">
                      <Grid size={18} />
                      Create pin
                    </button>
                    <button type="button" onClick={() => navigate("/account")} className="btn-secondary">
                      Account settings
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {!canViewContent ? (
          <div className="card p-12 text-center max-w-lg mx-auto">
            <Lock className="w-14 h-14 mx-auto mb-4 text-ink-faint" />
            <p className="font-display text-xl font-semibold text-ink mb-2">This account is private</p>
            <p className="text-ink-muted text-sm mb-6">
              {relationship === "requested"
                ? "Your follow request is pending. You'll see their pins once they approve it."
                : "Follow this account to see their photos and videos."}
            </p>
            {renderFollowButton()}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("pins")}
                className={activeTab === "pins" ? "chip-active" : "chip-inactive"}
              >
                <Grid size={16} className="inline mr-1 -mt-0.5" />
                Pins
              </button>
            </div>

            {pinsLoading ? (
              <div className="flex justify-center py-16">
                <Loader className="w-10 h-10 text-ocean-600 animate-spin" />
              </div>
            ) : profilePins.length > 0 ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
                {profilePins.map((pin) => (
                  <div key={pin._id} className="break-inside-avoid">
                    <PinCard pin={pin} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <Grid className="w-12 h-12 mx-auto mb-3 text-ink-faint" />
                <p className="font-semibold text-ink mb-1">No pins yet</p>
                <p className="text-sm text-ink-muted">
                  {isOwnProfile
                    ? "Create your first pin to share with followers."
                    : "This user hasn't posted anything yet."}
                </p>
                {isOwnProfile && (
                  <button type="button" onClick={() => navigate("/create")} className="btn-primary mt-4">
                    Create pin
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
