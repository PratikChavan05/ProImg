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
  const {
    setIsAuth,
    setUser,
    fetchUser,
    isAuth,
    loading: authLoading,
    updatePrivacy,
    createPaymentOrder,
    verifyPayment,
    cancelPremium
  } = UserData();
  const [privacySaving, setPrivacySaving] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(Boolean(user?.isPrivate));
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    setIsPrivateAccount(Boolean(user?.isPrivate));
  }, [user?.isPrivate]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pins, loading } = PinData();
  const [likedPins, setLikedPins] = useState([]);
  const [activeTab, setActiveTab] = useState("yourPins");
  const [showAllUsersPopup, setShowAllUsersPopup] = useState(false);
  const [followLoading, setFollowLoading] = useState({});

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (simulated = false) => {
    try {
      setPaymentLoading(true);
      
      if (simulated) {
        const orderRes = await createPaymentOrder();
        const mockOrder = orderRes.order;
        await verifyPayment({
          razorpay_order_id: mockOrder.id,
          razorpay_payment_id: "pay_simulated_" + Math.random().toString(36).substring(2, 10),
          razorpay_signature: "simulated_signature",
          simulated: true
        });
        await fetchUser({ silent: true });
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Razorpay Checkout failed to load. Please check your internet connection.");
        return;
      }

      const orderData = await createPaymentOrder();
      const { order, keyId } = orderData;

      if (order.simulated) {
        toast.info("Using simulated checkout (No real API credentials configured on server).");
        await verifyPayment({
          razorpay_order_id: order.id,
          razorpay_payment_id: "pay_simulated_" + Math.random().toString(36).substring(2, 10),
          razorpay_signature: "simulated_signature",
          simulated: true
        });
        await fetchUser({ silent: true });
        return;
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ProImg Premium",
        description: "Unlock ProImg Premium benefits",
        order_id: order.id,
        handler: async function (response) {
          try {
            setPaymentLoading(true);
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            await fetchUser({ silent: true });
          } catch (err) {
            toast.error("Payment validation failed: " + (err.response?.data?.message || err.message));
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email
        },
        theme: {
          color: "#d97706"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelPremium = async () => {
    try {
      setPaymentLoading(true);
      await cancelPremium();
      await fetchUser({ silent: true });
    } catch (err) {
      console.error("Cancellation error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

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
        <div className="card p-6 md:p-8 mb-8 overflow-hidden relative">
          {user.isPremium && (
            <div className="absolute top-0 right-0 bg-amber-500 text-white font-semibold text-[10px] px-8 py-1.5 uppercase tracking-widest rotate-45 translate-x-7 translate-y-3 shadow-soft select-none">
              Pro
            </div>
          )}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className={`w-28 h-28 rounded-2xl flex items-center justify-center shrink-0 shadow-lift relative ${
              user.isPremium
                ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 ring-4 ring-amber-400/60 ring-offset-2"
                : "bg-gradient-to-br from-ocean-400 to-fresh-500"
            }`}>
              <span className="text-4xl font-bold text-white relative">
                {user.name?.slice(0, 1).toUpperCase() || "?"}
              </span>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="section-title capitalize flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                {user.name || "User"}
                {user.isPremium && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 shadow-soft">
                    <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-600/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Pro
                  </span>
                )}
              </h1>
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

        {/* Pro Account & Billing Hub */}
        <div className={`card p-6 md:p-8 mb-8 border relative overflow-hidden transition-all duration-300 ${
          user.isPremium
            ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-600/10 border-amber-300/60 shadow-soft"
            : "bg-gradient-to-r from-slate-50 to-stone-50 border-stone-200 shadow-sm"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2.5">
                <svg className="w-5 h-5 text-amber-600 shrink-0 fill-amber-600/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h2 className="text-lg font-bold text-ink tracking-tight">ProImg Pro Plan</h2>
              </div>
              <p className="text-ink-muted text-sm max-w-xl leading-relaxed">
                {user.isPremium
                  ? "Your account is active. You have full access to high-priority messaging, custom profile badges, E2E encryption status indicators, and highlighted feed options."
                  : "Unlock professional tools. Upgrade now to get a verified star badge, priority signaling for end-to-end encryption, highlighted feed tags, and access to premium creative analytics."}
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-2.5 w-full md:w-auto">
              {user.isPremium ? (
                <button
                  type="button"
                  disabled={paymentLoading}
                  onClick={handleCancelPremium}
                  className="btn-secondary w-full md:w-auto text-amber-800 border-amber-300 hover:bg-amber-50 flex items-center justify-center gap-2"
                >
                  {paymentLoading ? <Loader size={16} className="animate-spin" /> : null}
                  Cancel Subscription
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-center md:text-right mb-1">
                    <span className="text-2xl font-black text-amber-700">₹2</span>
                    <span className="text-xs text-ink-muted"> / month</span>
                  </div>
                  <div className="flex justify-center md:justify-start">
                    <button
                      type="button"
                      disabled={paymentLoading}
                      onClick={() => handlePayment(false)}
                      className="btn-primary w-full md:w-auto bg-gradient-to-r from-amber-500 to-yellow-600 border-none hover:from-amber-600 hover:to-yellow-700 text-white font-bold flex items-center justify-center gap-2 px-8 shadow-md"
                    >
                      {paymentLoading ? <Loader size={16} className="animate-spin text-white" /> : "Upgrade to Pro"}
                    </button>
                  </div>
                </div>
              )}
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