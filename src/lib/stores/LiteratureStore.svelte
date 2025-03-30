<!-- src/lib/stores/LiteratureStore.svelte -->
<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";
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
        const response = await fetch(
          `${API_BASE_URL}/literature/project/${projectId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load literature (${response.status})`);
        }

        const data = await response.json();
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
        const response = await fetch(`${API_BASE_URL}/literature`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(literature),
        });

        if (!response.ok) {
          throw new Error(`Failed to add literature (${response.status})`);
        }

        const newLiterature = await response.json();
        literatureData = [newLiterature.literature, ...literatureData];
        return newLiterature;
      } catch (err) {
        console.error("Error adding literature:", err);
        throw err;
      }
    },

    async updateLiterature(id: string, updateData: Partial<Literature>) {
      try {
        const response = await fetch(`${API_BASE_URL}/literature/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error(`Failed to update literature (${response.status})`);
        }

        const updatedLiterature = await response.json();
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
        const response = await fetch(`${API_BASE_URL}/literature/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete literature (${response.status})`);
        }

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
