<!-- src/routes/Project.svelte -->
<script lang="ts">
  import { projectStore } from "../lib/stores/ProjectStore.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import ProjectSidebar from "$lib/components/ProjectSidebar.svelte";
  import { useLocation } from "svelte-routing";
  import Overview from "./project/Overview.svelte";
  import Literature from "./project/Literature.svelte";
  import LiteratureView from "./project/LiteratureView.svelte";
  import Models from "./project/Models.svelte";
  import ModelView from "./project/ModelView.svelte";
  import Notes from "./project/Notes.svelte";
  import Outcomes from "./project/Outcomes.svelte";
  import Analytics from "./project/Analytics.svelte";
  import Connections from "./project/Connections.svelte";
  import Progress from "./project/Progress.svelte";
  import Settings from "./project/Settings.svelte";
  import Insights from "./project/Insights.svelte";
  import OutcomeView from "./project/OutcomeView.svelte";
  import Chat from "./project/Chat.svelte";
  import { trackPageView } from "$lib/services/fullstory";
  
  type SectionKey =
    | "overview"
    | "literature"
    | "models"
    | "notes"
    | "outcomes"
    | "analytics"
    | "insights"
    | "connections"
    | "progress"
    | "project_settings"
    | "chat";

  const components: Record<SectionKey, any> = {
    overview: Overview,
    literature: Literature,
    models: Models,
    notes: Notes,
    outcomes: Outcomes,
    analytics: Analytics,
    insights: Insights,
    connections: Connections,
    progress: Progress,
    project_settings: Settings,
    chat: Chat,
  };

  const props = $props<{
    params: {
      projectId: string;
      view?: string;
      literatureId?: string;
      modelId?: string;
      outcomeId?: string;
    };
  }>();

  const location = useLocation();

  $effect(() => {
    projectStore.loadProject(props.params.projectId);
  });

  // Track page views in FullStory
  $effect(() => {
    const { projectId, literatureId, modelId, outcomeId, view } = props.params;
    
    // Determine section from params or default to overview
    const section = view || 'overview';
    
    trackPageView(`Project - ${section}`, {
      projectId,
      section,
      literatureId,
      modelId,
      outcomeId,
    });
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
    <main
      class="flex-1 {getCurrentSection() === 'connections'
        ? 'overflow-hidden'
        : 'overflow-y-auto'} min-w-0"
    >
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
        {:else if props.params.view === "models" && props.params.modelId}
          <ModelView
            modelId={props.params.modelId}
            projectId={props.params.projectId}
          />
        {:else if props.params.view === "outcomes" && props.params.outcomeId}
          <OutcomeView
            outcomeId={props.params.outcomeId}
            projectId={props.params.projectId}
          />
        {:else}
          {@const section = getCurrentSection()}
          {@const Component = components[section] || components.overview}
          <Component project={projectStore.currentProject} />
        {/if}
      {/if}
    </main>
  </div>
</Sidebar.Provider>
