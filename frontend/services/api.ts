import axios from "axios";
import { getValidAccessToken, removeAccessToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/restaurant",
  "/categories",
  "/products",
  "/branches",
  "/social-links",
  "/contacts",
  "/promotions",
];

const NO_REFRESH_PATHS = [
  "/auth/token/refresh",
  "/auth/login",
  "/auth/register",
  "/auth/logout",
];

function isPublicPath(url: string | undefined): boolean {
  if (!url) return false;
  const index = url.indexOf("/api");
  const path = index !== -1 ? url.slice(index + 4) : url;
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function isNoRefreshPath(url: string | undefined): boolean {
  if (!url) return false;
  const index = url.indexOf("/api");
  const path = index !== -1 ? url.slice(index + 4) : url;
  return NO_REFRESH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access: string }>(
        `${api.defaults.baseURL}/auth/token/refresh/`,
        {},
        { withCredentials: true }
      )
      .then((res) => {
        const access = res.data.access;
        localStorage.setItem("access_token", access);
        return access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getValidAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response && !originalRequest._networkRetry) {
      originalRequest._networkRetry = (originalRequest._networkRetry || 0) + 1;
      if (originalRequest._networkRetry <= 3) {
        const delay = originalRequest._networkRetry * 2000;
        await new Promise((r) => setTimeout(r, delay));
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const noRefresh = isNoRefreshPath(originalRequest.url);
      const method = (originalRequest.method || "get").toLowerCase();

      if (isPublicPath(originalRequest.url) && method === "get") {
        if (typeof window !== "undefined") {
          removeAccessToken();
        }
        if (!originalRequest._anonymousRetry) {
          originalRequest._anonymousRetry = true;
          delete originalRequest.headers.Authorization;
          return api(originalRequest);
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const access = localStorage.getItem("access_token");
      const loggedOut = sessionStorage.getItem("auth_logged_out") === "1";

      if (access && !loggedOut && !noRefresh) {
        try {
          const fresh = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${fresh}`;
          return api(originalRequest);
        } catch {
          sessionStorage.setItem("auth_logged_out", "1");
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          const url = originalRequest.url || "";
          if (typeof window !== "undefined" && !url.includes("/auth/logout/") && !url.includes("/auth/login/")) {
            sessionStorage.setItem("auth_pending", "login");
            window.location.replace("/");
          }
        }
      } else if (typeof window !== "undefined" && !loggedOut && !noRefresh) {
        sessionStorage.setItem("auth_logged_out", "1");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
