import { apiClient } from '@/src/api/client';
import type { Mall, MallSection } from '@/src/types/api';

export async function getMalls(
  params?: { search?: string, type?: string },
  signal?: AbortSignal,
): Promise<Mall[]> {
  return (await apiClient.get<Mall[]>('/malls', { params, signal })).data;
}

export async function getMallBySlug(slug: string, signal?: AbortSignal): Promise<Mall> {
  return (await apiClient.get<Mall>(`/malls/slug/${slug}`, { signal })).data;
}

export async function getMallSections(
  mallId: number,
  signal?: AbortSignal,
): Promise<{ sections: MallSection[], no_section_count: number }> {
  return (
    await apiClient.get<{ sections: MallSection[], no_section_count: number }>(
      `/malls/${mallId}/sections`,
      { signal },
    )
  ).data;
}
