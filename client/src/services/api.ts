import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const AUTH_TOKEN_EVENT = 'smart-parking:auth-token';

export const getStoredAccessToken = (): string | null => localStorage.getItem('accessToken');

export const setStoredAccessToken = (token: string | null): void => {
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
  window.dispatchEvent(new CustomEvent<string | null>(AUTH_TOKEN_EVENT, { detail: token }));
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Backwards-compatible name used by the existing simulator page.
export const api = apiClient;

apiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequestConfig | undefined;
    const requestUrl = request?.url ?? '';
    const isAuthRequest = requestUrl.startsWith('/auth/login') ||
      requestUrl.startsWith('/auth/register') ||
      requestUrl.startsWith('/auth/refresh');

    if (error.response?.status !== 401 || !request || request._authRetry || isAuthRequest) {
      return Promise.reject(error);
    }

    request._authRetry = true;
    try {
      refreshPromise ??= refreshClient
        .post<{ accessToken: string }>('/auth/refresh')
        .then((response) => response.data.accessToken)
        .finally(() => { refreshPromise = null; });
      const token = await refreshPromise;
      setStoredAccessToken(token);
      request.headers.Authorization = `Bearer ${token}`;
      return apiClient(request);
    } catch (refreshError) {
      setStoredAccessToken(null);
      return Promise.reject(refreshError);
    }
  }
);
