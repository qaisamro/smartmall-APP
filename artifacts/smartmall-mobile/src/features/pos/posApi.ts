import { apiClient } from '@/src/api/client';
import type { PaginatedResponse, Product } from '@/src/types/api';

export interface PosProduct extends Product {
  stock_quantity?: number | null;
}

export interface PosSessionItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_scan: string | number;
  product?: PosProduct | null;
}

export interface PosSession {
  id: number;
  token: string;
  mall_id: number;
  user_id: number;
  status: 'active' | 'completed' | 'cancelled' | string;
  items: PosSessionItem[];
}

export interface PosFinalizeResponse {
  message: string;
  order: {
    id: number;
    total_amount: string | number;
  };
  session: PosSession;
}

export async function getOwnerProducts(
  search: string,
  signal?: AbortSignal,
): Promise<PaginatedResponse<PosProduct>> {
  return (
    await apiClient.get<PaginatedResponse<PosProduct>>('/owner/products', {
      params: { search: search.trim() || undefined, per_page: 30 },
      signal,
    })
  ).data;
}

export async function getCashierProducts(
  search: string,
  signal?: AbortSignal,
): Promise<PaginatedResponse<PosProduct>> {
  return (
    await apiClient.get<PaginatedResponse<PosProduct>>('/cashier/pos/products', {
      params: { search: search.trim() || undefined, per_page: 30 },
      signal,
    })
  ).data;
}

export async function createOwnerPosSession(): Promise<PosSession> {
  return (await apiClient.post<PosSession>('/owner/pos/sessions')).data;
}

export async function createCashierPosSession(): Promise<PosSession> {
  return (await apiClient.post<PosSession>('/cashier/pos/sessions')).data;
}

export async function getOwnerPosSession(token: string): Promise<PosSession> {
  return (await apiClient.get<PosSession>(`/owner/pos/sessions/${token}`)).data;
}

export async function getCashierPosSession(token: string): Promise<PosSession> {
  return (await apiClient.get<PosSession>(`/cashier/pos/sessions/${token}`)).data;
}

export async function addPosItem(
  token: string,
  productId: number,
  quantity = 1,
): Promise<PosSessionItem> {
  return (
    await apiClient.post<PosSessionItem>(`/pos/sync/${token}`, {
      product_id: productId,
      quantity,
    })
  ).data;
}

export async function addCashierPosItem(
  token: string,
  productId: number,
  quantity = 1,
): Promise<PosSessionItem> {
  return (
    await apiClient.post<PosSessionItem>(`/cashier/pos/sessions/${token}/items`, {
      product_id: productId,
      quantity,
    })
  ).data;
}

export async function updatePosItem(itemId: number, quantity: number): Promise<PosSessionItem> {
  return (await apiClient.patch<PosSessionItem>(`/owner/pos/items/${itemId}`, { quantity })).data;
}

export async function updateCashierPosItem(itemId: number, quantity: number): Promise<PosSessionItem> {
  return (await apiClient.patch<PosSessionItem>(`/cashier/pos/items/${itemId}`, { quantity })).data;
}

export async function removePosItem(itemId: number): Promise<void> {
  await apiClient.delete(`/owner/pos/items/${itemId}`);
}

export async function removeCashierPosItem(itemId: number): Promise<void> {
  await apiClient.delete(`/cashier/pos/items/${itemId}`);
}

export async function finalizePos(token: string): Promise<PosFinalizeResponse> {
  return (await apiClient.post<PosFinalizeResponse>(`/owner/pos/finalize/${token}`)).data;
}

export async function finalizeCashierPos(token: string): Promise<PosFinalizeResponse> {
  return (await apiClient.post<PosFinalizeResponse>(`/cashier/pos/finalize/${token}`)).data;
}

export async function closePosSession(token: string): Promise<{ message: string; session: PosSession }> {
  return (await apiClient.post<{ message: string; session: PosSession }>(`/owner/pos/close/${token}`)).data;
}

export async function closeCashierPosSession(token: string): Promise<{ message: string; session: PosSession }> {
  return (await apiClient.post<{ message: string; session: PosSession }>(`/cashier/pos/close/${token}`)).data;
}
