<script lang="ts">
  import KeywordAnalysis from "$lib/components/keyword-analysis/KeywordAnalysis.svelte";
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { api } from "$lib/services/api-client";
  import { Info } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";

  let isLoadingCapability = $state(true);
  let hasAccess = $state(false);

  // Check if user has access to analysis features
  async function checkAnalysisAccessCapability() {
    try {
      const data = await api.get('/capabilities/analysis_access');
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to overview
      if (!hasAccess) {
        console.warn(
          "User attempted to access Insights page without permission"
        );
        if (projectStore.currentProject?.id) {
          navigate(`/project/${projectStore.currentProject.id}/overview`);
        } else {
          navigate("/overview");
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check analysis access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/overview");
      return false;
    } finally {
      isLoadingCapability = false;
    }
  }

  onMount(() => {
    checkAnalysisAccessCapability();
  });
</script>

{#if isLoadingCapability}
  <div class="flex-1 w-full flex items-center justify-center">
    <div
      class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
    ></div>
  </div>
{:else if hasAccess}
  <div class="flex-1 w-full">
    <div class="container mx-auto py-6 px-4">
      <div class="mb-8">
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold">Insights</h1>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Info class="h-5 w-5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="text-sm max-w-xs">
                Analyze keyword patterns and relationships across your research to discover emerging themes and connections in your literature.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <p class="text-muted-foreground mt-2">
          Gain insights into keyword patterns and relationships across your
          research
        </p>
      </div>
      <KeywordAnalysis />
    </div>
  </div>
{/if}
