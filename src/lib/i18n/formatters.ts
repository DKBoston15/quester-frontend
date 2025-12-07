import { format, formatDistance, formatRelative } from 'date-fns';
import { enUS, es, fr, de, zhCN } from 'date-fns/locale';
import type { SupportedLocale } from './locales';

// Map of supported locales to date-fns locale objects
const dateFnsLocales: Record<SupportedLocale, typeof enUS> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  zh: zhCN,
};

/**
 * Get the date-fns locale for a given locale code
 */
export function getDateFnsLocale(locale: SupportedLocale) {
  return dateFnsLocales[locale] || enUS;
}

/**
 * Format a date according to the current locale
 */
export function formatDate(
  date: Date | number | string,
  formatStr: string,
  locale: SupportedLocale = 'en'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: getDateFnsLocale(locale) });
}

/**
 * Format a date relative to now (e.g., "2 days ago")
 */
export function formatDateRelative(
  date: Date | number | string,
  baseDate: Date = new Date(),
  locale: SupportedLocale = 'en'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatRelative(dateObj, baseDate, { locale: getDateFnsLocale(locale) });
}

/**
 * Format a date as a distance from now (e.g., "about 2 hours ago")
 */
export function formatDateDistance(
  date: Date | number | string,
  baseDate: Date = new Date(),
  locale: SupportedLocale = 'en',
  options?: { addSuffix?: boolean; includeSeconds?: boolean }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, baseDate, {
    locale: getDateFnsLocale(locale),
    addSuffix: options?.addSuffix ?? true,
    includeSeconds: options?.includeSeconds ?? false,
  });
}

/**
 * Format a number according to the current locale
 */
export function formatNumber(
  value: number,
  locale: SupportedLocale = 'en',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency according to the current locale
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: SupportedLocale = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}
