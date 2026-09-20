import { z } from 'zod';
import { apiClient } from '@/src/api/client';
import type { AuthResponse, AuthUser, LoginCredentials } from '@/src/types/auth';

export const loginSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9]{7,20}$/, 'validation.phone'),
  password: z.string().min(8, 'validation.password'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'validation.name'),
  phone: z.string().trim().regex(/^\+?[0-9]{7,20}$/, 'validation.phone'),
  password: z.string().min(8, 'validation.password'),
  password_confirmation: z.string().min(8, 'validation.password'),
}).refine(data => data.password === data.password_confirmation, {
  message: 'validation.password_match',
  path: ["password_confirmation"],
});

export const forgotPasswordSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9]{7,20}$/, 'validation.phone'),
});

export const resetPasswordSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9]{7,20}$/, 'validation.phone'),
  token: z.string().min(1, 'validation.token'),
  password: z.string().min(8, 'validation.password'),
  password_confirmation: z.string().min(8, 'validation.password'),
}).refine(data => data.password === data.password_confirmation, {
  message: 'validation.password_match',
  path: ["password_confirmation"],
});

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return (await apiClient.post<AuthResponse>('/login', credentials)).data;
}

export async function register(data: z.infer<typeof registerSchema>): Promise<AuthResponse> {
  return (await apiClient.post<AuthResponse>('/register', { ...data, role: 'customer' })).data;
}

export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  return (await apiClient.get<{ url: string }>('/auth/google/redirect')).data;
}

export async function forgotPassword(data: z.infer<typeof forgotPasswordSchema>): Promise<{message: string}> {
  return (await apiClient.post<{message: string}>('/forgot-password', data)).data;
}

export async function resetPassword(data: z.infer<typeof resetPasswordSchema>): Promise<{message: string}> {
  return (await apiClient.post<{message: string}>('/reset-password', data)).data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout');
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return (await apiClient.get<AuthUser>('/me')).data;
}
