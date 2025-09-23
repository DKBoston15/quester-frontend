
  import { api } from "../services/api-client";
  import type { Literature } from "../types/literature";
  import { normalizeDesignDetail } from "$lib/utils/design";

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

    async loadLiterature(projectId: string) {
      if (!projectId) {
        error = "No project ID provided";
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        const data = await api.get<Literature[]>(
          `/literature/project/${projectId}`
        );
        literatureData = data.map((item) => ({
          ...item,
          researchDesign: normalizeDesignDetail(item.researchDesign),
          analyticDesign: normalizeDesignDetail(item.analyticDesign),
          samplingDesign: normalizeDesignDetail(item.samplingDesign),
          measurementDesign: normalizeDesignDetail(item.measurementDesign),
        }));
        loadedProjectId = projectId;
      } catch (err) {
        console.error("Error loading literature:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        literatureData = [];
        loadedProjectId = null;
      } finally {
        isLoading = false;
      }
    },

    async addLiterature(literature: Partial<Literature>) {
      try {
        const payload: Partial<Literature> = { ...literature };
        const designFields: Array<keyof Literature> = [
          "researchDesign",
          "analyticDesign",
          "samplingDesign",
          "measurementDesign",
        ];

        for (const field of designFields) {
          if (field in payload && payload[field] !== undefined) {
            payload[field] = normalizeDesignDetail(payload[field]);
          }
        }

        const newLiterature = await api.post(`/literature`, payload);
        const normalized = {
          ...newLiterature.literature,
          researchDesign: normalizeDesignDetail(newLiterature.literature.researchDesign),
          analyticDesign: normalizeDesignDetail(newLiterature.literature.analyticDesign),
          samplingDesign: normalizeDesignDetail(newLiterature.literature.samplingDesign),
          measurementDesign: normalizeDesignDetail(newLiterature.literature.measurementDesign),
        };
        literatureData = [normalized, ...literatureData];
        return newLiterature;
      } catch (err) {
        console.error("Error adding literature:", err);
        throw err;
      }
    },

    async updateLiterature(id: string, updateData: Partial<Literature>) {
      try {
        const payload: Partial<Literature> = { ...updateData };
        const designFields: Array<keyof Literature> = [
          "researchDesign",
          "analyticDesign",
          "samplingDesign",
          "measurementDesign",
        ];

        for (const field of designFields) {
          if (field in payload && payload[field] !== undefined) {
            payload[field] = normalizeDesignDetail(payload[field]);
          }
        }

        const updatedLiterature = await api.put(
          `/literature/${id}`,
          payload
        );
        const normalized = {
          ...updatedLiterature.literature,
          researchDesign: normalizeDesignDetail(updatedLiterature.literature.researchDesign),
          analyticDesign: normalizeDesignDetail(updatedLiterature.literature.analyticDesign),
          samplingDesign: normalizeDesignDetail(updatedLiterature.literature.samplingDesign),
          measurementDesign: normalizeDesignDetail(updatedLiterature.literature.measurementDesign),
        };
        literatureData = literatureData.map((item) =>
          item.id === id ? normalized : item
        );
        return updatedLiterature;
      } catch (err) {
        console.error("Error updating literature:", err);
        throw err;
      }
    },

    async deleteLiterature(id: string) {
      try {
        // Deletion can take longer (R2 + embeddings cleanup). Increase timeout.
        await api.delete(`/literature/${id}`, { timeout: 120000, retries: 0 });
        literatureData = literatureData.filter((item) => item.id !== id);
      } catch (err) {
        console.error("Error deleting literature:", err);
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
