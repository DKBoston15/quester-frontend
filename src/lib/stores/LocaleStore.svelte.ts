import { locale, _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import { DEFAULT_LOCALE, type SupportedLocale, isLocaleSupported } from '$lib/i18n/locales';
import { changeLocale } from '$lib/i18n';
import { api } from '$lib/services/api-client';
import {
  translateAllDesigns,
  isSupportedLocale,
  type SupportedLocale as DesignLocale
} from '$lib/utils/designTranslations';
import { projectStore } from '$lib/stores/ProjectStore.svelte';

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

    const previousLocale = currentLocale;
    currentLocale = newLocale;
    await changeLocale(newLocale);

    // If userId is provided, persist to backend and update owned project designs
    if (userId) {
      await this.persistLocale(newLocale, userId);

      // Update designs in owned projects if both locales are supported for design translation
      if (
        isSupportedLocale(previousLocale) &&
        isSupportedLocale(newLocale) &&
        previousLocale !== newLocale
      ) {
        const updatedProjectIds = await this.updateOwnedProjectDesigns(newLocale as DesignLocale, userId);

        // If the currently loaded project was updated, reload it to reflect new design names
        const currentProjectId = projectStore.currentProject?.id;
        if (currentProjectId && updatedProjectIds.includes(currentProjectId)) {
          await projectStore.loadProject(currentProjectId, { force: true });
        }
      }
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
   * Update design names in all projects owned by the user to the new locale
   * Only updates standard designs (those that exist in our translation mapping)
   * Custom designs are preserved unchanged
   * Returns the IDs of projects that were updated
   */
  async updateOwnedProjectDesigns(toLocale: DesignLocale, userId: string | number): Promise<string[]> {
    const updatedProjectIds: string[] = [];
    try {
      // Fetch all projects the user has access to
      const response = await api.get(`/projects/by-user?userId=${userId}`);
      const projects = response.data || response || [];

      // Filter to only projects the user directly owns (project.userId matches current user)
      // Organization-owned projects (userId: null) are not updated - non-owners see display-time translations
      const ownedProjects = projects.filter((project: {
        id: string;
        userId?: string | null;
      }) => project.userId && project.userId === String(userId));

      // Update designs for each owned project
      for (const project of ownedProjects) {
        try {
          // Fetch current designs for this project
          const designsResponse = await api.get(`/design/project/${project.id}`).catch(() => null);

          if (designsResponse && designsResponse.length > 0 && designsResponse[0].designs) {
            const currentDesigns = designsResponse[0].designs;

            // Translate standard designs to new locale
            const translatedDesigns = translateAllDesigns(currentDesigns, toLocale);

            // Update designs in database
            await api.put(`/design/project/${project.id}`, {
              projectId: project.id,
              designs: translatedDesigns,
            });

            updatedProjectIds.push(project.id);
          }
        } catch (projectError) {
          console.error(`Failed to update designs for project ${project.id}:`, projectError);
          // Continue with other projects even if one fails
        }
      }
    } catch (error) {
      console.error('Failed to update owned project designs:', error);
    }
    return updatedProjectIds;
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
