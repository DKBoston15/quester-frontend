
  import { api } from "../services/api-client";
  import type { Project } from "../types/auth";
  import { normalizeDesignDetail } from "$lib/utils/design";

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
        isLoading = false;
      }
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
            payload[field] = normalizeDesignDetail(payload[field]);
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
