
  import { api } from "../services/api-client";
  import type { Project } from "../types/auth";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  const t = (key: string) => get(_)(key);

  const createEmptyDesigns = () => ({
    research: [] as { name: string }[],
    sampling: [] as { name: string }[],
    measurement: [] as { name: string }[],
    analytic: [] as { name: string }[],
  });

  let currentProject = $state<Project | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let designs = $state<Record<string, { name: string }[]>>(createEmptyDesigns());
  let pendingProjectId: string | null = null;
  let pendingPromise: Promise<void> | null = null;

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

    async loadProject(projectId: string, options: { force?: boolean } = {}) {
      if (!projectId) {
        error = t('stores.project.failedToLoad');
        isLoading = false;
        return;
      }

      if (!options.force) {
        if (pendingProjectId === projectId && pendingPromise) {
          return pendingPromise;
        }

        if (currentProject?.id === projectId) {
          return pendingPromise ?? Promise.resolve();
        }
      }

      if (currentProject?.id !== projectId) {
        currentProject = null;
        designs = createEmptyDesigns();
      }

      isLoading = true;
      error = null;

      pendingProjectId = projectId;

      const loadPromise = (async () => {
        try {
          const [projectData, designsData] = await Promise.all([
            api.get<Project>(`/projects/${projectId}`),
            api.get(`/design/project/${projectId}`).catch(() => null),
          ]);

          currentProject = projectData;

          if (designsData && designsData.length > 0 && designsData[0].designs) {
            const designOptions = designsData[0].designs;
            designs = {
              research: designOptions.research || [],
              sampling: designOptions.sampling || [],
              measurement: designOptions.measurement || [],
              analytic: designOptions.analytic || [],
            };
          }
        } catch (err) {
          console.error("Error loading project:", err);
          error = err instanceof Error ? err.message : "An error occurred";
          currentProject = null;
        } finally {
          if (pendingProjectId === projectId) {
            pendingProjectId = null;
            pendingPromise = null;
          }
          isLoading = false;
        }
      })();

      pendingPromise = loadPromise;
      return loadPromise;
    },

    async updateProject(projectId: string, updateData: Partial<Project>) {
      try {
        const updatedProject = await api.put<Project>(
          `/projects/${projectId}`,
          updateData
        );
        currentProject = updatedProject;
        return updatedProject;
      } catch (err) {
        console.error("Error updating project:", err);
        throw err;
      }
    },

    async updateDesigns(projectId: string, designData: any) {
      try {
        const isUpdate =
          designs &&
          Object.keys(designs).some((key) => designs[key].length > 0);
        const endpoint = isUpdate ? `/design/project/${projectId}` : `/design`;
        const result = isUpdate
          ? await api.put(endpoint, { projectId, designs: designData })
          : await api.post(endpoint, { projectId, designs: designData });
        designs = result.design.designs;
        return result;
      } catch (err) {
        console.error("Error updating designs:", err);
        throw err;
      }
    },

    clearProject() {
      currentProject = null;
      designs = createEmptyDesigns();
      error = null;
      isLoading = false;
    },
  };
