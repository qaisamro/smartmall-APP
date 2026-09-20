import { getDisplayLocale, toWesternDigits } from '@/src/utils/numberFormat';

export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? Number(toWesternDigits(value)) : value;
  if (isNaN(num)) return '';
  return toWesternDigits(new Intl.NumberFormat(getDisplayLocale(), {
    style: 'currency',
    currency: 'ILS',
    numberingSystem: 'latn',
  }).format(num));
}
