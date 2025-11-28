import { init, register, waitLocale, locale } from 'svelte-i18n';
import { DEFAULT_LOCALE, type SupportedLocale } from './locales';
import { getInitialLocale } from './locale-detector';

/**
 * Register all available locales with lazy loading
 */
function registerLocales() {
  register('en', () => import('./translations/en/common.json'));
  // Add more locales here as needed:
  // register('es', () => import('./translations/es/common.json'));
  // register('fr', () => import('./translations/fr/common.json'));
}

/**
 * Initialize the i18n system
 */
export async function setupI18n(userLocale?: string | null): Promise<void> {
  registerLocales();

  const initialLocale = getInitialLocale(userLocale);

  await init({
    fallbackLocale: DEFAULT_LOCALE,
    initialLocale,
  });

  // Wait for the locale to be loaded
  await waitLocale(initialLocale);
}

/**
 * Change the current locale
 */
export async function changeLocale(newLocale: SupportedLocale): Promise<void> {
  locale.set(newLocale);
  await waitLocale(newLocale);
}

// Re-export everything from svelte-i18n for convenience
export { _, t, locale, locales, json, number, date, time } from 'svelte-i18n';
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from './locales';
export { getInitialLocale, detectBrowserLocale } from './locale-detector';
