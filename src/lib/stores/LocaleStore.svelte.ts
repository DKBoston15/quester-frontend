import { locale, _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import { DEFAULT_LOCALE, type SupportedLocale, isLocaleSupported } from '$lib/i18n/locales';
import { changeLocale } from '$lib/i18n';
import { api } from '$lib/services/api-client';

/**
 * Current locale state
 */
let currentLocale = $state<SupportedLocale>(DEFAULT_LOCALE);
let isInitialized = $state(false);

/**
 * Locale store for managing application locale
 */
export const localeStore = {
  /**
   * Get the current locale
   */
  get locale(): SupportedLocale {
    return currentLocale;
  },

  /**
   * Check if the locale store is initialized
   */
  get isInitialized(): boolean {
    return isInitialized;
  },

  /**
   * Translate a key with optional interpolation values
   */
  t(key: string, values?: Record<string, string | number>): string {
    const translator = get(_);
    return translator(key, { values }) || key;
  },

  /**
   * Set the locale store as initialized
   */
  setInitialized(): void {
    isInitialized = true;
  },

  /**
   * Initialize the locale from user data
   */
  initializeFromUser(userLocale?: string | null): void {
    if (userLocale && isLocaleSupported(userLocale)) {
      currentLocale = userLocale;
      locale.set(userLocale);
    }
    isInitialized = true;
  },

  /**
   * Change the current locale
   */
  async setLocale(newLocale: SupportedLocale, userId?: string | number): Promise<void> {
    if (!isLocaleSupported(newLocale)) {
      console.warn(`Locale ${newLocale} is not supported`);
      return;
    }

    currentLocale = newLocale;
    await changeLocale(newLocale);

    // If userId is provided, persist to backend
    if (userId) {
      await this.persistLocale(newLocale, userId);
    }
  },

  /**
   * Persist the locale preference to the backend
   */
  async persistLocale(newLocale: SupportedLocale, userId: string | number): Promise<void> {
    try {
      await api.patch(`/users/${userId}`, {
        metadata: { locale: newLocale },
      });
    } catch (error) {
      console.error('Failed to persist locale preference:', error);
    }
  },

  /**
   * Reset the locale store to defaults
   */
  reset(): void {
    currentLocale = DEFAULT_LOCALE;
    isInitialized = false;
    locale.set(DEFAULT_LOCALE);
  },
};
