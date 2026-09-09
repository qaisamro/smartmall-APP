import { create } from 'zustand';
import { setUnauthorizedHandler } from '@/src/api/client';
import { ApiError } from '@/src/api/errors';
import * as authApi from '@/src/features/auth/authApi';
import { secureAuthStorage } from '@/src/services/secureStorage';
import { notificationService } from '@/src/services/notifications';
import type { AuthUser, LoginCredentials, RegisterCredentials } from '@/src/types/auth';

type AuthStatus =
  | 'idle'
  | 'restoring'
  | 'authenticated'
  | 'anonymous'
  | 'unavailable';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  loginWithAccessToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  isAuthenticated: false,
  isLoading: true,
  initialize: async () => {
    set({ status: 'restoring', isLoading: true });
    const token = await secureAuthStorage.getAccessToken();
    if (!token) {
      set({ user: null, status: 'anonymous', isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const user = await authApi.fetchCurrentUser();
      set({ user, status: 'authenticated', isAuthenticated: true, isLoading: false });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await get().clearSession();
        return;
      }
      // Preserve token on transient network failures
      set({ user: null, status: 'unavailable', isAuthenticated: false, isLoading: false });
    }
  },
  login: async (credentials) => {
    const response = await authApi.login(credentials);
    await secureAuthStorage.setAccessToken(response.access_token);
    set({ user: response.user, status: 'authenticated', isAuthenticated: true });
  },
  register: async (data) => {
    const response = await authApi.register(data);
    await secureAuthStorage.setAccessToken(response.access_token);
    set({ user: response.user, status: 'authenticated', isAuthenticated: true });
  },
  loginWithAccessToken: async (accessToken) => {
    await secureAuthStorage.setAccessToken(accessToken);
    try {
      const user = await authApi.fetchCurrentUser();
      set({ user, status: 'authenticated', isAuthenticated: true, isLoading: false });
    } catch (error) {
      await secureAuthStorage.clearAccessToken();
      set({ user: null, status: 'anonymous', isAuthenticated: false, isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    try {
      await notificationService.unregisterAndroidToken();
      await authApi.logout();
    } finally {
      await get().clearSession();
    }
  },
  refreshUser: async () => {
    try {
      const user = await authApi.fetchCurrentUser();
      set({ user, status: 'authenticated', isAuthenticated: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await get().clearSession();
      }
    }
  },
  clearSession: async () => {
    await secureAuthStorage.clearAccessToken();
    set({ user: null, status: 'anonymous', isAuthenticated: false, isLoading: false });
  },
}));

setUnauthorizedHandler(() => useAuthStore.getState().clearSession());