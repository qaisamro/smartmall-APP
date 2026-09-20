import { environment } from '@/src/config/environment';

const apiOrigin = new URL(environment.apiBaseUrl).origin;

export function normalizeImageUrl(value?: string | null): string | null {
  const source = value?.trim();
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;
  const path = source.startsWith('/') ? source : `/storage/${source}`;
  return `${apiOrigin}${path}`;
}

export function getProductImageUrl(product: {
  image?: string | null;
  link_photo?: string | null;
}): string | null {
  return normalizeImageUrl(product.image || product.link_photo);
}