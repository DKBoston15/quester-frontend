<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
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
  }

  let matches = $state<LiteratureMatch[]>([]);
  let isRefreshing = $state(false);
  let highRelevanceOnly = $state(false);

  let filteredMatches = $derived(
    highRelevanceOnly ? matches.filter((m) => m.relevanceScore > 70) : matches,
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
    const resolved: LiteratureMatch[] = [];

    for (const id of literatureIds) {
      const lit = allLiterature.find((l) => l.id === id);
      if (lit) {
        const score =
          (question.metadata?.literatureRelevanceScores as Record<string, number>)?.[id] ?? 50;
        resolved.push({ literature: lit, relevanceScore: score });
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

  function getRelevanceBadgeVariant(score: number): "success" | "warning" | "destructive" {
    if (score > 70) return "success";
    if (score >= 40) return "warning";
    return "destructive";
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
          High relevance
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
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Badge variant={getRelevanceBadgeVariant(match.relevanceScore)}>
                  {match.relevanceScore}%
                </Badge>
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
        Showing {filteredMatches.length} of {matches.length} matches (filtered to &gt;70% relevance)
      </p>
    {/if}
  {:else if highRelevanceOnly && matches.length > 0}
    <EmptyState
      title="No high-relevance matches"
      description="No literature items matched above 70% relevance. Try disabling the filter to see all matches."
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
