<script lang="ts">
  import { FileText, AlertTriangle, RefreshCw, MoreHorizontal, Pencil, Trash2 } from 'lucide-svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';
  import CoverageBar from './CoverageBar.svelte';
  import type { ResearchQuestion } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';

  interface Props {
    question: ResearchQuestion;
    variant?: 'compact' | 'standard';
    isRecalculating?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onRecalculate?: () => void;
    onclick?: () => void;
  }

  let {
    question,
    variant = 'standard',
    isRecalculating = false,
    onEdit,
    onDelete,
    onRecalculate,
    onclick,
  }: Props = $props();

  const priorityLabels = ['Low', 'Medium', 'High'];
  const priorityColors = [
    'bg-zinc-600 text-zinc-200',
    'bg-amber-600/20 text-amber-400',
    'bg-red-600/20 text-red-400',
  ];

  const statusColors: Record<string, string> = {
    open: 'bg-blue-600/20 text-blue-400',
    addressed: 'bg-emerald-600/20 text-emerald-400',
    blocked: 'bg-red-600/20 text-red-400',
  };

  // Truncate question text for compact view
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
</script>

{#if variant === 'compact'}
  <!-- Compact variant for card view -->
  <button
    type="button"
    class="w-full text-left p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    onclick={onclick}
  >
    <div class="flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-sm text-zinc-200 truncate">{question.questionText}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs text-zinc-500">
            <FileText class="w-3 h-3 inline mr-1" />
            {question.coveragePct}%
          </span>
          {#if question.hasConflicts}
            <span class="text-xs text-amber-400">
              <AlertTriangle class="w-3 h-3 inline" />
            </span>
          {/if}
        </div>
      </div>
      <div class="w-24 flex-shrink-0">
        <CoverageBar
          coverage={question.coveragePct}
          breakdown={question.coverageBreakdown}
          size="sm"
          showLabel={false}
        />
      </div>
    </div>
  </button>
{:else}
  <!-- Standard variant for panel view -->
  <div
    class="group p-4 rounded-xl border border-white/[0.06] bg-[#111214] hover:bg-white/[0.02] transition-colors cursor-pointer"
    role="button"
    tabindex="0"
    onclick={onclick}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onclick?.();
      }
    }}
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <p class="text-sm text-zinc-100 font-medium leading-relaxed">
          {question.questionText}
        </p>

        <div class="mt-3">
          <CoverageBar
            coverage={question.coveragePct}
            breakdown={question.coverageBreakdown}
            size="md"
            showLabel={false}
          />
        </div>

        <div class="flex items-center gap-2 mt-2 flex-wrap">
          <span class="text-xs text-zinc-400">
            {question.coveragePct}% {$_('researchQuestions.coverage')}
          </span>

          {#if question.coveragePct > 0}
            <span class="text-xs text-zinc-500">·</span>
            <span class="text-xs text-zinc-400">
              <FileText class="w-3 h-3 inline mr-1" />
              {$_('researchQuestions.sources')}
            </span>
          {/if}

          {#if question.hasConflicts}
            <span class="text-xs text-zinc-500">·</span>
            <span class="text-xs text-amber-400">
              <AlertTriangle class="w-3 h-3 inline mr-1" />
              {question.conflictCount} {$_('researchQuestions.conflicts')}
            </span>
          {/if}

          {#if question.status !== 'open'}
            <span
              class="text-[10px] px-1.5 py-0.5 rounded {statusColors[question.status]}"
            >
              {$_(`researchQuestions.status.${question.status}`)}
            </span>
          {/if}

          {#if question.priority > 0}
            <span
              class="text-[10px] px-1.5 py-0.5 rounded {priorityColors[question.priority]}"
            >
              {$_(`researchQuestions.priority.${priorityLabels[question.priority].toLowerCase()}`)}
            </span>
          {/if}
        </div>
      </div>

      <!-- Actions dropdown -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          onclick={(e: MouseEvent) => e.stopPropagation()}
        >
          {#if isRecalculating}
            <RefreshCw class="h-4 w-4 animate-spin" />
          {:else}
            <MoreHorizontal class="h-4 w-4" />
          {/if}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-48">
          <DropdownMenu.Item
            onclick={(e) => {
              e.stopPropagation();
              onRecalculate?.();
            }}
            disabled={isRecalculating}
          >
            <RefreshCw class="h-4 w-4 mr-2" />
            {$_('researchQuestions.recalculate')}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          >
            <Pencil class="h-4 w-4 mr-2" />
            {$_('researchQuestions.edit')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            class="text-red-400 focus:text-red-400"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {$_('researchQuestions.delete')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>
{/if}
