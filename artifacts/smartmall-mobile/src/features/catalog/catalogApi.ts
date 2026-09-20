import { apiClient } from '@/src/api/client';
import type { Product, Offer, PaginatedResponse } from '@/src/types/api';

export async function getProducts(
  mallId: number,
  params: {
    category_id?: number;
    search?: string;
    mall_section_id?: number;
    page?: number;
    group_by_section?: boolean;
  },
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product>> {
  return (
    await apiClient.get<PaginatedResponse<Product>>(`/malls/${mallId}/products`, {
      params,
      signal,
    })
  ).data;
}

export async function getProduct(id: number, signal?: AbortSignal): Promise<Product> {
  return (await apiClient.get<Product>(`/products/${id}`, { signal })).data;
}

export async function getOffers(mallId?: number, signal?: AbortSignal): Promise<Offer[]> {
  return (await apiClient.get<Offer[]>('/offers', { params: { mall_id: mallId }, signal })).data;
}

export async function getHomeWidgets(signal?: AbortSignal): Promise<{ sections: any[], data: any }> {
  return (await apiClient.get<{ sections: any[], data: any }>('/home-widgets', { signal })).data;
}

export async function getPublicStats(
  signal?: AbortSignal,
): Promise<{ malls: number, products: number, users: number, orders: number }> {
  return (
    await apiClient.get<{ malls: number, products: number, users: number, orders: number }>(
      '/public-stats',
      { signal },
    )
  ).data;
}

export interface PublicSection {
  id: number;
  name_ar: string;
  name_en: string;
  icon?: string | null;
  bg_image?: string | null;
}

export async function getSections(signal?: AbortSignal): Promise<PublicSection[]> {
  return (await apiClient.get<PublicSection[]>('/sections', { signal })).data;
}

export async function getPublicProducts(
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product>> {
  return (await apiClient.get<PaginatedResponse<Product>>('/products', { signal })).data;
}
