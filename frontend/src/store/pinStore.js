import { create } from "zustand";
import customAxios from "../config/axios";
import { toast } from "react-toastify";

export const usePinStore = create((set, get) => ({
  pins: [],
  pin: null,
  loading: true,
  feedMode: "discover",

  setPins: (val) => set({ pins: val }),
  setPin: (val) => set({ pin: val }),
  setLoading: (val) => set({ loading: val }),
  setFeedMode: (mode) => set({ feedMode: mode }),

  fetchPins: async (mode = "discover") => {
    set({ loading: true, feedMode: mode });
    try {
      const path = mode === "following" ? "/api/pin/feed" : "/api/pin/all";
      const { data } = await customAxios.get(path);
      set({ pins: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      console.error("Error fetching pins:", error);
      set({ pins: [], loading: false });
    }
  },

  fetchPin: async (id) => {
    const currentPin = get().pin;
    if (!currentPin || currentPin._id !== id) {
      set({ loading: true });
    }
    try {
      const { data } = await customAxios.get(`/api/pin/${id}`);
      set({ pin: data, loading: false });
    } catch (error) {
      console.error(`Error fetching pin ${id}:`, error);
      set({ pin: null, loading: false });
    }
  },

  recordView: async (id) => {
    try {
      await customAxios.post("/api/pin/view", { pinId: id });
    } catch {
      /* non-blocking */
    }
  },

  updatePin: async (id, title, pin, setEdit) => {
    try {
      const res = await customAxios.put(`/api/pin/${id}`, { title, pin });
      toast.success(res.apiMessage || "Pin updated");
      get().fetchPin(id);
      if (setEdit) setEdit(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update pin");
    }
  },

  addComment: async (id, comment, setComment) => {
    try {
      const res = await customAxios.post(`/api/pin/comment/${id}`, { comment });
      toast.success(res.apiMessage || "Comment added");
      get().fetchPin(id);
      if (setComment) setComment("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add comment");
    }
  },

  deleteComment: async (id, commentId) => {
    try {
      const res = await customAxios.delete(`/api/pin/comment/${id}?commentId=${commentId}`);
      toast.success(res.apiMessage || "Comment deleted");
      get().fetchPin(id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete comment");
    }
  },

  likePin: async (id) => {
    try {
      const res = await customAxios.post(`/api/pin/like/${id}`);
      toast.success(res.apiMessage || "Updated");
      get().fetchPin(id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Like operation failed");
    }
  },

  deletePin: async (id, navigate) => {
    set({ loading: true });
    try {
      const res = await customAxios.delete(`/api/pin/${id}`);
      toast.success(res.apiMessage || "Pin deleted");
      set({ loading: false });
      get().fetchPins(get().feedMode);
      if (navigate) navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete pin");
      set({ loading: false });
    }
  },

  addPin: async (formData, navigate) => {
    set({ loading: true });
    try {
      const res = await customAxios.post("/api/pin/new", formData);
      toast.success(res.apiMessage || "Pin created");
      set({ loading: false });
      get().fetchPins(get().feedMode);
      if (navigate) navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create pin");
      set({ loading: false });
    }
  }
}));
