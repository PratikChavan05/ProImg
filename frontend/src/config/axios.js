import axios from "axios";
import API_BASE_URL from "./api";

const customAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  }
});

// Let the browser set multipart boundary when uploading files
customAxios.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Unwrap microservice envelope { success, message, data }
customAxios.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && body.success === true && "data" in body) {
      response.apiMessage = body.message;
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh token logic if request is to login or verify routes
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/api/user/login") &&
      !originalRequest.url.includes("/api/user/register") &&
      !originalRequest.url.includes("/api/user/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return customAxios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint on auth-service (routed via gateway)
        await axios.post(
          `${API_BASE_URL}/api/user/refresh`,
          {},
          { withCredentials: true }
        );

        isRefreshing = false;
        processQueue(null);
        
        // Retry the original failed request
        return customAxios(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // Clear local storage on refresh failure
        localStorage.removeItem("proimg-auth-storage");
        
        const publicRoutes = ["/", "/login", "/register", "/forgot"];
        const isPublicRoute =
          publicRoutes.includes(window.location.pathname) ||
          window.location.pathname.startsWith("/pin/") ||
          window.location.pathname.startsWith("/user/") ||
          window.location.pathname.startsWith("/reset-password/") ||
          window.location.pathname.startsWith("/verify/");

        if (!isPublicRoute) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default customAxios;
