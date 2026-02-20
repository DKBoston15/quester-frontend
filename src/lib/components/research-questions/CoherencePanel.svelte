<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import * as Card from "$lib/components/ui/card";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    GitBranch,
    RefreshCw,
    MessageSquare,
  } from "lucide-svelte";

  let {
    question,
  }: {
    question: ResearchQuestion;
  } = $props();

  let isAnalyzing = $state(false);

  interface OverlapItem {
    questionId: string;
    question: string;
    overlapScore: number;
    relationship: string;
  }

  let coherence = $derived(
    question.metadata?.coherence as
      | {
          uniqueContribution: string;
          overlapAssessment: OverlapItem[];
          coverageSummary: string;
        }
      | undefined,
  );

  function getOverlapColor(score: number): string {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  }

  function getOverlapTextColor(score: number): string {
    if (score >= 70) return "text-red-600 dark:text-red-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  }

  function getOverlapLabel(score: number): string {
    if (score >= 70) return "High overlap";
    if (score >= 40) return "Moderate overlap";
    return "Low overlap";
  }

  async function handleAnalyze() {
    isAnalyzing = true;
    try {
      await researchQuestionsStore.analyzeCoherence(question.id);
    } finally {
      isAnalyzing = false;
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Cross-Question Coherence</h3>
    <Button
      variant="outline"
      size="sm"
      onclick={handleAnalyze}
      disabled={isAnalyzing}
    >
      <RefreshCw
        class="h-3.5 w-3.5 mr-1.5 {isAnalyzing ? 'animate-spin' : ''}"
      />
      {isAnalyzing ? "Analyzing..." : "Analyze"}
    </Button>
  </div>

  {#if coherence}
    <Card.Root
      class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
    >
      <Card.Header class="pb-2">
        <Card.Title class="text-sm flex items-center gap-2">
          <GitBranch class="h-4 w-4" />
          Unique Contribution
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-sm text-muted-foreground leading-relaxed">
          {coherence.uniqueContribution}
        </p>
      </Card.Content>
    </Card.Root>

    {#if coherence.overlapAssessment.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-muted-foreground">Overlap with Other Questions</h4>
        {#each coherence.overlapAssessment as item}
          <Card.Root
            class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
          >
            <Card.Content class="p-4 space-y-2">
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-medium leading-snug flex-1 min-w-0">
                  {item.question}
                </p>
                <span
                  class="shrink-0 inline-block w-2.5 h-2.5 rounded-full mt-1 {getOverlapColor(item.overlapScore)}"
                ></span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between text-sm">
                  <span class="{getOverlapTextColor(item.overlapScore)} font-medium">
                    {getOverlapLabel(item.overlapScore)}
                  </span>
                  <span class="font-semibold">{item.overlapScore}%</span>
                </div>
                <Progress value={item.overlapScore} max={100} class="h-1.5" />
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {item.relationship}
              </p>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    {:else}
      <Card.Root
        class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
      >
        <Card.Content class="p-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare class="h-4 w-4" />
            <p>This is the only question in the project. Add more questions to analyze coherence.</p>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <Card.Root
      class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
    >
      <Card.Header class="pb-2">
        <Card.Title class="text-sm flex items-center gap-2">
          <MessageSquare class="h-4 w-4" />
          Coverage Summary
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-sm text-muted-foreground leading-relaxed">
          {coherence.coverageSummary}
        </p>
      </Card.Content>
    </Card.Root>
  {:else}
    <EmptyState
      title="No coherence data"
      description="Run an analysis to see how this question relates to other questions in your project."
      variant="data-empty"
      ctaText="Analyze Coherence"
      ctaAction={handleAnalyze}
      height="h-[200px]"
    />
  {/if}
</div>
