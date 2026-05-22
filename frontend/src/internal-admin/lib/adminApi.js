/**
 * Internal Admin — separate API client + token storage.
 *
 * Token stored in localStorage under `sb_admin_token` (NOT the customer
 * `st_token`). All requests go through this axios instance so admin auth
 * cannot leak into customer endpoints and vice versa.
 */
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export const ADMIN_TOKEN_KEY = "sb_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

const adminApi = axios.create({
  baseURL: `${BACKEND}/api`,
  timeout: 30000,
});

adminApi.interceptors.request.use((cfg) => {
  const t = getAdminToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // Don't auto-redirect — let the calling component decide
    }
    return Promise.reject(err);
  }
);

export default adminApi;
