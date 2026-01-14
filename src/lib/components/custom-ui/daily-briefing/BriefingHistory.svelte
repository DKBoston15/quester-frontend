<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { commandCenterStore, type HistoricalBriefing } from '$lib/stores/CommandCenterStore.svelte';
  import { Calendar, TrendingUp, Sparkles, ChevronRight, X } from 'lucide-svelte';
  import { formatDistanceToNow, format } from 'date-fns';

  interface Props {
    open: boolean;
    projectId: string;
    onClose: () => void;
  }

  let { open = $bindable(), projectId, onClose }: Props = $props();

  let briefings = $state<HistoricalBriefing[]>([]);
  let isLoading = $state(false);
  let selectedBriefing = $state<HistoricalBriefing | null>(null);
  let dialogOpen = $state(false);

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

  function openBriefingDialog(briefing: HistoricalBriefing) {
    selectedBriefing = briefing;
    dialogOpen = true;
  }

  function closeBriefingDialog() {
    dialogOpen = false;
    selectedBriefing = null;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return format(date, 'EEEE, MMMM d, yyyy');
  }

  function formatShortDate(dateStr: string): string {
    const date = new Date(dateStr);
    return format(date, 'MMM d, yyyy');
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
        <div class="space-y-2">
          {#each briefings as briefing (briefing.id)}
            <button
              class="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04] hover:border-amber-500/20 transition-all group"
              onclick={() => openBriefingDialog(briefing)}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-foreground">
                      {formatShortDate(briefing.date)}
                    </span>
                    <span class="text-xs text-muted-foreground">
                      {getRelativeDate(briefing.date)}
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground line-clamp-2">
                    {briefing.changesSummary}
                  </p>
                  {#if briefing.detectedPatterns?.length || briefing.suggestedActions?.length}
                    <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                      {#if briefing.detectedPatterns?.length}
                        <span class="flex items-center gap-1">
                          <TrendingUp class="h-3 w-3 text-emerald-500/60" />
                          {briefing.detectedPatterns.length} pattern{briefing.detectedPatterns.length !== 1 ? 's' : ''}
                        </span>
                      {/if}
                      {#if briefing.suggestedActions?.length}
                        <span class="flex items-center gap-1">
                          <Sparkles class="h-3 w-3 text-amber-500/60" />
                          {briefing.suggestedActions.length} action{briefing.suggestedActions.length !== 1 ? 's' : ''}
                        </span>
                      {/if}
                    </div>
                  {/if}
                </div>
                <ChevronRight
                  class="h-4 w-4 text-muted-foreground/40 flex-shrink-0 ml-2 group-hover:text-amber-500 transition-colors"
                />
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

<!-- Briefing Detail Dialog -->
<Dialog.Root bind:open={dialogOpen} onOpenChange={(isOpen) => !isOpen && closeBriefingDialog()}>
  <Dialog.Content class="sm:max-w-[550px] p-0 overflow-hidden">
    {#if selectedBriefing}
      <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 p-6">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-full bg-amber-500/20">
              <Calendar class="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <span class="text-sm font-medium text-amber-600 dark:text-amber-400">
                {formatDate(selectedBriefing.date)}
              </span>
              <span class="text-xs text-muted-foreground ml-2">
                {getRelativeDate(selectedBriefing.date)}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" class="h-6 w-6 p-0 hover:bg-background/50" onclick={closeBriefingDialog}>
            <X class="h-4 w-4" />
          </Button>
        </div>

        <!-- Summary -->
        <p class="text-sm text-muted-foreground mb-5">
          {selectedBriefing.changesSummary}
        </p>

        <!-- Detected Patterns -->
        {#if selectedBriefing.detectedPatterns?.length}
          <div class="mb-5">
            <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Patterns Detected
            </h4>
            <div class="space-y-2">
              {#each selectedBriefing.detectedPatterns as pattern}
                <div class="flex items-start gap-2 text-sm">
                  <TrendingUp class="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span class="text-muted-foreground">{pattern}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Suggested Actions -->
        {#if selectedBriefing.suggestedActions?.length}
          <div>
            <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles class="h-3.5 w-3.5 text-amber-500" />
              Suggested Actions
            </h4>
            <div class="space-y-2">
              {#each selectedBriefing.suggestedActions as action}
                <div class="flex items-start gap-2 p-3 rounded-lg bg-background/60 text-left">
                  <span class="text-muted-foreground/50">•</span>
                  <span class="text-sm text-foreground/80">{action.action}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
