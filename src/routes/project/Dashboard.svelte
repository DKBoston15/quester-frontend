<!-- src/routes/project/Dashboard.svelte -->
<script lang="ts">
  import type { Project } from "$lib/types/auth";
  import ProjectInsights from "$lib/components/ProjectInsights.svelte";
  import ResearchProducts from "$lib/components/ResearchProducts.svelte";
  import ProjectOverview from "$lib/components/project/ProjectOverview.svelte";
  import ResearchDesigns from "$lib/components/project/ResearchDesigns.svelte";

  const props = $props<{ project: Project }>();
</script>

<div class="flex-1 w-full">
  <div class="w-full py-6 px-4">
    <h1 class="text-3xl font-bold mb-6">Project Dashboard</h1>

    <div class="grid grid-cols-2 gap-6 w-full">
      <!-- Left Column -->
      <div class="space-y-6">
        <ProjectOverview />
        <ResearchDesigns />
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <div class="w-full min-w-0">
          <ProjectInsights />
        </div>

        <div class="w-full min-w-0">
          <ResearchProducts />
        </div>
      </div>
    </div>
  </div>
</div>
