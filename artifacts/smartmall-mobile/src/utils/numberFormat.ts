import i18n from '@/src/i18n';

type DisplayValue = string | number | null | undefined;
type DateValue = Date | string | number;

const arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩';
const easternArabicIndicDigits = '۰۱۲۳۴۵۶۷۸۹';

export function toWesternDigits(value: DisplayValue): string {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String(arabicIndicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabicIndicDigits.indexOf(digit)));
}

export function getDisplayLocale(language = i18n.language): string {
  return language.startsWith('ar') ? 'ar-IL-u-nu-latn' : 'en-IL-u-nu-latn';
}

export function formatNumber(
  value: DisplayValue,
  options: Intl.NumberFormatOptions = {},
  language = i18n.language,
): string {
  if (value === null || value === undefined || value === '') return '';

  const normalized = toWesternDigits(value);
  const number = Number(normalized);
  if (Number.isNaN(number)) return normalized;

  return new Intl.NumberFormat(getDisplayLocale(language), {
    numberingSystem: 'latn',
    ...options,
  }).format(number);
}

export function formatDate(
  value: DateValue,
  language = i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return toWesternDigits(String(value));

  return new Intl.DateTimeFormat(getDisplayLocale(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    numberingSystem: 'latn',
  }).format(date);
}

export function formatDateTime(
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {},
  language = i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return toWesternDigits(String(value));

  return new Intl.DateTimeFormat(getDisplayLocale(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    numberingSystem: 'latn',
    ...options,
  }).format(date);
}

export function formatPhone(value: DisplayValue): string {
  return toWesternDigits(value);
}