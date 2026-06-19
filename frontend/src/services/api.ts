import axios from 'axios';
import { CSRF_COOKIE, CSRF_HEADER, getCookie } from '../lib/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const api = axios.create({
  // In production (Vercel) frontend and backend share the same domain,
  // so '/api' routes correctly via vercel.json. In local dev the Vite
  // proxy forwards /api → localhost:3000. Either way the browser treats
  // requests as same-origin so the httpOnly auth cookie is sent.
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Required so the browser sends the httpOnly access_token cookie.
  withCredentials: true,
});

// Mirror the CSRF cookie into the X-CSRF-Token header for mutating
// requests. A cross-site attacker cannot read the cookie, so they cannot
// forge the header — that's what defends against CSRF.
api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const csrf = getCookie(CSRF_COOKIE);
    if (csrf && config.headers) {
      // Works for both AxiosHeaders (v1) and plain-object headers.
      if (typeof (config.headers as { set?: unknown }).set === 'function') {
        (config.headers as { set: (k: string, v: string) => void }).set(
          CSRF_HEADER,
          csrf,
        );
      } else {
        (config.headers as Record<string, string>)[CSRF_HEADER] = csrf;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Cookie session is gone — clear the cached user snapshot and
      // bounce to login, but avoid an endless redirect loop.
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
