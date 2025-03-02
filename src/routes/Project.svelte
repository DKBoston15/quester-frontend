<!-- src/routes/Project.svelte -->
<script lang="ts">
  import { projectStore } from "../lib/stores/ProjectStore.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import ProjectSidebar from "$lib/components/ProjectSidebar.svelte";
  import { useLocation } from "svelte-routing";
  import Dashboard from "./project/Dashboard.svelte";
  import Literature from "./project/Literature.svelte";
  import LiteratureView from "./project/LiteratureView.svelte";
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
      view?: string;
      literatureId?: string;
    };
  }>();

  const location = useLocation();

  $effect(() => {
    projectStore.loadProject(props.params.projectId);
  });

  function getCurrentSection(): SectionKey {
    const path = $location.pathname;
    const parts = path.split("/");
    const section = parts[parts.length - 1];
    return section as SectionKey;
  }
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-background w-full">
    <ProjectSidebar project={projectStore.currentProject} />
    <main class="flex-1 overflow-y-auto min-w-0">
      {#if projectStore.isLoading}
        <div class="container mx-auto py-6">
          <div class="text-center">Loading project...</div>
        </div>
      {:else if projectStore.error}
        <div class="container mx-auto py-6">
          <div class="text-red-500">
            {projectStore.error}
            <div class="text-sm mt-2">
              Project ID: {props.params.projectId}
            </div>
          </div>
        </div>
      {:else if projectStore.currentProject}
        {#if props.params.view === "literature" && props.params.literatureId}
          <LiteratureView literatureId={props.params.literatureId} />
        {:else}
          {@const section = getCurrentSection()}
          {@const Component = components[section] || components.dashboard}
          <Component project={projectStore.currentProject} />
        {/if}
      {/if}
    </main>
  </div>
</Sidebar.Provider>
