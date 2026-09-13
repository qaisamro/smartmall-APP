import { apiClient } from '@/src/api/client';

export interface Complaint {
  id: number;
  user_id: number;
  title: string;
  description: string;
  status: string;
  order_id?: string | number | null;
  mall_id?: number | null;
  messages_count?: number;
  created_at: string;
  updated_at: string;
  mall?: { id: number; name_ar: string; name_en?: string | null } | null;
}

export interface ComplaintMessage {
  id: number;
  user_id: number;
  message: string;
  created_at: string;
  user?: { id: number; name: string } | null;
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  mall_id?: number | null;
  order_id?: string | null;
}

export async function getCustomerComplaints(signal?: AbortSignal): Promise<Complaint[]> {
  const response = await apiClient.get<Complaint[] | { data?: Complaint[] }>('/customer/complaints', { signal });
  return Array.isArray(response.data) ? response.data : response.data.data ?? [];
}

export async function createCustomerComplaint(input: CreateComplaintInput): Promise<Complaint> {
  return (await apiClient.post<Complaint>('/customer/complaints', input)).data;
}

export async function getComplaintMessages(
  complaintId: number,
  signal?: AbortSignal,
): Promise<ComplaintMessage[]> {
  return (
    await apiClient.get<ComplaintMessage[]>(`/customer/complaints/${complaintId}/messages`, { signal })
  ).data;
}

export async function sendComplaintMessage(
  complaintId: number,
  message: string,
): Promise<ComplaintMessage> {
  return (
    await apiClient.post<ComplaintMessage>(`/customer/complaints/${complaintId}/messages`, { message })
  ).data;
}