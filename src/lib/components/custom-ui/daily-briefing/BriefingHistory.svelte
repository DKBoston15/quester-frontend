<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Collapsible from '$lib/components/ui/collapsible';
  import { commandCenterStore, type HistoricalBriefing } from '$lib/stores/CommandCenterStore.svelte';
  import { Calendar, TrendingUp, Sparkles, ChevronDown } from 'lucide-svelte';
  import { formatDistanceToNow, format } from 'date-fns';

  interface Props {
    open: boolean;
    projectId: string;
    onClose: () => void;
  }

  let { open = $bindable(), projectId, onClose }: Props = $props();

  let briefings = $state<HistoricalBriefing[]>([]);
  let isLoading = $state(false);
  let expandedId = $state<string | null>(null);

  $effect(() => {
    if (open && projectId) {
      loadHistory();
    }
  });

  async function loadHistory() {
    isLoading = true;
    briefings = await commandCenterStore.getBriefingHistory(projectId);
    isLoading = false;
  }

  function toggleExpanded(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return format(date, 'EEEE, MMMM d, yyyy');
  }

  function getRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  }
</script>

<Sheet.Root bind:open onOpenChange={(isOpen) => !isOpen && onClose()}>
  <Sheet.Content side="right" class="w-[450px] sm:max-w-[450px] !p-0 flex flex-col">
    <Sheet.Header class="px-6 py-4 border-b border-white/[0.06] shrink-0">
      <Sheet.Title class="text-lg font-semibold flex items-center gap-2">
        <Calendar class="h-5 w-5 text-amber-500" />
        Briefing History
      </Sheet.Title>
      <Sheet.Description class="text-sm text-muted-foreground">
        Your past daily briefings for this project
      </Sheet.Description>
    </Sheet.Header>

    <div class="flex-1 overflow-y-auto p-4">
      {#if isLoading}
        <div class="space-y-4">
          {#each Array(3) as _}
            <div class="p-4 rounded-lg border border-white/[0.06] space-y-2">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-3/4" />
            </div>
          {/each}
        </div>
      {:else if briefings.length === 0}
        <div class="text-center py-12">
          <Calendar class="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p class="text-muted-foreground">No briefing history yet</p>
          <p class="text-sm text-muted-foreground/60 mt-1">
            Briefings will appear here as you use the app
          </p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each briefings as briefing (briefing.id)}
            <Collapsible.Root open={expandedId === briefing.id}>
              <div class="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <Collapsible.Trigger
                  class="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
                  onclick={() => toggleExpanded(briefing.id)}
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium text-foreground">
                          {formatDate(briefing.date)}
                        </span>
                        <span class="text-xs text-muted-foreground">
                          {getRelativeDate(briefing.date)}
                        </span>
                      </div>
                      <p class="text-sm text-muted-foreground line-clamp-2">
                        {briefing.changesSummary}
                      </p>
                    </div>
                    <ChevronDown
                      class="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 transition-transform {expandedId === briefing.id ? 'rotate-180' : ''}"
                    />
                  </div>
                </Collapsible.Trigger>

                <Collapsible.Content>
                  <div class="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-4">
                    <!-- Full Summary -->
                    <div>
                      <p class="text-sm text-foreground/80">
                        {briefing.changesSummary}
                      </p>
                    </div>

                    <!-- Patterns -->
                    {#if briefing.detectedPatterns?.length}
                      <div>
                        <h5 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Patterns Detected
                        </h5>
                        <div class="space-y-1.5">
                          {#each briefing.detectedPatterns as pattern}
                            <div class="flex items-start gap-2 text-sm">
                              <TrendingUp class="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span class="text-muted-foreground">{pattern}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <!-- Suggested Actions -->
                    {#if briefing.suggestedActions?.length}
                      <div>
                        <h5 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Sparkles class="h-3 w-3 text-amber-500" />
                          Suggested Actions
                        </h5>
                        <div class="space-y-1.5">
                          {#each briefing.suggestedActions as action}
                            <div class="flex items-start gap-2 text-sm">
                              <span class="text-muted-foreground/50 mt-0.5">•</span>
                              <span class="text-muted-foreground">{action.action}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                </Collapsible.Content>
              </div>
            </Collapsible.Root>
          {/each}
        </div>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
