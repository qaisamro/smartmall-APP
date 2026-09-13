import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomerComplaint,
  getComplaintMessages,
  getCustomerComplaints,
  sendComplaintMessage,
  type CreateComplaintInput,
} from './complaintsApi';

export const complaintsQueryKey = ['customer-complaints'] as const;

export function useCustomerComplaints() {
  return useQuery({
    queryKey: complaintsQueryKey,
    queryFn: ({ signal }) => getCustomerComplaints(signal),
    refetchInterval: 15_000,
  });
}

export function useComplaintMessages(complaintId: number | null) {
  return useQuery({
    queryKey: ['customer-complaint-messages', complaintId],
    queryFn: ({ signal }) => getComplaintMessages(complaintId as number, signal),
    enabled: Number.isInteger(complaintId) && (complaintId as number) > 0,
    refetchInterval: 5_000,
  });
}

export function useCreateCustomerComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplaintInput) => createCustomerComplaint(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
    },
  });
}

export function useSendComplaintMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, message }: { complaintId: number; message: string }) =>
      sendComplaintMessage(complaintId, message),
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['customer-complaint-messages', variables.complaintId],
      });
      void queryClient.invalidateQueries({ queryKey: complaintsQueryKey });
    },
  });
}