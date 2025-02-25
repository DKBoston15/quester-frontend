<!-- src/lib/stores/ProjectStore.svelte -->
<script lang="ts" module>
  import type { Project } from "../types/auth";

  let currentProject = $state<Project | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let designs = $state<Record<string, { name: string }[]>>({
    research: [],
    sampling: [],
    measurement: [],
    analytic: [],
  });

  export const projectStore = {
    get currentProject() {
      return currentProject;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get designs() {
      return designs;
    },

    async loadProject(projectId: string) {
      if (!projectId) {
        error = "No project ID provided";
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        const [projectResponse, designsResponse] = await Promise.all([
          fetch(`http://localhost:3333/projects/${projectId}`, {
            credentials: "include",
          }),
          fetch(`http://localhost:3333/design/project/${projectId}`, {
            credentials: "include",
          }),
        ]);

        if (!projectResponse.ok) {
          throw new Error(`Project not found (${projectResponse.status})`);
        }

        const projectData = await projectResponse.json();
        currentProject = projectData;

        if (designsResponse.ok) {
          const designsData = await designsResponse.json();
          if (designsData.length > 0 && designsData[0].designs?.designs) {
            const designOptions = designsData[0].designs.designs;
            designs = {
              research: designOptions.research || [],
              sampling: designOptions.sampling || [],
              measurement: designOptions.measurement || [],
              analytic: designOptions.analytic || [],
            };
          }
        }
      } catch (err) {
        console.error("Error loading project:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        currentProject = null;
      } finally {
        isLoading = false;
      }
    },

    async updateProject(projectId: string, updateData: Partial<Project>) {
      try {
        const response = await fetch(
          `http://localhost:3333/projects/${projectId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update project (${response.status})`);
        }

        const updatedProject = await response.json();
        currentProject = updatedProject;
        return updatedProject;
      } catch (err) {
        console.error("Error updating project:", err);
        throw err;
      }
    },

    async updateDesigns(projectId: string, designData: any) {
      try {
        const method = designs ? "PUT" : "POST";
        const endpoint = designs
          ? `http://localhost:3333/design/project/${projectId}`
          : "http://localhost:3333/design";

        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            designs: designData,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update designs (${response.status})`);
        }

        const result = await response.json();
        designs = result.design.designs;
        return result;
      } catch (err) {
        console.error("Error updating designs:", err);
        throw err;
      }
    },

    clearProject() {
      currentProject = null;
      designs = {
        research: [],
        sampling: [],
        measurement: [],
        analytic: [],
      };
      error = null;
      isLoading = false;
    },
  };
</script>
