import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from './locales';

/**
 * Detect the user's preferred locale from browser settings
 */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  // Get browser languages in order of preference
  const browserLanguages = navigator.languages || [navigator.language];

  for (const lang of browserLanguages) {
    // Try exact match first (e.g., 'en-US')
    const exactMatch = SUPPORTED_LOCALES.find(
      (l) => l.code.toLowerCase() === lang.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.code;
    }

    // Try base language match (e.g., 'en' from 'en-US')
    const baseLang = lang.split('-')[0].toLowerCase();
    const baseMatch = SUPPORTED_LOCALES.find(
      (l) => l.code.toLowerCase() === baseLang
    );
    if (baseMatch) {
      return baseMatch.code;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Get the initial locale based on user preference or browser detection
 */
export function getInitialLocale(userPreference?: string | null): SupportedLocale {
  // If user has a stored preference that's still supported, use it
  if (userPreference && SUPPORTED_LOCALES.some((l) => l.code === userPreference)) {
    return userPreference as SupportedLocale;
  }

  // Otherwise, detect from browser
  return detectBrowserLocale();
}
