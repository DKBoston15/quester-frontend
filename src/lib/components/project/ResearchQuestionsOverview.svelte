<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Badge } from "$lib/components/ui/badge";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    researchQuestionsStore,
    type ResearchQuestion,
    type DesignAlignmentScore,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { navigate } from "svelte-routing";
  import { HelpCircle, ArrowRight } from "lucide-svelte";
  import { _ } from "svelte-i18n";

  const designTypes = [
    { key: "researchDesign" as const, label: "Research" },
    { key: "samplingDesign" as const, label: "Sampling" },
    { key: "measurementDesign" as const, label: "Measurement" },
    { key: "analyticDesign" as const, label: "Analytic" },
  ] as const;

  let activeQuestions = $derived(
    researchQuestionsStore.allQuestions.filter((q) => q.status === "active"),
  );

  let topQuestions = $derived(activeQuestions.slice(0, 3));

  let totalCount = $derived(activeQuestions.length);

  function getAlignmentColor(score: number): string {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + "...";
  }

  function viewAll() {
    const projectId = projectStore.currentProject?.id;
    if (projectId) {
      navigate(`/project/${projectId}/research_questions`);
    }
  }

  $effect(() => {
    const projectId = projectStore.currentProject?.id;
    if (projectId && researchQuestionsStore.allQuestions.length === 0 && !researchQuestionsStore.isLoading) {
      researchQuestionsStore.loadQuestions(projectId);
    }
  });
</script>

<Card.Root id="research-questions-overview-card">
  <Card.Header class="pb-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Card.Title>{$_("overview.researchQuestions.title")}</Card.Title>
        {#if totalCount > 0}
          <Badge variant="secondary" class="text-xs">{totalCount}</Badge>
        {/if}
      </div>
      <button
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onclick={viewAll}
      >
        {$_("overview.researchQuestions.viewAll")}
        <ArrowRight class="h-3.5 w-3.5" />
      </button>
    </div>
  </Card.Header>
  <Card.Content>
    {#if researchQuestionsStore.isLoading}
      <p class="text-sm text-muted-foreground">{$_("common.loading")}</p>
    {:else if topQuestions.length === 0}
      <EmptyState
        title={$_("overview.researchQuestions.empty")}
        description={$_("overview.researchQuestions.addFirst")}
        variant="data-empty"
        ctaText={$_("overview.researchQuestions.addQuestion")}
        ctaAction={viewAll}
        icon={HelpCircle}
        height="h-auto"
      />
    {:else}
      <div class="space-y-3">
        {#each topQuestions as question (question.id)}
          <div class="flex items-start gap-3 group">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium line-clamp-2">
                {truncateText(question.question, 120)}
              </p>
            </div>
            {#if question.designAlignmentScore}
              <div class="flex gap-0.5 flex-shrink-0 mt-1" title="Design alignment">
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
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
