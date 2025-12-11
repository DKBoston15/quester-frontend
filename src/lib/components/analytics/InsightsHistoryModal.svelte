<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Badge } from "$lib/components/ui/badge";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { insightsStore } from "$lib/stores/InsightsStore";
  import {
    Calendar,
    History,
    RefreshCw,
    TrendingUp,
    Brain,
    AlertTriangle,
  } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  interface Props {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { projectId, open, onOpenChange }: Props = $props();

  // Reactive state from store
  let historicalInsights = $derived(
    insightsStore.getHistoricalInsights(projectId)
  );
  let isLoading = $derived(insightsStore.isHistoryLoading(projectId));

  // Load historical insights when modal opens
  $effect(() => {
    if (open && projectId) {
      insightsStore.loadHistoricalInsights(projectId);
    }
  });

  // Format date for display
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Format relative date
  function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return get(_)('insights.relativeDate.today');
    if (diffDays === 1) return get(_)('insights.relativeDate.yesterday');
    if (diffDays < 7) return get(_)('insights.relativeDate.daysAgo', { values: { count: diffDays } });
    if (diffDays < 30) return get(_)('insights.relativeDate.weeksAgo', { values: { count: Math.floor(diffDays / 7) } });
    if (diffDays < 365) return get(_)('insights.relativeDate.monthsAgo', { values: { count: Math.floor(diffDays / 30) } });
    return get(_)('insights.relativeDate.yearsAgo', { values: { count: Math.floor(diffDays / 365) } });
  }

  // Map insight types to visual properties (matching InsightCard component)
  const insightConfig = $derived.by(() => ({
    research_focus: {
      icon: TrendingUp,
      label: $_('insights.types.researchFocus'),
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      textColor: "text-blue-700 dark:text-blue-300",
      borderColor: "border-l-blue-500",
    },
    content_analysis: {
      icon: Brain,
      label: $_('insights.types.contentAnalysis'),
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      textColor: "text-purple-700 dark:text-purple-300",
      borderColor: "border-l-purple-500",
    },
    research_gaps: {
      icon: AlertTriangle,
      label: $_('insights.types.researchGaps'),
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      textColor: "text-amber-700 dark:text-amber-300",
      borderColor: "border-l-amber-500",
    },
  }));

  function getInsightConfig(type: string) {
    return (
      insightConfig[type] || {
        icon: Brain,
        label: $_('insights.types.insight'),
        color: "bg-gray-500",
        bgColor: "bg-gray-50 dark:bg-gray-950/20",
        textColor: "text-gray-700 dark:text-gray-300",
        borderColor: "border-l-gray-500",
      }
    );
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-4xl max-h-[80vh]">
    <Dialog.Header class="pb-4">
      <div class="flex items-center gap-3">
        <div
          class="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
        >
          <History class="h-5 w-5" />
        </div>
        <div>
          <Dialog.Title class="text-xl font-semibold"
            >{$_('insights.history.title')}</Dialog.Title
          >
          <Dialog.Description>
            {$_('insights.history.description')}
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>

    <ScrollArea class="h-[60vh] pr-4">
      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <RefreshCw
              class="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground"
            />
            <p class="text-sm text-muted-foreground">
              {$_('insights.history.loading')}
            </p>
          </div>
        </div>
      {:else if historicalInsights.length === 0}
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <Calendar class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 class="text-lg font-medium mb-2">{$_('insights.history.emptyHeading')}</h3>
            <p class="text-sm text-muted-foreground">
              {$_('insights.history.emptyDescription')}
            </p>
          </div>
        </div>
      {:else}
        <div class="space-y-6">
          {#each historicalInsights as { date, insights }}
            <div class="border rounded-lg p-4 bg-card">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <Calendar class="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h3 class="font-semibold">{formatDate(date)}</h3>
                    <p class="text-xs text-muted-foreground">
                      {formatRelativeDate(date)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" class="text-xs">
                  {insights.length !== 1
                    ? $_('insights.history.insightsCount', { values: { count: insights.length } })
                    : $_('insights.history.insightCount', { values: { count: insights.length } })}
                </Badge>
              </div>

              <div class="grid gap-3 grid-cols-1 lg:grid-cols-2">
                {#each insights as insight}
                  {@const config = getInsightConfig(insight.type)}
                  <div
                    class={`border rounded-lg p-3 ${config.bgColor} border-l-4 ${config.borderColor}`}
                  >
                    <div class="flex items-center gap-2 mb-3">
                      <div
                        class={`p-1.5 rounded-lg ${config.color} text-white`}
                      >
                        <config.icon class="h-3 w-3" />
                      </div>
                      <div>
                        <Badge
                          variant="secondary"
                          class={`text-xs ${config.textColor}`}
                        >
                          {config.label}
                        </Badge>
                        <Badge variant="outline" class="ml-2 text-xs">
                          {Math.round(insight.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <p
                      class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3"
                    >
                      {insight.content}
                    </p>
                    {#if insight.dataPoints.length > 0}
                      <div class="border-t pt-2">
                        <p
                          class="text-xs font-medium text-muted-foreground mb-2"
                        >
                          {$_('insights.supportingData')}
                        </p>
                        <div class="flex flex-wrap gap-1">
                          {#each insight.dataPoints as dataPoint}
                            <Badge variant="outline" class="text-xs">
                              {dataPoint}
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </ScrollArea>

    <Dialog.Footer class="pt-4">
      <Button variant="outline" onclick={() => onOpenChange(false)}>
        {$_('common.close')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
