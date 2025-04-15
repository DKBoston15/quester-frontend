<!-- src/lib/stores/ModelStore.svelte -->
<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";
  import type { Node, Edge } from "@xyflow/svelte";
  import { toPng } from "html-to-image";

  interface Model {
    id: string;
    name: string;
    projectId: string;
    nodes: Node[];
    edges: Edge[];
    createdAt: string;
    updatedAt: string;
  }

  let models = $state<Model[]>([]);
  let currentModel = $state<Model | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  export const modelStore = {
    get models() {
      return models;
    },
    get currentModel() {
      return currentModel;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },

    setModels(newModels: Model[]) {
      models = newModels;
    },

    async loadModels(projectId: string) {
      if (!projectId) {
        error = "No project ID provided";
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(
          `${API_BASE_URL}/model/project/${projectId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load models (${response.status})`);
        }

        const data = await response.json();
        models = data;
      } catch (err) {
        console.error("Error loading models:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        models = [];
      } finally {
        isLoading = false;
      }
    },

    async loadModel(modelId: string) {
      if (!modelId) {
        error = "No model ID provided";
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(`${API_BASE_URL}/model/${modelId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load model (${response.status})`);
        }

        const data = await response.json();
        currentModel = data;
        return data;
      } catch (err) {
        console.error("Error loading model:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        currentModel = null;
      } finally {
        isLoading = false;
      }
    },

    async createModel(data: Partial<Model>) {
      isLoading = true;
      error = null;

      try {
        const response = await fetch(`${API_BASE_URL}/model`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            ...data,
            nodes: JSON.stringify([]),
            edges: JSON.stringify([]),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create model (${response.status})`);
        }

        const newModel: Model = await response.json();

        if (!newModel?.id) {
          throw new Error("Received invalid model data from API");
        }

        models = [newModel, ...models];
        currentModel = newModel;
        return newModel;
      } catch (err) {
        console.error("Error creating model:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async updateModel(id: string, data: Partial<Model>) {
      try {
        // Ensure nodes and edges are properly stringified
        const cleanData = {
          ...data,
          nodes: data.nodes ? JSON.stringify(data.nodes) : undefined,
          edges: data.edges ? JSON.stringify(data.edges) : undefined,
        };

        const response = await fetch(`${API_BASE_URL}/model/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(cleanData),
        });

        if (!response.ok) {
          throw new Error(`Failed to update model (${response.status})`);
        }

        const updatedModel = await response.json();

        console.log("Model updated successfully:", updatedModel);

        // Create a new array with the updated model
        const updatedModels = [...models];
        const index = updatedModels.findIndex((model) => model.id === id);
        if (index !== -1) {
          updatedModels[index] = updatedModel;
          models = updatedModels;
        }

        if (currentModel?.id === id) {
          currentModel = updatedModel;
        }
        return updatedModel;
      } catch (err) {
        console.error("Error updating model:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      }
    },

    async deleteModel(id: string) {
      try {
        const response = await fetch(`${API_BASE_URL}/model/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete model (${response.status})`);
        }

        models = models.filter((model) => model.id !== id);
        if (currentModel?.id === id) {
          currentModel = null;
        }
      } catch (err) {
        console.error("Error deleting model:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      }
    },

    async exportToPng(flowId: string) {
      try {
        const element = document.querySelector(`[data-flowid="${flowId}"]`);
        if (!element) {
          throw new Error("Flow element not found");
        }

        const dataUrl = await toPng(element as HTMLElement, {
          backgroundColor: "#ffffff",
        });

        // Create a download link
        const link = document.createElement("a");
        link.download = `${currentModel?.name || "model"}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Error exporting model:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      }
    },

    clearModel() {
      currentModel = null;
      error = null;
      isLoading = false;
    },

    clearAll() {
      models = [];
      currentModel = null;
      error = null;
      isLoading = false;
    },
  };
</script>
