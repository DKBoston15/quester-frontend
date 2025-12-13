<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { auth } from '$lib/stores/AuthStore';
  import { commandCenterStore, type DailyBriefing } from '$lib/stores/CommandCenterStore.svelte';
  import {
    X,
    TrendingUp,
    ChevronRight,
    Sparkles,
    Moon,
    Sun,
    Sunrise,
    History,
  } from 'lucide-svelte';

  interface Props {
    projectId: string;
    onViewHistory?: () => void;
  }

  let { projectId, onViewHistory }: Props = $props();

  let showBriefing = $state(true);
  let dailyBriefing = $derived(commandCenterStore.getDailyBriefing(projectId));
  let briefingLoading = $derived(commandCenterStore.isBriefingLoading(projectId));

  // Load briefing on mount
  $effect(() => {
    if (projectId) {
      loadBriefing();
    }
  });

  async function loadBriefing() {
    const status = await commandCenterStore.checkBriefing(projectId);
    if (status.needsBriefing && !status.cachedBriefing) {
      commandCenterStore.generateBriefing(projectId);
    }
  }

  function getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  function getTimeIcon() {
    const hour = new Date().getHours();
    if (hour < 12) return Sunrise;
    if (hour < 18) return Sun;
    return Moon;
  }

  function dismissBriefing() {
    showBriefing = false;
  }

  function reopenBriefing() {
    showBriefing = true;
  }
</script>

{#if dailyBriefing && showBriefing}
  {@const TimeIcon = getTimeIcon()}
  <Card.Root class="mb-6 overflow-hidden">
    <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 p-6">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-full bg-amber-500/20">
            <TimeIcon class="h-4 w-4 text-amber-500" />
          </div>
          <span class="text-sm font-medium text-amber-600 dark:text-amber-400">
            Good {getTimeOfDay()}, {auth.user?.firstName || 'Researcher'}
          </span>
        </div>
        <div class="flex items-center gap-1">
          {#if onViewHistory}
            <Button
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onclick={onViewHistory}
            >
              <History class="h-3.5 w-3.5 mr-1" />
              History
            </Button>
          {/if}
          <Button variant="ghost" size="sm" class="h-6 w-6 p-0 hover:bg-background/50" onclick={dismissBriefing}>
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Summary -->
      <p class="text-sm text-muted-foreground mb-5">
        {dailyBriefing.changesSummary}
      </p>

      <!-- Detected Patterns -->
      {#if dailyBriefing.detectedPatterns?.length}
        <div class="mb-5">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Patterns Detected
          </h4>
          <div class="space-y-2">
            {#each dailyBriefing.detectedPatterns.slice(0, 2) as pattern}
              <div class="flex items-start gap-2 text-sm">
                <TrendingUp class="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span class="text-muted-foreground">{pattern}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Suggested Actions -->
      {#if dailyBriefing.suggestedActions?.length}
        <div>
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles class="h-3.5 w-3.5 text-amber-500" />
            Suggested for Today
          </h4>
          <div class="space-y-2">
            {#each dailyBriefing.suggestedActions.slice(0, 3) as action}
              <div class="flex items-start gap-2 p-3 rounded-lg bg-background/60 text-left">
                <span class="text-muted-foreground/50">•</span>
                <span class="text-sm text-foreground/80">{action.action}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Footer Actions -->
      <div class="flex items-center justify-end mt-5 pt-4 border-t border-border/50">
        <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-foreground" onclick={dismissBriefing}>
          Dismiss
        </Button>
      </div>
    </div>
  </Card.Root>
{:else if briefingLoading}
  <Card.Root class="mb-6">
    <Card.Content class="p-6">
      <div class="flex items-center gap-3">
        <Skeleton class="h-8 w-8 rounded-full" />
        <div class="space-y-2 flex-1">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="h-3 w-3/4" />
        </div>
      </div>
    </Card.Content>
  </Card.Root>
{:else if dailyBriefing && !showBriefing}
  {@const TimeIcon = getTimeIcon()}
  <!-- Collapsed briefing indicator -->
  <button
    class="mb-6 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-sm text-amber-600 dark:text-amber-400"
    onclick={reopenBriefing}
  >
    <TimeIcon class="h-4 w-4" />
    <span>View your daily briefing</span>
    <ChevronRight class="h-4 w-4" />
  </button>
{/if}
