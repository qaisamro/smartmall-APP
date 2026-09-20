import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/src/api/errors';

export function handleFormApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  t: (key: string) => string
): string {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      if (error.details) {
        Object.keys(error.details).forEach((field) => {
          setError(field as Path<T>, {
            type: 'server',
            message: t('error.field_invalid'),
          });
        });
      }
      return t('error.validation');
    }
    if (error.status === 401) return t('error.credentials');
    if (error.status === 403) return t('error.forbidden');
    if (error.status === 404) return t('error.not_found');
    if (error.status === 429) return t('error.rate_limited');
    if (error.status && error.status >= 500) return t('error.server');
  }
  return t('error.network');
}
