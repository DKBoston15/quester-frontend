<!-- src/routes/project/ModelView.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import Model from "$lib/components/model/Model.svelte";

  const props = $props<{
    modelId: string;
    projectId: string;
  }>();

  onMount(async () => {
    await modelStore.loadModel(props.modelId);
  });
</script>

<div class="h-full">
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
</div>
