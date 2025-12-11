import { api } from "$lib/services/api-client";
import type { Grant } from "../types/auth";
import { _ } from "svelte-i18n";
import { get } from "svelte/store";

const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

let grants = $state<Grant[]>([]);
let currentGrant = $state<Grant | null>(null);
let isLoading = $state(false);
let error = $state<string | null>(null);

export const grantStore = {
    get grants() {
      return grants;
    },
    get currentGrant() {
      return currentGrant;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },

    async loadGrants(projectId: string) {
      if (!projectId) {
        error = t("grantStore.noProjectId");
        return;
      }

      isLoading = true;
      error = null;

      try {
        const grantsData = await api.get<Grant[]>(`/projects/${projectId}/grants`);
        grants = grantsData;
      } catch (err) {
        console.error("Error loading grants:", err);
        error = err instanceof Error ? err.message : t("grantStore.errorOccurred");
        grants = [];
      } finally {
        isLoading = false;
      }
    },

    async loadGrant(grantId: string) {
      if (!grantId) {
        error = t("grantStore.noGrantId");
        return;
      }

      isLoading = true;
      error = null;

      try {
        const grantData = await api.get<Grant>(`/grants/${grantId}`);
        currentGrant = grantData;
        return grantData;
      } catch (err) {
        console.error("Error loading grant:", err);
        error = err instanceof Error ? err.message : t("grantStore.errorOccurred");
        currentGrant = null;
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async createGrant(projectId: string, grantData: Partial<Grant>) {
      if (!projectId) {
        throw new Error(t("grantStore.noProjectId"));
      }

      isLoading = true;
      error = null;

      try {
        const newGrant = await api.post<Grant>(
          `/projects/${projectId}/grants`,
          grantData
        );
        grants = [...grants, newGrant];
        return newGrant;
      } catch (err) {
        console.error("Error creating grant:", err);
        error = err instanceof Error ? err.message : t("grantStore.errorOccurred");
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async updateGrant(grantId: string, updateData: Partial<Grant>) {
      if (!grantId) {
        throw new Error(t("grantStore.noGrantId"));
      }

      isLoading = true;
      error = null;

      try {
        const updatedGrant = await api.put<Grant>(`/grants/${grantId}`, updateData);

        // Update in grants array
        grants = grants.map((grant) =>
          grant.id === grantId ? updatedGrant : grant
        );

        // Update current grant if it's the same one
        if (currentGrant?.id === grantId) {
          currentGrant = updatedGrant;
        }

        return updatedGrant;
      } catch (err) {
        console.error("Error updating grant:", err);
        error = err instanceof Error ? err.message : t("grantStore.errorOccurred");
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async deleteGrant(grantId: string) {
      if (!grantId) {
        throw new Error(t("grantStore.noGrantId"));
      }

      isLoading = true;
      error = null;

      try {
        await api.delete<void>(`/grants/${grantId}`);

        // Remove from grants array
        grants = grants.filter((grant) => grant.id !== grantId);

        // Clear current grant if it's the deleted one
        if (currentGrant?.id === grantId) {
          currentGrant = null;
        }
      } catch (err) {
        console.error("Error deleting grant:", err);
        error = err instanceof Error ? err.message : t("grantStore.errorOccurred");
        throw err;
      } finally {
        isLoading = false;
      }
    },

    setCurrentGrant(grant: Grant | null) {
      currentGrant = grant;
    },

    clearGrants() {
      grants = [];
      currentGrant = null;
      error = null;
      isLoading = false;
    },

    clearError() {
      error = null;
    },
  };
