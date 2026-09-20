import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/authStore';
import {
  createPendingOrder,
  getCustomerOrder,
  getCustomerOrderTracking,
  getCustomerOrders,
} from './ordersApi';

export function useCreatePendingOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPendingOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
  });
}

export function useCustomerOrders() {
  return useInfiniteQuery({
    queryKey: ['customer-orders'],
    queryFn: ({ pageParam = 1, signal }) => getCustomerOrders(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.current_page < page.last_page ? page.current_page + 1 : undefined,
  });
}

export function useCustomerOrder(id: number) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['customer-order', userId, id],
    queryFn: ({ signal }) => getCustomerOrder(id, signal),
    enabled: userId !== undefined && Number.isFinite(id) && id > 0,
  });
}

export function useCustomerOrderTracking() {
  return useQuery({
    queryKey: ['customer-order-tracking'],
    queryFn: ({ signal }) => getCustomerOrderTracking(signal),
    refetchInterval: 15_000,
  });
}
