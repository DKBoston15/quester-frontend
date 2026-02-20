<script lang="ts">
  import type { MetricBlock as MetricBlockType } from "$lib/types/analysis";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import TrendingDown from "lucide-svelte/icons/trending-down";

  interface Props {
    block: MetricBlockType;
  }

  const { block }: Props = $props();

  function isPositiveChange(change: string | number | undefined): boolean {
    if (change === undefined) return false;
    const num = typeof change === "string" ? parseFloat(change) : change;
    return num > 0;
  }

  function isNegativeChange(change: string | number | undefined): boolean {
    if (change === undefined) return false;
    const num = typeof change === "string" ? parseFloat(change) : change;
    return num < 0;
  }
</script>

<div class="grid gap-3 {block.metrics.length <= 2 ? 'grid-cols-2' : block.metrics.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}">
  {#each block.metrics as metric}
    <div class="rounded-lg border bg-card p-4">
      <div class="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {metric.label}
      </div>
      <div class="mt-1 flex items-baseline gap-1.5">
        <span class="text-2xl font-bold tabular-nums">{metric.value}</span>
        {#if metric.unit}
          <span class="text-sm text-muted-foreground">{metric.unit}</span>
        {/if}
      </div>
      {#if metric.change !== undefined}
        <div class="mt-1 flex items-center gap-1 text-xs {isPositiveChange(metric.change) ? 'text-emerald-600 dark:text-emerald-400' : isNegativeChange(metric.change) ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}">
          {#if isPositiveChange(metric.change)}
            <TrendingUp class="size-3" />
          {:else if isNegativeChange(metric.change)}
            <TrendingDown class="size-3" />
          {/if}
          {metric.change}
        </div>
      {/if}
      {#if metric.description}
        <div class="mt-1 text-xs text-muted-foreground">
          {metric.description}
        </div>
      {/if}
    </div>
  {/each}
</div>
