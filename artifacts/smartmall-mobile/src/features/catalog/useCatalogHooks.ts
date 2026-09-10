import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getProducts,
  getProduct,
  getOffers,
  getHomeWidgets,
  getPublicStats,
  getPublicProducts,
  getSections,
} from './catalogApi';

export function useProducts(
  mallId: number,
  params: { category_id?: number; search?: string; mall_section_id?: number } = {}
) {
  return useInfiniteQuery({
    queryKey: ['products', mallId, params],
    queryFn: ({ pageParam = 1, signal }) => getProducts(mallId, {
      ...params, 
      group_by_section: !!params.mall_section_id || undefined,
      page: pageParam 
    }, signal),
    getNextPageParam: (lastPage) => {
      if (lastPage.current_page < lastPage.last_page) {
        return lastPage.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!mallId,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => getProduct(id, signal),
    enabled: !!id,
  });
}

export function useOffers(mallId?: number) {
  return useQuery({
    queryKey: ['offers', mallId],
    queryFn: ({ signal }) => getOffers(mallId, signal),
  });
}

export function useHomeWidgets() {
  return useQuery({
    queryKey: ['home-widgets'],
    queryFn: ({ signal }) => getHomeWidgets(signal),
  });
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: ({ signal }) => getPublicStats(signal),
  });
}

export function useSections() {
  return useQuery({
    queryKey: ['sections'],
    queryFn: ({ signal }) => getSections(signal),
    staleTime: 300_000,
  });
}

export function usePublicProducts() {
  return useQuery({
    queryKey: ['public-products'],
    queryFn: ({ signal }) => getPublicProducts(signal),
    staleTime: 60_000,
  });
}
