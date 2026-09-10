import { useQuery } from '@tanstack/react-query';
import { searchGlobal } from './searchApi';

export function useGlobalSearch(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ['global-search', normalizedQuery],
    queryFn: ({ signal }) => searchGlobal(normalizedQuery, signal),
    enabled: normalizedQuery.length >= 2,
    staleTime: 30000,
  });
}
