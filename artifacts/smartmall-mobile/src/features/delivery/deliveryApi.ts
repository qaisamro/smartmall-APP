import { apiClient } from '@/src/api/client';

export interface DeliveryZone {
  id: number;
  name: string;
  fee: string | number;
  is_active?: boolean;
}

export async function getActiveDeliveryZones(signal?: AbortSignal): Promise<DeliveryZone[]> {
  const response = await apiClient.get<DeliveryZone[]>('/delivery-zones/active', { signal });
  return response.data;
}