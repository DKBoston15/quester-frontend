<script lang="ts" module>
  import { api } from "../services/api-client";
  import type { Literature } from "../types/literature";

  let literatureData = $state<Literature[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  export const literatureStore = {
    get data() {
      return literatureData;
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
        literatureData = data;
      } catch (err) {
        console.error("Error loading literature:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        literatureData = [];
      } finally {
        isLoading = false;
      }
    },

    async addLiterature(literature: Partial<Literature>) {
      try {
        const newLiterature = await api.post(`/literature`, literature);
        literatureData = [newLiterature.literature, ...literatureData];
        return newLiterature;
      } catch (err) {
        console.error("Error adding literature:", err);
        throw err;
      }
    },

    async updateLiterature(id: string, updateData: Partial<Literature>) {
      try {
        const updatedLiterature = await api.put(
          `/literature/${id}`,
          updateData
        );
        literatureData = literatureData.map((item) =>
          item.id === id ? updatedLiterature.literature : item
        );
        return updatedLiterature;
      } catch (err) {
        console.error("Error updating literature:", err);
        throw err;
      }
    },

    async deleteLiterature(id: string) {
      try {
        await api.delete(`/literature/${id}`);
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
    },
  };
</script>
