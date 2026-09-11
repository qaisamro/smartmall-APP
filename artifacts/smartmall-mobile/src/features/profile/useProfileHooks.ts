import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerProfile,
  updateCustomerProfile,
  updateCustomerProfileDetails,
  updateCustomerPassword,
  getProfileCompletion,
  type CustomerProfileDetailsUpdate,
  type PasswordUpdate,
  type CustomerProfileUpdate,
} from '@/src/features/profile/profileApi';
import { useAuthStore } from '@/src/store/authStore';

export const customerProfileQueryKey = ['customer-profile'] as const;

export function useCustomerProfile() {
  return useQuery({
    queryKey: customerProfileQueryKey,
    queryFn: getCustomerProfile,
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: (data: CustomerProfileUpdate) => updateCustomerProfile(data),
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(customerProfileQueryKey, updatedProfile);
      await refreshUser();
    },
  });
}

export function useUpdateCustomerProfileDetails() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: (data: CustomerProfileDetailsUpdate) => updateCustomerProfileDetails(data),
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(customerProfileQueryKey, updatedProfile);
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['profile-completion'] });
    },
  });
}

export function useUpdateCustomerPassword() {
  return useMutation({
    mutationFn: (data: PasswordUpdate) => updateCustomerPassword(data),
  });
}

export function useProfileCompletion() {
  return useQuery({
    queryKey: ['profile-completion'],
    queryFn: getProfileCompletion,
    staleTime: 60_000,
  });
}