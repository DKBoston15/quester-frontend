<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import * as Card from "$lib/components/ui/card";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    Crosshair,
    RefreshCw,
    AlertTriangle,
    Lightbulb,
    Settings,
  } from "lucide-svelte";

  let {
    question,
  }: {
    question: ResearchQuestion;
  } = $props();

  let isAnalyzing = $state(false);

  let purposeAlignment = $derived(
    question.metadata?.purposeAlignment as
      | { score: number; explanation: string; gaps: string[]; suggestions: string[] }
      | undefined,
  );

  let projectHasPurpose = $derived(!!projectStore.currentProject?.purpose);

  function getAlignmentColor(score: number): string {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getAlignmentTextColor(score: number): string {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  function getAlignmentLabel(score: number): string {
    if (score >= 70) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  }

  async function handleAnalyze() {
    isAnalyzing = true;
    try {
      await researchQuestionsStore.analyzePurposeAlignment(question.id);
    } finally {
      isAnalyzing = false;
    }
  }

  function handleSetPurpose() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;
    sessionStorage.setItem("overview_active_tab", "details");
    navigate(`/project/${projectId}/overview`);
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Purpose Alignment</h3>
    <Button
      variant="outline"
      size="sm"
      onclick={handleAnalyze}
      disabled={isAnalyzing || !projectHasPurpose}
    >
      <RefreshCw
        class="h-3.5 w-3.5 mr-1.5 {isAnalyzing ? 'animate-spin' : ''}"
      />
      {isAnalyzing ? "Analyzing..." : "Analyze"}
    </Button>
  </div>

  {#if !projectHasPurpose}
    <EmptyState
      title="No project purpose set"
      description="Set a purpose for your project to analyze how well this question aligns with your research goals."
      variant="data-empty"
      ctaText="Set Purpose"
      ctaAction={handleSetPurpose}
      height="h-[200px]"
    />
  {:else if purposeAlignment}
    <Card.Root
      class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
    >
      <Card.Header class="pb-2">
        <Card.Title class="text-sm flex items-center gap-2">
          <Crosshair class="h-4 w-4" />
          Overall Score
          <span
            class="ml-auto inline-block w-2.5 h-2.5 rounded-full {getAlignmentColor(purposeAlignment.score)}"
          ></span>
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <span class="{getAlignmentTextColor(purposeAlignment.score)} font-medium">
              {getAlignmentLabel(purposeAlignment.score)}
            </span>
            <span class="font-semibold">{purposeAlignment.score}%</span>
          </div>
          <Progress value={purposeAlignment.score} max={100} class="h-2" />
        </div>
        <p class="text-sm text-muted-foreground leading-relaxed">
          {purposeAlignment.explanation}
        </p>
      </Card.Content>
    </Card.Root>

    {#if purposeAlignment.gaps.length > 0}
      <Card.Root
        class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
      >
        <Card.Header class="pb-2">
          <Card.Title class="text-sm flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-yellow-500" />
            Gaps
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <ul class="space-y-1.5">
            {#each purposeAlignment.gaps as gap}
              <li class="text-sm text-muted-foreground flex items-start gap-2">
                <span class="text-yellow-500 mt-1 shrink-0">&#8226;</span>
                {gap}
              </li>
            {/each}
          </ul>
        </Card.Content>
      </Card.Root>
    {/if}

    {#if purposeAlignment.suggestions.length > 0}
      <Card.Root
        class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
      >
        <Card.Header class="pb-2">
          <Card.Title class="text-sm flex items-center gap-2">
            <Lightbulb class="h-4 w-4 text-blue-500" />
            Suggestions
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <ul class="space-y-1.5">
            {#each purposeAlignment.suggestions as suggestion}
              <li class="text-sm text-muted-foreground flex items-start gap-2">
                <span class="text-blue-500 mt-1 shrink-0">&#8226;</span>
                {suggestion}
              </li>
            {/each}
          </ul>
        </Card.Content>
      </Card.Root>
    {/if}
  {:else}
    <EmptyState
      title="No purpose alignment data"
      description="Run an analysis to check how this question aligns with your project's stated purpose."
      variant="data-empty"
      ctaText="Analyze Alignment"
      ctaAction={handleAnalyze}
      height="h-[200px]"
    />
  {/if}
</div>
