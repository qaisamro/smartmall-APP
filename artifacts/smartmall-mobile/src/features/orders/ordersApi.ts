import { apiClient } from '@/src/api/client';
import { ApiError } from '@/src/api/errors';
import type { Order, PaginatedResponse } from '@/src/types/api';

export interface PendingOrderItem {
  id: number;
  mall_id: number;
  price: number;
  quantity: number;
}

export interface CreatePendingOrderInput {
  mall_id: number;
  items: PendingOrderItem[];
  total: number;
  notes?: string;
  phone?: string;
}

export interface PendingOrderResponse {
  message: string;
  order_id: string;
  pending_id: number;
}

export type PendingConfirmationInput =
  | {
      delivery_method: 'direct_purchase' | 'in-mall';
    }
  | {
      delivery_method: 'pickup' | 'delivery';
      delivery_address?: string;
      delivery_phone?: string;
      general_notes?: string;
      delivery_zone_id?: number;
      delivery_fee?: number;
    };

export interface PendingConfirmationResponse {
  message: string;
  order: Order;
}

export async function createPendingOrder(
  input: CreatePendingOrderInput,
): Promise<PendingOrderResponse> {
  return (await apiClient.post<PendingOrderResponse>('/orders/pending', input)).data;
}

export async function confirmPendingOrder(
  pendingId: number,
  input: PendingConfirmationInput,
): Promise<PendingConfirmationResponse> {
  return (
    await apiClient.post<PendingConfirmationResponse>(
      `/orders/pending/${pendingId}/confirm`,
      input,
    )
  ).data;
}

export async function getCustomerOrders(
  page = 1,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Order>> {
  return (
    await apiClient.get<PaginatedResponse<Order>>('/customer/purchases', {
      params: { page },
      signal,
    })
  ).data;
}

export async function getCustomerOrder(id: number, signal?: AbortSignal): Promise<Order> {
  return (await apiClient.get<Order>(`/customer/orders/${id}`, { signal })).data;
}

export async function getCustomerOrderTracking(
  signal?: AbortSignal,
): Promise<PaginatedResponse<Order>> {
  return (await apiClient.get<PaginatedResponse<Order>>('/customer/orders/tracking', { signal })).data;
}

export function isCustomerOrderUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}
