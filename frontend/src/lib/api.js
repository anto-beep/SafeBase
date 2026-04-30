import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("st_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global handler for trial-expired write attempts. Backend returns 402 with
// {trial_expired: true, detail: "..."}. We surface a toast + redirect prompt
// so the user knows why the action was blocked.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 402 && err.response.data?.trial_expired) {
      // Lazy-import to avoid circular deps
      import("sonner").then(({ toast }) => {
        toast.error(
          err.response.data.detail || "Your free trial has ended — upgrade to continue.",
          { duration: 6000 },
        );
      }).catch(() => {});
    }
    return Promise.reject(err);
  },
);

export default api;
