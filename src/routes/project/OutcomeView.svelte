<script lang="ts">
  import { onMount } from "svelte";
  import { outcomeStore } from "$lib/stores/OutcomeStore";
  import OutcomeEditor from "$lib/components/outcomes/OutcomeEditor.svelte";

  const props = $props<{
    outcomeId: string;
    projectId: string;
  }>();

  onMount(async () => {
    await outcomeStore.loadOutcome(props.outcomeId);
  });
</script>

<div class="h-full">
  {#if outcomeStore.isLoading}
    <div class="flex h-full items-center justify-center">
      <p class="text-lg text-muted-foreground">Loading outcome...</p>
    </div>
  {:else if outcomeStore.error}
    <div class="flex h-full items-center justify-center">
      <p class="text-lg text-destructive">{outcomeStore.error}</p>
    </div>
  {:else if outcomeStore.currentOutcome}
    <OutcomeEditor
      outcome={outcomeStore.currentOutcome}
      onDelete={async () => {
        await outcomeStore.deleteOutcome(props.outcomeId);
        window.history.back();
      }}
    />
  {:else}
    <div class="flex h-full items-center justify-center">
      <p class="text-lg text-muted-foreground">Outcome not found</p>
    </div>
  {/if}
</div>
