import { create } from "zustand";
import { persist } from "zustand/middleware";
import customAxios from "../config/axios";
import { toast } from "react-toastify";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuth: false,
      btnLoading: false,
      loading: true,

      setBtnLoading: (val) => set({ btnLoading: val }),
      setIsAuth: (val) => set({ isAuth: val }),
      setUser: (val) =>
        set((state) => {
          const next = typeof val === "function" ? val(state.user) : val;
          return { user: next, isAuth: !!next };
        }),

      fetchUser: async ({ silent = false } = {}) => {
        if (!silent) set({ loading: true });
        try {
          const { data } = await customAxios.get("/api/user/me");
          set({ user: data, isAuth: true, loading: false });
        } catch {
          set({ user: null, isAuth: false, loading: false });
        }
      },

      syncReplicas: async ({ silent = false } = {}) => {
        try {
          const res = await customAxios.post("/api/user/sync-replicas");
          if (!silent) toast.success(res.apiMessage || "User directory synced");
        } catch (error) {
          if (!silent) toast.error(error.response?.data?.message || "Sync failed");
        }
      },

      loginUser: async (email, password, navigate, fetchPins) => {
        set({ btnLoading: true });
        try {
          const res = await customAxios.post("/api/user/login", { email, password });
          toast.success(res.apiMessage || "Logged in");
          set({ user: res.data.user, isAuth: true, btnLoading: false });
          navigate("/");
          if (fetchPins) fetchPins();
        } catch (error) {
          toast.error(error.response?.data?.message || "Login failed");
          set({ btnLoading: false });
        }
      },

      forgotUser: async (email, navigate) => {
        set({ btnLoading: true });
        try {
          const res = await customAxios.post("/api/user/forget", { email });
          toast.success(res.apiMessage || "OTP sent");
          set({ btnLoading: false });
          navigate(`/reset-password/${res.data.token}`);
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to initiate password reset");
          set({ btnLoading: false });
        }
      },

      resetUser: async (token, otp, password, navigate) => {
        set({ btnLoading: true });
        try {
          const res = await customAxios.post(`/api/user/reset-password/${token}`, { otp, password });
          toast.success(res.apiMessage || "Password reset");
          set({ btnLoading: false });
          navigate("/login");
        } catch (error) {
          toast.error(error.response?.data?.message || "Password reset failed");
          set({ btnLoading: false });
        }
      },

      registerUser: async (name, email, password, navigate) => {
        set({ btnLoading: true });
        try {
          const res = await customAxios.post("/api/user/register", { name, email, password });
          toast.success(res.apiMessage || "Check your email");
          set({ btnLoading: false });
          navigate(`/verify/${res.data.token}`);
        } catch (error) {
          toast.error(error.response?.data?.message || "Registration failed");
          set({ btnLoading: false });
        }
      },

      verify: async (token, otp, navigate, fetchPins) => {
        set({ btnLoading: true });
        try {
          const res = await customAxios.post(`/api/user/verifyOtp/${token}`, { otp });
          toast.success(res.apiMessage || "Verified");
          set({ user: res.data.user, isAuth: true, btnLoading: false });
          navigate("/");
          await get().syncReplicas();
          if (fetchPins) fetchPins();
        } catch (error) {
          toast.error(error.response?.data?.message || "OTP Verification failed");
          set({ btnLoading: false });
        }
      },

      logOutUser: async (navigate) => {
        set({ btnLoading: true });
        try {
          const res = await customAxios.get("/api/user/logout");
          toast.success(res.apiMessage || "Logged out");
          set({ user: null, isAuth: false, btnLoading: false });
          localStorage.removeItem("proimg-auth-storage");
          if (navigate) navigate("/login");
        } catch (error) {
          toast.error(error.response?.data?.message || "Logout failed");
          set({ btnLoading: false });
        }
      },

      /** @returns {{ isFollowing: boolean, targetFollowersCount?: number }} */
      toggleFollow: async (targetUserId) => {
        const me = get().user;
        if (!me?._id) {
          throw new Error("Not logged in");
        }

        try {
          const res = await customAxios.post(`/api/user/follow/${targetUserId}`);
          const payload = res.data || {};

          set((state) => ({
            user: {
              ...state.user,
              following: Array.isArray(payload.following)
                ? payload.following
                : state.user?.following
            }
          }));

          const followStatus = payload.followStatus || (payload.isFollowing ? "following" : "none");
          const relationship =
            payload.relationship ||
            (followStatus === "requested"
              ? "requested"
              : followStatus === "following"
                ? "following"
                : "none");

          return {
            isFollowing: followStatus === "following",
            isRequested: followStatus === "requested",
            followStatus,
            relationship,
            targetFollowersCount: payload.targetFollowersCount
          };
        } catch (error) {
          toast.error(error.response?.data?.message || "Follow operation failed");
          throw error;
        }
      },

      updatePrivacy: async (isPrivate) => {
        const res = await customAxios.patch("/api/user/privacy", { isPrivate });
        const nextPrivate = res.data?.isPrivate ?? isPrivate;
        const profile = res.data?.user;
        set((state) => ({
          user: profile
            ? { ...state.user, ...profile, isPrivate: Boolean(profile.isPrivate) }
            : { ...state.user, isPrivate: Boolean(nextPrivate) }
        }));
        toast.success(res.apiMessage || "Privacy updated");
        return res.data;
      },

      fetchFollowRequests: async () => {
        const { data } = await customAxios.get("/api/user/follow-requests");
        return Array.isArray(data) ? data : [];
      },

      acceptFollowRequest: async (requesterId) => {
        const res = await customAxios.post(`/api/user/follow-requests/${requesterId}/accept`);
        toast.success(res.apiMessage || "Request accepted");
        await get().fetchUser({ silent: true });
        return res.data;
      },

      rejectFollowRequest: async (requesterId) => {
        const res = await customAxios.post(`/api/user/follow-requests/${requesterId}/reject`);
        toast.success(res.apiMessage || "Request declined");
        await get().fetchUser({ silent: true });
      },

      followUser: async (id, callback) => {
        await get().toggleFollow(id);
        if (callback) callback();
      }
    }),
    {
      name: "proimg-auth-storage",
      partialize: (state) => ({ user: state.user, isAuth: state.isAuth })
    }
  )
);
