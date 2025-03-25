<!-- src/routes/project/ModelView.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import Model from "$lib/components/model/Model.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";

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
        "http://localhost:3333/capabilities/model_access",
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check model access capability");
      }

      const data = await response.json();
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to dashboard
      if (!hasAccess) {
        console.warn("User attempted to access Model view without permission");
        if (props.projectId) {
          navigate(`/project/${props.projectId}/dashboard`);
        } else {
          navigate("/dashboard");
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check model access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/dashboard");
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
</script>

<div class="h-full">
  {#if isLoadingCapability}
    <div class="flex h-full items-center justify-center">
      <div
        class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
      ></div>
    </div>
  {:else if hasAccess}
    {#if modelStore.isLoading}
      <div class="flex h-full items-center justify-center">
        <p class="text-lg text-muted-foreground">Loading model...</p>
      </div>
    {:else if modelStore.error}
      <div class="flex h-full items-center justify-center">
        <p class="text-lg text-destructive">{modelStore.error}</p>
      </div>
    {:else if modelStore.currentModel}
      <Model modelId={props.modelId} projectId={props.projectId} />
    {:else}
      <div class="flex h-full items-center justify-center">
        <p class="text-lg text-muted-foreground">Model not found</p>
      </div>
    {/if}
  {/if}
</div>
