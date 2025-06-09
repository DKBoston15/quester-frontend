<!-- src/lib/stores/GrantStore.svelte -->
<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";
  import type { Grant } from "../types/auth";

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
        error = "No project ID provided";
        return;
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(
          `${API_BASE_URL}/projects/${projectId}/grants`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load grants (${response.status})`);
        }

        const grantsData = await response.json();
        grants = grantsData;
      } catch (err) {
        console.error("Error loading grants:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        grants = [];
      } finally {
        isLoading = false;
      }
    },

    async loadGrant(grantId: string) {
      if (!grantId) {
        error = "No grant ID provided";
        return;
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(`${API_BASE_URL}/grants/${grantId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Grant not found (${response.status})`);
        }

        const grantData = await response.json();
        currentGrant = grantData;
        return grantData;
      } catch (err) {
        console.error("Error loading grant:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        currentGrant = null;
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async createGrant(projectId: string, grantData: Partial<Grant>) {
      if (!projectId) {
        throw new Error("No project ID provided");
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(
          `${API_BASE_URL}/projects/${projectId}/grants`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(grantData),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to create grant (${response.status})`);
        }

        const newGrant = await response.json();
        grants = [...grants, newGrant];
        return newGrant;
      } catch (err) {
        console.error("Error creating grant:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async updateGrant(grantId: string, updateData: Partial<Grant>) {
      if (!grantId) {
        throw new Error("No grant ID provided");
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(`${API_BASE_URL}/grants/${grantId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error(`Failed to update grant (${response.status})`);
        }

        const updatedGrant = await response.json();

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
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async deleteGrant(grantId: string) {
      if (!grantId) {
        throw new Error("No grant ID provided");
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(`${API_BASE_URL}/grants/${grantId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete grant (${response.status})`);
        }

        // Remove from grants array
        grants = grants.filter((grant) => grant.id !== grantId);

        // Clear current grant if it's the deleted one
        if (currentGrant?.id === grantId) {
          currentGrant = null;
        }
      } catch (err) {
        console.error("Error deleting grant:", err);
        error = err instanceof Error ? err.message : "An error occurred";
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
</script>
