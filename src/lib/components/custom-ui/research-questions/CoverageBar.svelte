<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { CoverageBreakdown } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';

  interface Props {
    coverage: number;
    breakdown?: CoverageBreakdown;
    size?: 'sm' | 'md';
    showLabel?: boolean;
  }

  let { coverage, breakdown, size = 'md', showLabel = true }: Props = $props();

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
  };

  // Color based on coverage level
  const getBarColor = (pct: number): string => {
    if (pct >= 70) return 'bg-emerald-500';
    if (pct >= 30) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const barColor = $derived(getBarColor(coverage));
  const heightClass = $derived(heights[size]);
</script>

<Tooltip.Root>
  <Tooltip.Trigger class="w-full cursor-default">
    <div class="w-full">
      <div
        class="w-full rounded-full overflow-hidden {heightClass} bg-white/10"
      >
        {#if breakdown}
          <!-- Segmented bar showing direct and related -->
          <div class="h-full flex">
            <div
              class="{barColor} h-full transition-all duration-300"
              style="width: {breakdown.direct}%"
            ></div>
            <div
              class="{barColor} opacity-60 h-full transition-all duration-300"
              style="width: {breakdown.related}%"
            ></div>
          </div>
        {:else}
          <!-- Simple progress bar -->
          <div
            class="{barColor} h-full transition-all duration-300"
            style="width: {coverage}%"
          ></div>
        {/if}
      </div>
      {#if showLabel}
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-zinc-400">{coverage}% {$_('researchQuestions.coverage')}</span>
        </div>
      {/if}
    </div>
  </Tooltip.Trigger>
  <Tooltip.Content class="bg-zinc-900 border-zinc-700 p-3 max-w-xs">
    <div class="space-y-2">
      <p class="text-sm font-medium text-zinc-100">
        {$_('researchQuestions.coverageBreakdown')}
      </p>
      {#if breakdown}
        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-4 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full {barColor}"></div>
              <span class="text-zinc-300">{$_('researchQuestions.directEvidence')}</span>
            </div>
            <span class="text-zinc-100 font-medium flex-shrink-0">{breakdown.direct}%</span>
          </div>
          <div class="flex items-center justify-between gap-4 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full {barColor} opacity-60"></div>
              <span class="text-zinc-300">{$_('researchQuestions.relatedDiscussion')}</span>
            </div>
            <span class="text-zinc-100 font-medium flex-shrink-0">{breakdown.related}%</span>
          </div>
          <div class="flex items-center justify-between gap-4 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-zinc-600"></div>
              <span class="text-zinc-300">{$_('researchQuestions.gap')}</span>
            </div>
            <span class="text-zinc-100 font-medium flex-shrink-0">{breakdown.gap}%</span>
          </div>
        </div>
      {:else}
        <p class="text-xs text-zinc-400">
          {$_('researchQuestions.totalCoverage')}: {coverage}%
        </p>
      {/if}
    </div>
  </Tooltip.Content>
</Tooltip.Root>
