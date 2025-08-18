<script lang="ts" module>
  import { api } from "../services/api-client";
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
        const data = await api.get<Model[]>(`/model/project/${projectId}`);
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
        const data = await api.get<Model>(`/model/${modelId}`);
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
        const newModel: Model = await api.post<Model>(`/model`, {
          ...data,
          nodes: JSON.stringify([]),
          edges: JSON.stringify([]),
        });

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

        const updatedModelResponse = await api.put<{model: Model}>(`/model/${id}`, cleanData);

        // Extract the actual model data from the response
        const actualUpdatedModel = updatedModelResponse.model;

        if (!actualUpdatedModel) {
          throw new Error("API response did not contain model data.");
        }

        // Create a new array with the updated model
        const updatedModels = [...models];
        const index = updatedModels.findIndex((model) => model.id === id);
        if (index !== -1) {
          // Ensure the full model object is placed in the array
          updatedModels[index] = actualUpdatedModel;
          models = updatedModels;
        }

        if (currentModel?.id === id) {
          // Merge existing currentModel with the updated data
          currentModel = { ...currentModel, ...actualUpdatedModel };
        }

        return actualUpdatedModel; // Return the actual model data
      } catch (err) {
        console.error("Error updating model:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      }
    },

    async deleteModel(id: string) {
      try {
        await api.delete<void>(`/model/${id}`);

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
