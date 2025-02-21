<!-- src/routes/Project.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "../lib/stores/AuthStore.svelte";
  import type { Project } from "$lib/types/auth";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import ProjectSidebar from "$lib/components/ProjectSidebar.svelte";
  import { useLocation } from "svelte-routing";
  import Dashboard from "./project/Dashboard.svelte";
  import Literature from "./project/Literature.svelte";
  import Notes from "./project/Notes.svelte";
  import Outcomes from "./project/Outcomes.svelte";
  import Analytics from "./project/Analytics.svelte";
  import Connections from "./project/Connections.svelte";
  import Progress from "./project/Progress.svelte";
  import Team from "./project/Team.svelte";
  import Settings from "./project/Settings.svelte";

  type SectionKey =
    | "dashboard"
    | "literature"
    | "notes"
    | "outcomes"
    | "analytics"
    | "connections"
    | "progress"
    | "team"
    | "project_settings";

  const components: Record<SectionKey, any> = {
    dashboard: Dashboard,
    literature: Literature,
    notes: Notes,
    outcomes: Outcomes,
    analytics: Analytics,
    connections: Connections,
    progress: Progress,
    team: Team,
    project_settings: Settings,
  };

  const props = $props<{
    params: {
      projectId: string;
    };
  }>();

  let project = $state<Project | null>(null);
  let isLoading = $state(true);
  let error = $state("");
  const location = useLocation();

  $effect(() => {
    console.log("Project params:", props.params);
    loadProject();
  });

  function getCurrentSection(): SectionKey {
    const path = $location.pathname;
    const parts = path.split("/");
    const section = parts[parts.length - 1];
    return section as SectionKey;
  }

  async function loadProject() {
    if (!props.params.projectId) {
      error = "No project ID provided";
      isLoading = false;
      return;
    }

    try {
      console.log("Fetching project:", props.params.projectId);
      const projectResponse = await fetch(
        `http://localhost:3333/projects/${props.params.projectId}`,
        { credentials: "include" }
      );

      if (!projectResponse.ok) {
        throw new Error(`Project not found (${projectResponse.status})`);
      }

      const projectData = await projectResponse.json();
      console.log("Project data:", projectData);
      project = projectData;
    } catch (err) {
      console.error("Error loading project:", err);
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  }
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-background">
    <ProjectSidebar {project} />
    <main class="flex-1 overflow-y-auto">
      {#if isLoading}
        <div class="container mx-auto py-6">
          <div class="text-center">Loading project...</div>
        </div>
      {:else if error}
        <div class="container mx-auto py-6">
          <div class="text-red-500">
            {error}
            <div class="text-sm mt-2">
              Project ID: {props.params.projectId}
            </div>
          </div>
        </div>
      {:else if project}
        {@const section = getCurrentSection()}
        {@const Component = components[section] || components.dashboard}
        <Component {project} />
      {/if}
    </main>
  </div>
</Sidebar.Provider>
