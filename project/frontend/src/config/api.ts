import axios from 'axios';

export const RENDER_BACKEND_URL = 'https://lungcare-ai-backend-vkov.onrender.com';
export const LOCAL_BACKEND_URL = 'http://localhost:8000';

/**
 * Resolves and normalizes the backend API base URL.
 * Automatically adapts between Local Development and Production Vercel environments:
 *
 * 1. If running in a browser on a deployed host (e.g. *.vercel.app or custom domain):
 *    - Always uses the live Render backend (https://lungcare-ai-backend-vkov.onrender.com)
 *      to strictly prevent net::ERR_CONNECTION_REFUSED to localhost.
 * 2. If running in a browser on localhost / 127.0.0.1:
 *    - Uses VITE_API_BASE_URL (defaults to http://localhost:8000).
 * 3. Fallback for SSR / Build time:
 *    - Uses VITE_API_BASE_URL or mode-based fallback.
 */
export const getApiBaseUrl = (): string => {
  const rawEnv = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    ''
  ).trim();

  const isBrowser = typeof window !== 'undefined';
  const isLocalhostHost =
    isBrowser &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname.endsWith('.local'));

  // 1. Deployed / Remote environment (e.g. Vercel deployment)
  if (isBrowser && !isLocalhostHost) {
    // If env is missing or accidentally set to localhost, force production Render backend
    if (!rawEnv || rawEnv.includes('localhost') || rawEnv.includes('127.0.0.1')) {
      return RENDER_BACKEND_URL;
    }
    return rawEnv.replace(/\/+$/, '');
  }

  // 2. Local development environment (http://localhost:5173)
  if (isBrowser && isLocalhostHost) {
    return (rawEnv || LOCAL_BACKEND_URL).replace(/\/+$/, '');
  }

  // 3. Build-time or SSR evaluation
  if (rawEnv) {
    return rawEnv.replace(/\/+$/, '');
  }
  return import.meta.env.PROD ? RENDER_BACKEND_URL : LOCAL_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Standard backend API endpoints
 */
export const API_ENDPOINTS = {
  HEALTH: '/health',
  ANALYZE_XRAY: '/analyze-xray',
  SEND_MESSAGE: '/send-message',
} as const;

/**
 * Builds a clean, fully-qualified URL for a given endpoint.
 * Prevents accidental double slashes or missing slashes.
 */
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${getApiBaseUrl()}${cleanEndpoint}`;
};

/**
 * Formats API errors with clear, actionable diagnostics,
 * especially when the backend is unreachable or not running.
 */
export const getApiErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';

  // Network / Connection failure (e.g. backend server not running or network dropped)
  if (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error' ||
    (!error.response && error.request)
  ) {
    const currentBaseUrl = getApiBaseUrl();
    const isLocal = currentBaseUrl.includes('localhost') || currentBaseUrl.includes('127.0.0.1');

    if (isLocal) {
      return `Cannot connect to the local LungCare AI backend server at ${currentBaseUrl}. Please ensure your local backend is running (e.g., uvicorn main:app --reload on port 8000).`;
    }
    return `Cannot reach the LungCare AI backend server at ${currentBaseUrl}. Please check your network connection or verify that the backend service is active on Render.`;
  }

  // HTTP response error from backend (e.g. 400, 401, 422, 500)
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(detail);
  }

  return error.response?.data?.message || error.message || 'An unexpected error occurred.';
};

/**
 * Centralized Axios instance pre-configured with the active base URL and timeout.
 */
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000, // 2 minutes (accommodates deep learning model inference & cold starts)
});

// Request interceptor to ensure dynamic base URL is always evaluated at call time
apiClient.interceptors.request.use((config) => {
  const activeBaseUrl = getApiBaseUrl();
  config.baseURL = activeBaseUrl;
  console.log(`[LungCare API] ${config.method?.toUpperCase() || 'REQUEST'} -> ${activeBaseUrl}${config.url || ''}`);
  return config;
});

// Response interceptor to attach user-friendly explanation to network errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.friendlyMessage = getApiErrorMessage(error);
    return Promise.reject(error);
  }
);

export default apiClient;
