<script lang="ts">
  import type { StepInfo } from "$lib/types/analysis";
  import Check from "lucide-svelte/icons/check";
  import X from "lucide-svelte/icons/x";
  import Loader from "lucide-svelte/icons/loader";
  import ChevronDown from "lucide-svelte/icons/chevron-down";

  interface Props {
    steps: StepInfo[];
    collapsed?: boolean;
  }

  const { steps, collapsed = false }: Props = $props();

  let isCollapsed = $state(collapsed);

  let runningCount = $derived(steps.filter((s) => s.status === "running").length);
  let completedCount = $derived(
    steps.filter((s) => s.status === "success" || s.status === "error").length,
  );
</script>

<div class="rounded-lg border bg-muted/20 text-sm">
  <button
    class="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
    onclick={() => (isCollapsed = !isCollapsed)}
  >
    <div class="flex items-center gap-2 text-muted-foreground">
      {#if runningCount > 0}
        <Loader class="size-3.5 animate-spin text-primary" />
        <span>Running analysis steps ({completedCount}/{steps.length})</span>
      {:else}
        <Check class="size-3.5 text-emerald-500" />
        <span>Completed {completedCount} step{completedCount !== 1 ? "s" : ""}</span>
      {/if}
    </div>
    <ChevronDown
      class="size-4 text-muted-foreground transition-transform {isCollapsed ? '' : 'rotate-180'}"
    />
  </button>

  {#if !isCollapsed}
    <div class="px-3 pb-3 space-y-1">
      {#each steps as step (step.id)}
        <div class="flex items-start gap-2 py-1">
          <div class="mt-0.5">
            {#if step.status === "running"}
              <Loader class="size-3.5 animate-spin text-primary" />
            {:else if step.status === "success"}
              <Check class="size-3.5 text-emerald-500" />
            {:else if step.status === "error"}
              <X class="size-3.5 text-red-500" />
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs {step.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}">
              {step.summary || step.description}
            </div>
            {#if step.duration}
              <div class="text-xs text-muted-foreground/50">
                {step.duration}ms
              </div>
            {/if}
            {#if step.error}
              <div class="text-xs text-red-400 mt-0.5">{step.error}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
