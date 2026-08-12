import axios from "axios";

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
    const token = localStorage.getItem("access_token");
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const access = localStorage.getItem("access_token");
      const loggedOut = sessionStorage.getItem("auth_logged_out") === "1";
      const isAuthEndpoint = originalRequest.url?.includes("/auth/") ?? false;

      if (access && !loggedOut && !isAuthEndpoint) {
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
      } else if (typeof window !== "undefined" && !loggedOut) {
        sessionStorage.setItem("auth_logged_out", "1");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
