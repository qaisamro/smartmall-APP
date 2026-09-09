import axios from 'axios';
import { environment } from '@/src/config/environment';
import { normalizeApiError } from '@/src/api/errors';
import { secureAuthStorage } from '@/src/services/secureStorage';

type UnauthorizedHandler = () => void | Promise<void>;
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await secureAuthStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (__DEV__ && config.url === '/register') {
    const baseUrl = (config.baseURL ?? '').replace(/\/+$/, '');
    const endpoint = (config.url ?? '').replace(/^\/+/, '');
    console.info('[SmartMall registration request]', {
      method: (config.method ?? 'get').toUpperCase(),
      baseUrl,
      endpoint: `/${endpoint}`,
      requestUrl: `${baseUrl}/${endpoint}`,
    });
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (__DEV__ && axios.isAxiosError(error) && error.config?.url === '/register') {
      console.warn('[SmartMall registration response]', {
        code: error.code,
        status: error.response?.status,
        hasResponse: error.response != null,
        hasRequest: error.request != null,
      });
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await unauthorizedHandler?.();
    }
    return Promise.reject(normalizeApiError(error));
  },
);