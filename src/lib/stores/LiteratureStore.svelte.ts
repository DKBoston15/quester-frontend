
  import { api } from "../services/api-client";
  import type { Literature } from "../types/literature";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";
  import { normalizeDesignDetail } from "$lib/utils/design";

  const t = (key: string, options?: object) => get(_)(key, options);

  const DESIGN_FIELDS = [
    "researchDesign",
    "analyticDesign",
    "samplingDesign",
    "measurementDesign",
  ] as const;

  type DesignFieldKey = (typeof DESIGN_FIELDS)[number];

function normalizeLiteratureDesignFields<T extends Partial<Literature>>(
  literature: T
): T {
  const normalized: Partial<Literature> = { ...literature };

  for (const field of DESIGN_FIELDS) {
    const value = normalized[field];
    if (value !== undefined) {
      normalized[field] = normalizeDesignDetail(
        value
      ) as Literature[DesignFieldKey];
    }
  }

  return normalized as T;
}

  let literatureData = $state<Literature[]>([]);
  // Track which project the literature is loaded for
  let loadedProjectId = $state<string | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  export const literatureStore = {
    get data() {
      return literatureData;
    },
    get loadedProjectId() {
      return loadedProjectId;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },

    getById(id: string): Literature | undefined {
      return literatureData.find(item => item.id === id);
    },

    async loadLiterature(projectId: string) {
      if (!projectId) {
        error = t("literatureStore.noProjectId");
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        const data = await api.get<Literature[]>(
          `/literature/project/${projectId}`
        );
        literatureData = data.map((item) =>
          normalizeLiteratureDesignFields(item)
        );
        loadedProjectId = projectId;
      } catch (err) {
        console.error("Error loading literature:", err);
        error = err instanceof Error ? err.message : t("literatureStore.errorLoadingLiterature");
        literatureData = [];
        loadedProjectId = null;
      } finally {
        isLoading = false;
      }
    },

    async addLiterature(literature: Partial<Literature>) {
      try {
        const payload = normalizeLiteratureDesignFields({
          ...literature,
        });
        const newLiterature = await api.post(`/literature`, payload);
        const created = normalizeLiteratureDesignFields(
          newLiterature.literature
        );
        literatureData = [
          created,
          ...literatureData,
        ];
        return newLiterature;
      } catch (err) {
        console.error(t("literatureStore.errorAddingLiterature"), err);
        throw err;
      }
    },

    async updateLiterature(id: string, updateData: Partial<Literature>) {
      try {
        const payload = normalizeLiteratureDesignFields({
          ...updateData,
        });
        const updatedLiterature = await api.put(
          `/literature/${id}`,
          payload
        );
        const updated = normalizeLiteratureDesignFields(
          updatedLiterature.literature
        );
        literatureData = literatureData.map((item) =>
          item.id === id ? updated : item
        );
        return updatedLiterature;
      } catch (err) {
        console.error(t("literatureStore.errorUpdatingLiterature"), err);
        throw err;
      }
    },

    async deleteLiterature(id: string) {
      try {
        // Deletion can take longer (R2 + embeddings cleanup). Increase timeout.
        await api.delete(`/literature/${id}`, { timeout: 120000, retries: 0 });
        literatureData = literatureData.filter((item) => item.id !== id);
      } catch (err) {
        console.error(t("literatureStore.errorDeletingLiterature"), err);
        throw err;
      }
    },

    clearLiterature() {
      literatureData = [];
      error = null;
      isLoading = false;
      loadedProjectId = null;
    },
  };
