<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    BookOpen,
    ExternalLink,
    RefreshCw,
    Filter,
  } from "lucide-svelte";
  import type { Literature } from "$lib/types/literature";
  import { api } from "$lib/services/api-client";

  let {
    question,
  }: {
    question: ResearchQuestion;
  } = $props();

  interface LiteratureMatch {
    literature: Literature;
    relevanceScore: number;
    explanation: string;
    relevanceLevel: string;
  }

  let matches = $state<LiteratureMatch[]>([]);
  let isRefreshing = $state(false);
  let highRelevanceOnly = $state(false);

  let filteredMatches = $derived(
    highRelevanceOnly
      ? matches.filter((m) => m.relevanceLevel === "high" || m.relevanceLevel === "moderate")
      : matches,
  );

  let sortedMatches = $derived(
    [...filteredMatches].sort((a, b) => b.relevanceScore - a.relevanceScore),
  );

  function resolveMatches() {
    const literatureIds = question.connectedLiteratureIds ?? [];
    if (literatureIds.length === 0) {
      matches = [];
      return;
    }

    const allLiterature = literatureStore.data;
    const scores = (question.metadata?.literatureRelevanceScores as Record<string, number>) ?? {};
    const explanations =
      (question.metadata?.literatureRelevanceExplanations as Record<string, string>) ?? {};
    const levels =
      (question.metadata?.literatureRelevanceLevels as Record<string, string>) ?? {};
    const resolved: LiteratureMatch[] = [];

    for (const id of literatureIds) {
      const lit = allLiterature.find((l) => l.id === id);
      if (lit) {
        resolved.push({
          literature: lit,
          relevanceScore: scores[id] ?? 50,
          explanation: explanations[id] ?? "",
          relevanceLevel: levels[id] ?? "low",
        });
      }
    }

    matches = resolved;
  }

  $effect(() => {
    // Re-resolve when the question or literature data changes
    question.connectedLiteratureIds;
    literatureStore.data;
    resolveMatches();
  });

  $effect(() => {
    const projectId = projectStore.currentProject?.id;
    if (projectId && literatureStore.data.length === 0 && !literatureStore.isLoading) {
      literatureStore.loadLiterature(projectId);
    }
  });

  async function handleRefreshMatches() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId || isRefreshing) return;

    isRefreshing = true;
    try {
      const result = await api.post<{
        connectedLiteratureIds: string[];
        literatureRelevanceScores: Record<string, number>;
        literatureRelevanceExplanations: Record<string, string>;
        literatureRelevanceLevels: Record<string, string>;
      }>(`/research-questions/${question.id}/find-literature`, {});

      if (result.connectedLiteratureIds) {
        const updated = await researchQuestionsStore.updateQuestion(question.id, {});
        if (updated) {
          resolveMatches();
        }
      }

      // Reload the question to get the updated connected literature
      await researchQuestionsStore.loadQuestions(projectId);
    } catch (err) {
      console.error("Error refreshing literature matches:", err);
    } finally {
      isRefreshing = false;
    }
  }

  function handleViewArticle(literatureId: string) {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;
    navigate(`/project/${projectId}/literature/${literatureId}`);
  }

  function getRelevanceDotColor(level: string): string {
    if (level === "high") return "bg-green-500";
    if (level === "moderate") return "bg-yellow-500";
    if (level === "low") return "bg-orange-500";
    return "bg-red-500";
  }

  function getRelevanceTextColor(level: string): string {
    if (level === "high") return "text-green-600 dark:text-green-400";
    if (level === "moderate") return "text-yellow-600 dark:text-yellow-400";
    if (level === "low") return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  }

  function getRelevanceLabel(level: string): string {
    if (level === "high") return "Highly relevant";
    if (level === "moderate") return "Moderately relevant";
    if (level === "low") return "Tangentially relevant";
    return "Weak match";
  }

  function formatAuthors(authors: any[] | string): string {
    if (!authors) return "Unknown authors";
    if (typeof authors === "string") return authors || "Unknown authors";
    if (Array.isArray(authors)) {
      if (authors.length === 0) return "Unknown authors";
      const names = authors.map((a) => {
        if (typeof a === "string") return a;
        if (a?.name) return a.name;
        if (a?.firstName && a?.lastName) return `${a.lastName}, ${a.firstName}`;
        if (a?.lastName) return a.lastName;
        return String(a);
      });
      if (names.length <= 3) return names.join(", ");
      return `${names.slice(0, 3).join(", ")} et al.`;
    }
    return "Unknown authors";
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Connected Literature</h3>
    <div class="flex items-center gap-2">
      <button
        class="px-2.5 py-1 text-xs rounded-full transition-colors {highRelevanceOnly
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
        onclick={() => (highRelevanceOnly = !highRelevanceOnly)}
      >
        <span class="inline-flex items-center gap-1">
          <Filter class="h-3 w-3" />
          Most relevant
        </span>
      </button>
      <Button
        variant="outline"
        size="sm"
        onclick={handleRefreshMatches}
        disabled={isRefreshing}
      >
        <RefreshCw
          class="h-3.5 w-3.5 mr-1.5 {isRefreshing ? 'animate-spin' : ''}"
        />
        {isRefreshing ? "Searching..." : "Refresh Matches"}
      </Button>
    </div>
  </div>

  {#if sortedMatches.length > 0}
    <div class="space-y-2">
      {#each sortedMatches as match (match.literature.id)}
        <Card.Root
          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
        >
          <Card.Content class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-start gap-2">
                  <BookOpen class="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium leading-snug truncate">
                      {match.literature.title || match.literature.name || "Untitled"}
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                      {formatAuthors(match.literature.authors)}
                      {#if match.literature.publishYear}
                        <span class="mx-1">&middot;</span>
                        {match.literature.publishYear}
                      {/if}
                    </p>
                    {#if match.explanation}
                      <p class="text-xs text-muted-foreground italic mt-1.5 leading-relaxed">
                        {match.explanation}
                      </p>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center gap-1.5">
                  <span class="inline-block w-2.5 h-2.5 rounded-full {getRelevanceDotColor(match.relevanceLevel)}"></span>
                  <span class="text-xs font-medium {getRelevanceTextColor(match.relevanceLevel)}">
                    {getRelevanceLabel(match.relevanceLevel)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-xs h-7 px-2"
                  onclick={() => handleViewArticle(match.literature.id)}
                >
                  <ExternalLink class="h-3 w-3 mr-1" />
                  View Article
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    {#if highRelevanceOnly && matches.length > filteredMatches.length}
      <p class="text-xs text-muted-foreground text-center">
        Showing {filteredMatches.length} of {matches.length} matches (high and moderate relevance)
      </p>
    {/if}
  {:else if highRelevanceOnly && matches.length > 0}
    <EmptyState
      title="No highly relevant matches"
      description="No literature items were rated as highly or moderately relevant. Try disabling the filter to see all matches."
      variant="data-empty"
      ctaText="Show All"
      ctaAction={() => (highRelevanceOnly = false)}
      height="h-[200px]"
    />
  {:else}
    <EmptyState
      title="No connected literature"
      description="Run a semantic search to find literature articles related to this research question."
      variant="data-empty"
      ctaText="Find Matches"
      ctaAction={handleRefreshMatches}
      height="h-[200px]"
    />
  {/if}
</div>
