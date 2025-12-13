<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import {
    Clock,
    PenLine,
    RefreshCw,
    Plus,
    Minus,
    CheckCircle,
    Sparkles,
    FileText,
  } from 'lucide-svelte';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { HistoryEntry, HistoryChangeType } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';

  interface Props {
    questionId: string;
  }

  let { questionId }: Props = $props();

  let history = $state<HistoryEntry[]>([]);
  let isLoading = $state(false);

  // Load history on mount
  $effect(() => {
    loadHistory();
  });

  const loadHistory = async () => {
    isLoading = true;
    history = await researchQuestionsStore.loadHistory(questionId);
    isLoading = false;
  };

  const changeTypeConfig: Record<
    HistoryChangeType,
    { icon: any; label: string; color: string }
  > = {
    created: { icon: Plus, label: 'Created', color: 'text-emerald-400' },
    text_updated: { icon: PenLine, label: 'Text Updated', color: 'text-blue-400' },
    coverage_recalculated: { icon: RefreshCw, label: 'Coverage Recalculated', color: 'text-purple-400' },
    source_added: { icon: Plus, label: 'Source Added', color: 'text-emerald-400' },
    source_removed: { icon: Minus, label: 'Source Removed', color: 'text-red-400' },
    status_changed: { icon: CheckCircle, label: 'Status Changed', color: 'text-amber-400' },
    analysis_completed: { icon: Sparkles, label: 'Analysis Completed', color: 'text-cyan-400' },
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-zinc-500';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };
</script>

<div class="space-y-4">
  {#if isLoading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <Skeleton class="h-20 w-full" />
      {/each}
    </div>
  {:else if history.length === 0}
    <div class="text-center py-6">
      <Clock class="h-8 w-8 text-zinc-500 mx-auto mb-2" />
      <p class="text-sm text-zinc-400">{$_('researchQuestions.noHistoryYet')}</p>
    </div>
  {:else}
    <!-- Timeline -->
    <div class="relative">
      <!-- Vertical line -->
      <div class="absolute left-3 top-0 bottom-0 w-px bg-white/[0.06]"></div>

      <div class="space-y-4">
        {#each history as entry, index}
          {@const config = changeTypeConfig[entry.changeType || 'created']}
          <div class="relative pl-8">
            <!-- Timeline dot -->
            <div
              class="absolute left-0 top-2 w-6 h-6 rounded-full bg-zinc-900 border border-white/[0.1] flex items-center justify-center"
            >
              <svelte:component this={config.icon} class="h-3 w-3 {config.color}" />
            </div>

            <!-- Entry card -->
            <div class="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium {config.color}">{config.label}</span>
                  <span class="text-xs text-zinc-500">{formatRelativeTime(entry.recordedAt)}</span>
                </div>
                {#if entry.coveragePct !== undefined}
                  <Badge variant="outline" class="text-xs">
                    Coverage: {entry.coveragePct}%
                  </Badge>
                {/if}
              </div>

              <!-- Entry details based on change type -->
              {#if entry.changeType === 'text_updated' && entry.changeMetadata?.previousText}
                <div class="text-xs space-y-1">
                  <p class="text-zinc-500">
                    <span class="text-red-400/60 line-through">
                      {entry.changeMetadata.previousText.substring(0, 100)}...
                    </span>
                  </p>
                  <p class="text-zinc-300">
                    {entry.questionText?.substring(0, 100) || ''}...
                  </p>
                </div>
              {:else if entry.changeType === 'status_changed' && entry.changeMetadata}
                <p class="text-xs text-zinc-400">
                  Status changed from
                  <Badge variant="outline" class="text-xs mx-1">
                    {entry.changeMetadata.previousStatus}
                  </Badge>
                  to
                  <Badge variant="outline" class="text-xs mx-1">
                    {entry.changeMetadata.newStatus}
                  </Badge>
                </p>
              {:else if entry.changeType === 'source_added' && entry.changeMetadata}
                <p class="text-xs text-zinc-400">
                  <FileText class="h-3 w-3 inline-block mr-1" />
                  Added {entry.changeMetadata.sourceType} source
                </p>
              {:else if entry.changeType === 'analysis_completed' && entry.designAlignmentScore !== null}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-400">Design Alignment Score:</span>
                  <span class="text-sm font-medium {getScoreColor(entry.designAlignmentScore)}">
                    {entry.designAlignmentScore}%
                  </span>
                </div>
              {:else if entry.changeType === 'coverage_recalculated'}
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span class="text-zinc-500">Direct:</span>
                    <span class="text-emerald-400 ml-1">{entry.coverageBreakdown?.direct || 0}%</span>
                  </div>
                  <div>
                    <span class="text-zinc-500">Related:</span>
                    <span class="text-amber-400 ml-1">{entry.coverageBreakdown?.related || 0}%</span>
                  </div>
                  <div>
                    <span class="text-zinc-500">Sources:</span>
                    <span class="text-zinc-300 ml-1">{entry.sourceCount}</span>
                  </div>
                </div>
              {/if}

              <!-- Timestamp on hover -->
              <p class="text-[10px] text-zinc-600 mt-2" title={entry.recordedAt}>
                {formatDate(entry.recordedAt)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
