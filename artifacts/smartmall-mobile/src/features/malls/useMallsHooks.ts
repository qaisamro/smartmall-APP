import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getMalls, getMallBySlug, getMallSections } from './mallsApi';

interface MallQueryParams {
  search?: string;
  type?: string;
}

interface MallQueryOptions {
  enabled?: boolean;
}

export function useMalls(params?: MallQueryParams, options?: MallQueryOptions) {
  const normalizedSearch = params?.search?.trim() ?? '';
  const normalizedType = params?.type?.trim() ?? '';

  return useQuery({
    queryKey: ['malls', { search: normalizedSearch, type: normalizedType }],
    queryFn: ({ signal }) =>
      getMalls({
        ...(normalizedSearch ? { search: normalizedSearch } : {}),
        ...(normalizedType ? { type: normalizedType } : {}),
      }, signal),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useMallBySlug(slug: string) {
  return useQuery({
    queryKey: ['mall', slug],
    queryFn: ({ signal }) => getMallBySlug(slug, signal),
    enabled: !!slug,
  });
}

export function useMallSections(mallId: number) {
  return useQuery({
    queryKey: ['mall', mallId, 'sections'],
    queryFn: ({ signal }) => getMallSections(mallId, signal),
    enabled: !!mallId,
  });
}
