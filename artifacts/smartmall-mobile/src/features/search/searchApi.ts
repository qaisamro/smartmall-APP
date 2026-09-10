import { apiClient } from '@/src/api/client';
import type { Product } from '@/src/types/api';

export interface GlobalSearchResult {
  mall_id: number;
  mall_slug: string;
  mall_name: string;
  products: Product[];
}

export interface GlobalSearchResponse {
  total: number;
  query: string;
  grouped: GlobalSearchResult[];
}

export async function searchGlobal(query: string, signal?: AbortSignal): Promise<GlobalSearchResponse> {
  return (await apiClient.get<GlobalSearchResponse>('/search/global', { params: { query }, signal })).data;
}
