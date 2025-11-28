/**
 * Supported locales configuration
 */
export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  // Add more locales here as needed:
  // { code: 'es', name: 'Español', flag: '🇪🇸' },
  // { code: 'fr', name: 'Français', flag: '🇫🇷' },
] as const;

export const DEFAULT_LOCALE = 'en';

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['code'];

/**
 * Check if a locale code is supported
 */
export function isLocaleSupported(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.some((l) => l.code === locale);
}

/**
 * Get locale info by code
 */
export function getLocaleInfo(code: SupportedLocale) {
  return SUPPORTED_LOCALES.find((l) => l.code === code);
}
