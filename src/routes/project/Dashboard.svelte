<!-- src/routes/project/Dashboard.svelte -->
<script lang="ts">
  import ProjectInsights from "$lib/components/ProjectInsights.svelte";
  import ResearchProducts from "$lib/components/ResearchProducts.svelte";
  import ProjectOverview from "$lib/components/project/ProjectOverview.svelte";
  import ResearchDesigns from "$lib/components/project/ResearchDesigns.svelte";
  import PublisherScore from "$lib/components/custom-ui/dashboard/PublisherScore.svelte";
  import KeywordAnalysis from "$lib/components/keyword-analysis/KeywordAnalysis.svelte";
</script>

<div class="flex-1 w-full overflow-x-hidden">
  <div class="w-full py-6 px-4">
    <h1 class="text-3xl font-bold mb-6 ml-1">Project Dashboard</h1>

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

        <div class="w-full min-w-0">
          <PublisherScore />
        </div>
      </div>
    </div>
    <div class="mt-4">
      <KeywordAnalysis />
    </div>
  </div>
</div>
