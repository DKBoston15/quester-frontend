<script lang="ts">
  import KeywordAnalysis from "$lib/components/keyword-analysis/KeywordAnalysis.svelte";
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { API_BASE_URL } from "$lib/config";

  let isLoadingCapability = $state(true);
  let hasAccess = $state(false);

  // Check if user has access to analysis features
  async function checkAnalysisAccessCapability() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/capabilities/analysis_access`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check analysis access capability");
      }

      const data = await response.json();
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to dashboard
      if (!hasAccess) {
        console.warn(
          "User attempted to access Analysis page without permission"
        );
        if (projectStore.currentProject?.id) {
          navigate(`/project/${projectStore.currentProject.id}/dashboard`);
        } else {
          navigate("/dashboard");
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check analysis access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/dashboard");
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
        <div>
          <h1 class="text-3xl font-bold">Analysis</h1>
        </div>
        <p class="text-muted-foreground mt-2">
          Analyze keyword patterns and relationships across your research
          documents
        </p>
      </div>
      <KeywordAnalysis />
    </div>
  </div>
{/if}
