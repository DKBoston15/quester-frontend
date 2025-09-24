
  import { api } from "../services/api-client";
  import type { Project } from "../types/auth";
  import { normalizeDesignDetail } from "$lib/utils/design";

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
        error = "No project ID provided";
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

          currentProject = {
            ...projectData,
            researchDesign: normalizeDesignDetail(projectData.researchDesign),
            analyticDesign: normalizeDesignDetail(projectData.analyticDesign),
            samplingDesign: normalizeDesignDetail(projectData.samplingDesign),
            measurementDesign: normalizeDesignDetail(projectData.measurementDesign),
          };

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
        const payload: Partial<Project> = { ...updateData };
        const designFields: Array<keyof Project> = [
          "researchDesign",
          "analyticDesign",
          "samplingDesign",
          "measurementDesign",
        ];

        for (const field of designFields) {
          if (field in payload && payload[field] !== undefined) {
            (payload as any)[field] = normalizeDesignDetail(payload[field]);
          }
        }

        const updatedProject = await api.put<Project>(
          `/projects/${projectId}`,
          payload
        );
        currentProject = {
          ...updatedProject,
          researchDesign: normalizeDesignDetail(updatedProject.researchDesign),
          analyticDesign: normalizeDesignDetail(updatedProject.analyticDesign),
          samplingDesign: normalizeDesignDetail(updatedProject.samplingDesign),
          measurementDesign: normalizeDesignDetail(updatedProject.measurementDesign),
        };
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
