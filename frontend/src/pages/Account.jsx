import React, { useEffect, useState } from "react";
import { PinData } from "../context/PinContext";
import PinCard from "../components/PinCard";
import {toast} from "react-toastify";
import customAxios from "../config/axios";
import { useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext";
import { LogOut, UserCircle, Grid, Loader, Heart, Globe, MessageSquare, Lock, LockOpen } from "lucide-react";
import AllUsersPopup from "../components/AllUsersPopup";
import FollowRequestsPanel from "../components/FollowRequestsPanel";
import { useAuthStore } from "../store/authStore";

const Account = ({ user }) => {
  const navigate = useNavigate();
  const { setIsAuth, setUser, fetchUser, isAuth, loading: authLoading, updatePrivacy } = UserData();
  const [privacySaving, setPrivacySaving] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(Boolean(user?.isPrivate));

  useEffect(() => {
    setIsPrivateAccount(Boolean(user?.isPrivate));
  }, [user?.isPrivate]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pins, loading } = PinData();
  const [likedPins, setLikedPins] = useState([]);
  const [activeTab, setActiveTab] = useState("yourPins");
  const [showAllUsersPopup, setShowAllUsersPopup] = useState(false);
  const [followLoading, setFollowLoading] = useState({});

  const logoutHandler = async () => {
    try {
      setIsLoggingOut(true);
      const res = await customAxios.get("/api/user/logout");
      toast.success(res.apiMessage || "Logged out");
      setIsAuth(false);
      setUser(null);
      navigate("/login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userPins =
    pins && user?._id
      ? pins.filter((pin) => {
          const ownerId = pin.owner?._id || pin.owner;
          return ownerId?.toString() === user._id.toString();
        })
      : [];

  useEffect(() => {
    const userId = user?._id;
    if (!userId) return;

    let cancelled = false;
    const fetchLikedPins = async () => {
      try {
        const { data } = await customAxios.get(`/api/pin/liked/${userId}`);
        if (!cancelled) setLikedPins(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) toast.error("Failed to fetch liked pins");
      }
    };

    fetchLikedPins();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  // Handler for following/unfollowing users from popup
  const handleFollowToggle = async (userId, event) => {
    event.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user._id === userId) {
      return;
    }

    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const { toggleFollow } = useAuthStore.getState();
      await toggleFollow(userId);
    } catch (err) {
      console.error('Error toggling follow:', err);
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handler for messaging users from popup
  const handleMessageUser = (userId, event) => {
    event.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user._id === userId) {
      return;
    }

    navigate(`/messages/${userId}`);
  };

  // Handler for navigating to user profile from popup
  const navigateToProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  if (authLoading || (isAuth && !user?._id)) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 mx-auto mb-4 text-ocean-600 animate-spin" />
          <p className="text-ink-muted">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center shrink-0 shadow-lift">
              <span className="text-4xl font-bold text-white">
                {user.name?.slice(0, 1).toUpperCase() || "?"}
              </span>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="section-title capitalize">{user.name || "User"}</h1>
              <p className="text-ink-muted mb-5">{user.email}</p>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                {[
                  { label: "Pins", value: userPins.length },
                  {
                    label: "Followers",
                    value: user.followers?.length || 0,
                    onClick: () => navigate(`/get/${user._id}`)
                  },
                  {
                    label: "Following",
                    value: user.following?.length || 0,
                    onClick: () => navigate(`/get/${user._id}`)
                  }
                ].map((stat) => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={stat.onClick}
                    className="card !shadow-none px-5 py-3 text-left hover:border-ocean-200 transition min-w-[100px]"
                  >
                    <p className="text-xs text-ink-muted uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold text-ink">{stat.value}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center md:justify-start gap-3 mb-5 p-4 rounded-xl bg-paper-100 border border-paper-200">
                <div className="flex-1 text-left">
                  <p className="font-medium text-ink flex items-center gap-2">
                    {isPrivateAccount ? <Lock size={18} className="text-ocean-600" /> : <LockOpen size={18} className="text-ink-muted" />}
                    Private account
                  </p>
                  <p className="text-sm text-ink-muted mt-0.5">
                    {isPrivateAccount
                      ? "Only approved followers can see your pins."
                      : "Anyone can follow you and see your pins."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={privacySaving}
                  role="switch"
                  aria-checked={isPrivateAccount}
                  onClick={async () => {
                    const next = !isPrivateAccount;
                    setPrivacySaving(true);
                    setIsPrivateAccount(next);
                    try {
                      await updatePrivacy(next);
                      await fetchUser({ silent: true });
                    } catch {
                      setIsPrivateAccount(!next);
                    } finally {
                      setPrivacySaving(false);
                    }
                  }}
                  className={`relative w-12 h-7 rounded-full transition shrink-0 ${
                    isPrivateAccount ? "bg-ocean-500" : "bg-stone-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      isPrivateAccount ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <button type="button" onClick={() => navigate("/create")} className="btn-primary">
                  <Grid size={18} /> Create pin
                </button>
                <button type="button" onClick={() => setShowAllUsersPopup(true)} className="btn-secondary">
                  <Globe size={18} /> Find people
                </button>
                <button
                  type="button"
                  onClick={logoutHandler}
                  disabled={isLoggingOut}
                  className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                >
                  {isLoggingOut ? <Loader size={18} className="animate-spin" /> : <LogOut size={18} />}
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>

        <FollowRequestsPanel />

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            className={activeTab === "yourPins" ? "chip-active" : "chip-inactive"}
            onClick={() => setActiveTab("yourPins")}
          >
            <UserCircle size={16} className="inline mr-1 -mt-0.5" />
            Your pins
          </button>
          <button
            type="button"
            className={activeTab === "likedPins" ? "chip-active" : "chip-inactive"}
            onClick={() => setActiveTab("likedPins")}
          >
            <Heart size={16} className="inline mr-1 -mt-0.5" />
            Liked
          </button>
        </div>

        {activeTab === "yourPins" ? (
          loading ? (
            <div className="flex justify-center py-16">
              <Loader className="w-10 h-10 text-ocean-600 animate-spin" />
            </div>
          ) : userPins.length > 0 ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
              {userPins.map((pin) => (
                <div key={pin._id} className="break-inside-avoid">
                  <PinCard pin={pin} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Grid className="w-12 h-12 mx-auto mb-3 text-ink-faint" />
              <p className="font-semibold text-ink mb-1">No pins yet</p>
              <p className="text-sm text-ink-muted mb-4">Share your first idea with the community.</p>
              <button type="button" onClick={() => navigate("/create")} className="btn-primary">
                Create your first pin
              </button>
            </div>
          )
        ) : likedPins.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {likedPins.map((pin) => (
              <div key={pin._id} className="break-inside-avoid">
                <PinCard pin={pin} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-ink-faint" />
            <p className="font-semibold text-ink mb-1">No liked pins</p>
            <button type="button" onClick={() => navigate("/")} className="btn-primary mt-4">
              Explore feed
            </button>
          </div>
        )}
      </div>

      {/* All Users Popup */}
      <AllUsersPopup
        isOpen={showAllUsersPopup}
        onClose={() => setShowAllUsersPopup(false)}
        onNavigateToProfile={navigateToProfile}
        onMessageUser={handleMessageUser}
        onFollowToggle={handleFollowToggle}
        followLoading={followLoading}
      />
    </div>
  );
};

export default Account;