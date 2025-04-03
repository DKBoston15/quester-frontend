<!-- src/routes/project/Dashboard.svelte -->
<script lang="ts">
  import ProjectInsights from "$lib/components/ProjectInsights.svelte";
  import ResearchProducts from "$lib/components/ResearchProducts.svelte";
  import ProjectOverview from "$lib/components/project/ProjectOverview.svelte";
  import ResearchDesigns from "$lib/components/project/ResearchDesigns.svelte";
  import ProjectKeywords from "$lib/components/project/ProjectKeywords.svelte";
  import * as Card from "$lib/components/ui/card";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import NextBestActions from "$lib/components/custom-ui/project/NextBestActions.svelte";
</script>

<div class="flex-1 w-full overflow-x-hidden">
  <div class="container mx-auto py-6 px-4">
    <h1 class="text-3xl font-bold mb-6 ml-1">Dashboard</h1>

    <div class="grid grid-cols-2 gap-6 w-full">
      <!-- Left Column -->
      <div class="space-y-6">
        <ProjectOverview />

        <!-- Keywords -->
        {#if projectStore.currentProject}
          <Card.Root
            class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Card.Header>
              <Card.Title>Project Keywords</Card.Title>
            </Card.Header>
            <Card.Content>
              <ProjectKeywords project={projectStore.currentProject} />
            </Card.Content>
          </Card.Root>
        {/if}

        <div class="w-full min-w-0">
          <ResearchDesigns />
        </div>
        <div class="w-full min-w-0">
          <ResearchProducts />
        </div>
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <div class="w-full min-w-0">
          <ProjectInsights />
        </div>
        <div class="w-full min-w-0">
          <NextBestActions />
        </div>
      </div>
    </div>
  </div>
</div>
