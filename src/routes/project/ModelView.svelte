<!-- src/routes/project/ModelView.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import Model from "$lib/components/model/Model.svelte";
  import { API_BASE_URL } from "$lib/config";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";

  const props = $props<{
    modelId: string;
    projectId: string;
  }>();

  let isLoadingCapability = $state(true);
  let hasAccess = $state(false);

  // Check if user has access to model features
  async function checkModelAccessCapability() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/capabilities/model_access`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check model access capability");
      }

      const data = await response.json();
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to overview
      if (!hasAccess) {
        console.warn("User attempted to access Model view without permission");
        if (props.projectId) {
          navigate(`/project/${props.projectId}/overview`);
        } else {
          navigate("/overview");
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check model access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/overview");
      return false;
    } finally {
      isLoadingCapability = false;
    }
  }

  onMount(async () => {
    const hasModelAccess = await checkModelAccessCapability();
    if (hasModelAccess) {
      await modelStore.loadModel(props.modelId);
    }
  });

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#model-view-loading-container",
        popover: {
          title: "Loading Your Model",
          description:
            "Quester is now checking your access permissions and loading the selected model data. This usually only takes a moment.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#model-view-container", // Target the container of the Model component
        popover: {
          title: "Model Ready!",
          description:
            "The model editor is now loaded. You can use the tour button within the editor for guidance on building your model.",
          side: "top",
          align: "center",
        },
        onHighlightStarted: (element, step, options) => {
          // Only show this step if the model has actually loaded
          if (
            isLoadingCapability ||
            !hasAccess ||
            modelStore.isLoading ||
            modelStore.error ||
            !modelStore.currentModel
          ) {
            driverObj.moveNext(); // Skip if model isn't loaded
          }
        },
      },
    ],
  });
</script>

<div class="h-full relative" id="model-view-outer-container">
  <div class="absolute top-2 right-2 z-50">
    <Button
      variant="outline"
      size="icon"
      onclick={() => driverObj.drive()}
      class="border-2 dark:border-dark-border"
    >
      <GraduationCap class="h-4 w-4" />
      <span class="sr-only">Learn about Model View Loading</span>
    </Button>
  </div>
  {#if isLoadingCapability}
    <div
      class="flex h-full items-center justify-center"
      id="model-view-loading-container"
    >
      <div
        class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
      ></div>
    </div>
  {:else if hasAccess}
    {#if modelStore.isLoading}
      <div
        class="flex h-full items-center justify-center"
        id="model-view-loading-container"
      >
        <p class="text-lg text-muted-foreground">Loading model...</p>
      </div>
    {:else if modelStore.error}
      <div
        class="flex h-full items-center justify-center"
        id="model-view-loading-container"
      >
        <p class="text-lg text-destructive">{modelStore.error}</p>
      </div>
    {:else if modelStore.currentModel}
      <div class="h-full" id="model-view-container">
        <Model modelId={props.modelId} projectId={props.projectId} />
      </div>
    {:else}
      <div
        class="flex h-full items-center justify-center"
        id="model-view-loading-container"
      >
        <p class="text-lg text-muted-foreground">Model not found</p>
      </div>
    {/if}
  {/if}
</div>
