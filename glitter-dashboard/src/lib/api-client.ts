/**
 * Axios API client for all backend requests.
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { authCookie } from './auth-cookie';
import { tokenStorage } from './token-storage';
import type { RefreshResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
);

interface RetryableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
};

function forceLogout() {
  tokenStorage.clearTokens();
  authCookie.clear();
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequest | undefined;
      const status = error.response?.status;

      if (
          status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          tokenStorage.getRefreshToken() &&
          !originalRequest.url?.includes('/auth/refresh')
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(apiClient(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = tokenStorage.getRefreshToken();
          const { data } = await axios.post<RefreshResponse>(
              `${API_URL}/api/auth/refresh`,
              { refreshToken },
          );

          tokenStorage.setTokens(
              data.tokens.accessToken,
              data.tokens.refreshToken,
          );

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
          }

          processQueue(null, data.tokens.accessToken);
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          forceLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // No refresh possible (no refresh token, or already retried) → kick out
      if (status === 401 && !originalRequest?.url?.includes('/auth/')) {
        forceLogout();
      }

      return Promise.reject(error);
    },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
        | { message?: string | string[] }
        | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) return data.message.join(', ');
      return data.message;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}