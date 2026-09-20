import { z } from 'zod';
import { apiClient } from '@/src/api/client';
import type { AuthUser } from '@/src/types/auth';

export const customerProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'validation.name').max(255, 'validation.name'),
  email: z.string().trim().email('validation.email'),
});

export type CustomerProfile = AuthUser & {
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  birthdate?: string | null;
  gender?: 'male' | 'female' | null;
  status?: string | null;
  is_active?: boolean | number | null;
};

export type CustomerProfileUpdate = z.infer<typeof customerProfileUpdateSchema>;

export const customerProfileDetailsSchema = customerProfileUpdateSchema.extend({
  phone: z.string().max(20, 'validation.phone'),
  whatsapp: z.string().max(20, 'validation.phone'),
  address: z.string().max(500, 'validation.address'),
  birthdate: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
});

export type CustomerProfileDetailsUpdate = z.infer<typeof customerProfileDetailsSchema>;

export const passwordUpdateSchema = z
  .object({
    current_password: z.string().min(1, 'validation.password'),
    new_password: z.string().min(8, 'validation.password'),
    new_password_confirmation: z.string().min(8, 'validation.password'),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'validation.password_match',
    path: ['new_password_confirmation'],
  });

export type PasswordUpdate = z.infer<typeof passwordUpdateSchema>;

export interface ProfileCompletion {
  percentage: number;
  filled_fields: number;
  total_fields: number;
  missing_fields: string[];
}

export async function getCustomerProfile(): Promise<CustomerProfile> {
  return (await apiClient.get<CustomerProfile>('/customer/profile')).data;
}

export async function updateCustomerProfile(
  data: CustomerProfileUpdate,
): Promise<CustomerProfile> {
  return (await apiClient.put<CustomerProfile>('/customer/profile', data)).data;
}

export async function updateCustomerProfileDetails(
  data: CustomerProfileDetailsUpdate,
): Promise<CustomerProfile> {
  return (await apiClient.put<CustomerProfile>('/customer/profile', data)).data;
}

export async function updateCustomerPassword(data: PasswordUpdate): Promise<{ message: string }> {
  return (await apiClient.put<{ message: string }>('/customer/profile/password', data)).data;
}

export async function getProfileCompletion(): Promise<ProfileCompletion> {
  return (await apiClient.get<ProfileCompletion>('/customer/profile/completion')).data;
}