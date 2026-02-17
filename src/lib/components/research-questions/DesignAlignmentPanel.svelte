<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
    type DesignAlignmentScore,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import * as Card from "$lib/components/ui/card";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    Target,
    Circle,
    FileText,
    Sparkles,
    RefreshCw,
    MessageSquare,
    Settings,
  } from "lucide-svelte";

  let {
    question,
  }: {
    question: ResearchQuestion;
  } = $props();

  let isLoading = $derived(researchQuestionsStore.isLoading);
  let streamingAnalysis = $derived(researchQuestionsStore.streamingAnalysis);

  const designTypes = [
    { key: "researchDesign" as const, label: "Research Design", icon: Target },
    { key: "samplingDesign" as const, label: "Sampling Design", icon: Circle },
    { key: "measurementDesign" as const, label: "Measurement Design", icon: FileText },
    { key: "analyticDesign" as const, label: "Analytic Design", icon: Sparkles },
  ];

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

  function getAverageAlignment(scores: DesignAlignmentScore | null): number {
    if (!scores) return 0;
    return Math.round(
      (scores.researchDesign +
        scores.samplingDesign +
        scores.measurementDesign +
        scores.analyticDesign) /
        4,
    );
  }

  function getExplanation(key: string): string | null {
    const explanations = question.metadata?.alignmentExplanations as
      | Record<string, string>
      | undefined;
    return explanations?.[key] ?? null;
  }

  async function handleAnalyze() {
    await researchQuestionsStore.analyzeAlignment(question.id);
  }

  function handleRefineQuestion() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    sessionStorage.setItem(
      "analyst_prefill",
      `Help me refine my research question: "${question.question}"`,
    );
    navigate(`/project/${projectId}/analyst`);
  }

  function handleUpdateDesign() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    sessionStorage.setItem("overview_active_tab", "design");
    navigate(`/project/${projectId}/overview`);
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Design Alignment</h3>
    <Button
      variant="outline"
      size="sm"
      onclick={handleAnalyze}
      disabled={isLoading}
    >
      <RefreshCw
        class="h-3.5 w-3.5 mr-1.5 {isLoading ? 'animate-spin' : ''}"
      />
      {isLoading ? "Analyzing..." : "Analyze"}
    </Button>
  </div>

  {#if question.designAlignmentScore}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      {#each designTypes as dt}
        {@const score = question.designAlignmentScore[dt.key]}
        {@const explanation = getExplanation(dt.key)}
        <Card.Root
          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
        >
          <Card.Header class="pb-2">
            <Card.Title class="text-sm flex items-center gap-2">
              <dt.icon class="h-4 w-4" />
              {dt.label}
              <span
                class="ml-auto inline-block w-2.5 h-2.5 rounded-full {getAlignmentColor(score)}"
              ></span>
            </Card.Title>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="{getAlignmentTextColor(score)} font-medium">
                  {getAlignmentLabel(score)}
                </span>
                <span class="font-semibold">{score}%</span>
              </div>
              <Progress value={score} max={100} class="h-2" />
            </div>

            {#if explanation}
              <p class="text-xs text-muted-foreground leading-relaxed">
                {explanation}
              </p>
            {/if}

            <div class="flex gap-1.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                class="text-xs h-7 px-2"
                onclick={handleRefineQuestion}
              >
                <MessageSquare class="h-3 w-3 mr-1" />
                Refine Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="text-xs h-7 px-2"
                onclick={handleUpdateDesign}
              >
                <Settings class="h-3 w-3 mr-1" />
                Update Design
              </Button>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    <div class="text-sm text-muted-foreground">
      Average alignment: {getAverageAlignment(question.designAlignmentScore)}%
    </div>
  {:else}
    <EmptyState
      title="No alignment data"
      description="Run an AI analysis to check how this question aligns with your project's design types."
      variant="data-empty"
      ctaText="Analyze Alignment"
      ctaAction={handleAnalyze}
      height="h-[200px]"
    />
  {/if}

  <!-- Streaming Analysis Result -->
  {#if streamingAnalysis}
    <Card.Root
      class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
    >
      <Card.Header class="pb-2">
        <Card.Title class="text-sm flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-primary" />
          AI Alignment Analysis
          {#if !streamingAnalysis.isComplete}
            <RefreshCw class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          {/if}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-sm whitespace-pre-wrap">
          {streamingAnalysis.content}
        </p>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
