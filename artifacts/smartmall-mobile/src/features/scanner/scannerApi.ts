import { apiClient } from '@/src/api/client';
import type { Product } from '@/src/types/api';

export type ScanType = 'mall' | 'order' | 'product';

export interface ScanResponse {
  type: ScanType;
  mall_id?: number;
  slug?: string;
  name_ar?: string;
  redirect_url?: string;
  product?: Product;
}

export async function scanCode(code: string, mallId?: number): Promise<ScanResponse> {
  const payload = mallId === undefined ? { code } : { code, mall_id: mallId };
  return (await apiClient.post<ScanResponse>('/scan', payload)).data;
}