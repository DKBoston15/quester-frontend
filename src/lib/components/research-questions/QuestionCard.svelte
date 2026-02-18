<script lang="ts">
  import type {
    ResearchQuestion,
    ResearchQuestionStatus,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { BookOpen, Plus, ChevronRight, ChevronDown } from "lucide-svelte";
  import { highlightText } from "$lib/utils/highlightText";

  let {
    question,
    selected = false,
    isParent = false,
    isSubQuestion = false,
    expanded = false,
    searchQuery = "",
    onToggleExpand,
    onAddSubQuestion,
    onclick,
  }: {
    question: ResearchQuestion;
    selected?: boolean;
    isParent?: boolean;
    isSubQuestion?: boolean;
    expanded?: boolean;
    searchQuery?: string;
    onToggleExpand?: () => void;
    onAddSubQuestion?: () => void;
    onclick?: () => void;
  } = $props();

  const designTypes = [
    { key: "researchDesign" as const, label: "Research" },
    { key: "samplingDesign" as const, label: "Sampling" },
    { key: "measurementDesign" as const, label: "Measurement" },
    { key: "analyticDesign" as const, label: "Analytic" },
  ] as const;

  function getStatusBadgeVariant(
    status: ResearchQuestionStatus,
  ): "default" | "active" | "archived" {
    switch (status) {
      case "draft":
        return "default";
      case "active":
        return "active";
      case "archived":
        return "archived";
      default:
        return "default";
    }
  }

  function getAlignmentColor(score: number): string {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleToggleExpand(e: MouseEvent) {
    e.stopPropagation();
    onToggleExpand?.();
  }

  function handleAddSubQuestion(e: MouseEvent) {
    e.stopPropagation();
    onAddSubQuestion?.();
  }
</script>

<button
  class="w-full text-left p-3 border-b hover:bg-accent/50 transition-colors {selected
    ? 'bg-accent'
    : ''} {isSubQuestion ? 'pl-8' : ''}"
  {onclick}
>
  <div class="flex items-start justify-between gap-2 mb-1">
    <div class="flex items-start gap-1.5 flex-1 min-w-0">
      {#if isParent}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
          role="button"
          tabindex="-1"
          class="mt-0.5 flex-shrink-0 p-0.5 -ml-1 rounded hover:bg-accent cursor-pointer"
          onclick={handleToggleExpand}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleExpand(e as unknown as MouseEvent); }}
        >
          {#if expanded}
            <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
          {:else}
            <ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
          {/if}
        </span>
      {/if}
      <p class="text-sm line-clamp-2 flex-1 {isParent ? 'font-semibold' : 'font-medium'}">
        {#if searchQuery}
          {@html highlightText(question.question, searchQuery)}
        {:else}
          {question.question}
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-1 flex-shrink-0">
      {#if onAddSubQuestion}
        <Tooltip.Root delayDuration={200}>
          <Tooltip.Trigger>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span
              role="button"
              tabindex="-1"
              class="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              onclick={handleAddSubQuestion}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAddSubQuestion(e as unknown as MouseEvent); }}
            >
              <Plus class="h-3.5 w-3.5" />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-xs">Add Sub-Question</p>
          </Tooltip.Content>
        </Tooltip.Root>
      {/if}
      <Badge
        variant={getStatusBadgeVariant(question.status)}
        class="text-[10px] px-1.5 py-0"
      >
        {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
      </Badge>
    </div>
  </div>

  <div class="flex items-center gap-2 mt-1.5 {isParent ? 'ml-5' : ''}">
    {#if !isParent && question.designAlignmentScore}
      <div class="flex gap-0.5" title="Design alignment">
        {#each designTypes as dt}
          {@const score = question.designAlignmentScore[dt.key]}
          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger>
              <div
                class="w-2 h-2 rounded-full {getAlignmentColor(score)}"
              ></div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="text-xs">{dt.label}: {score}%</p>
            </Tooltip.Content>
          </Tooltip.Root>
        {/each}
      </div>
    {/if}

    {#if question.connectedLiteratureIds.length > 0}
      <span
        class="flex items-center gap-0.5 text-[10px] text-muted-foreground"
      >
        <BookOpen class="h-3 w-3" />
        {question.connectedLiteratureIds.length}
      </span>
    {/if}

    {#if isParent && question.subQuestions?.length}
      <span class="text-[10px] text-muted-foreground">
        {question.subQuestions.length} sub-question{question.subQuestions.length !== 1 ? 's' : ''}
      </span>
    {/if}

    <span class="text-[10px] text-muted-foreground ml-auto">
      {formatDate(question.updatedAt)}
    </span>
  </div>
</button>
