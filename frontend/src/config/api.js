export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";

/** Socket.io — use chat-service directly in dev if gateway WS fails (VITE_SOCKET_URL=http://localhost:5003) */
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5005";

export default API_BASE_URL;
