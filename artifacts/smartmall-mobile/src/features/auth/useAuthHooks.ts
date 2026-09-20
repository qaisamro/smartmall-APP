import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  forgotPassword,
  resetPassword,
  loginSchema,
  registerSchema,
} from './authApi';
import { useAuthStore } from '@/src/store/authStore';
import { router } from 'expo-router';
import type { z } from 'zod';
import { signInWithGoogle } from '@/src/services/googleAuth';

export function useLogin() {
  const authStoreLogin = useAuthStore(state => state.login);
  return useMutation({
    mutationFn: (credentials: z.infer<typeof loginSchema>) => authStoreLogin(credentials),
  });
}

export function useRegister() {
  const authStoreRegister = useAuthStore(state => state.register);
  return useMutation({
    mutationFn: (data: z.infer<typeof registerSchema>) => authStoreRegister(data),
  });
}

export function useGoogleLogin() {
  const loginWithAccessToken = useAuthStore(state => state.loginWithAccessToken);
  return useMutation({
    mutationFn: async () => {
      const accessToken = await signInWithGoogle();
      await loginWithAccessToken(accessToken);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: resetPassword,
  });
}

export function useLogout() {
  const authStoreLogout = useAuthStore(state => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authStoreLogout,
    onSettled: () => {
      queryClient.clear();
    },
    onSuccess: () => {
      router.replace('/(auth)/login');
    }
  });
}
