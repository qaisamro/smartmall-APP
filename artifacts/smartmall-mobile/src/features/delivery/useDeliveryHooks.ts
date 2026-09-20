import { useQuery } from '@tanstack/react-query';
import { getActiveDeliveryZones } from './deliveryApi';

export const activeDeliveryZonesQueryKey = ['active-delivery-zones'] as const;

export function useActiveDeliveryZones() {
  return useQuery({
    queryKey: activeDeliveryZonesQueryKey,
    queryFn: ({ signal }) => getActiveDeliveryZones(signal),
    staleTime: 60_000,
  });
}