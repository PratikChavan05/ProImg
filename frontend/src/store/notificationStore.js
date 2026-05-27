import { create } from "zustand";
import customAxios from "../config/axios";

export const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true, error: null });
    try {
      const { data } = await customAxios.get("/api/notifications", {
        params: { limit: 40, unread: unreadOnly ? "true" : "false" }
      });
      const payload = data?.items ? data : { items: Array.isArray(data) ? data : [], unreadCount: 0 };
      set({
        items: payload.items || [],
        unreadCount: payload.unreadCount ?? 0,
        loading: false
      });
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to load notifications"
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await customAxios.get("/api/notifications/unread-count");
      set({ unreadCount: data?.count ?? 0 });
    } catch {
      /* ignore polling errors */
    }
  },

  markRead: async (id) => {
    await customAxios.patch(`/api/notifications/${id}/read`);
    set((state) => ({
      items: state.items.map((n) => (n._id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  },

  markAllRead: async () => {
    await customAxios.patch("/api/notifications/read-all");
    set((state) => ({
      items: state.items.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },

  deleteNotification: async (id) => {
    await customAxios.delete(`/api/notifications/${id}`);
    const wasUnread = get().items.find((n) => n._id === id && !n.read);
    set((state) => ({
      items: state.items.filter((n) => n._id !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    }));
  }
}));
