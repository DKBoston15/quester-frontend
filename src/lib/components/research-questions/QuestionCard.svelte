<script lang="ts">
  import type {
    ResearchQuestion,
    ResearchQuestionStatus,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { BookOpen } from "lucide-svelte";

  let {
    question,
    selected = false,
    onclick,
  }: {
    question: ResearchQuestion;
    selected?: boolean;
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
</script>

<button
  class="w-full text-left p-3 border-b hover:bg-accent/50 transition-colors {selected
    ? 'bg-accent'
    : ''}"
  {onclick}
>
  <div class="flex items-start justify-between gap-2 mb-1">
    <p class="text-sm font-medium line-clamp-2 flex-1">
      {question.question}
    </p>
    <Badge
      variant={getStatusBadgeVariant(question.status)}
      class="text-[10px] px-1.5 py-0 flex-shrink-0"
    >
      {question.status}
    </Badge>
  </div>

  <div class="flex items-center gap-2 mt-1.5">
    {#if question.designAlignmentScore}
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

    <span class="text-[10px] text-muted-foreground ml-auto">
      {formatDate(question.updatedAt)}
    </span>
  </div>
</button>
