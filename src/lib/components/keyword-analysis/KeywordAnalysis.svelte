<!-- KeywordAnalysis.svelte -->
<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import KeywordInput from "./KeywordInput.svelte";
  import AnalysisResults from "./AnalysisResults.svelte";
  import VennDiagram from "./VennDiagram.svelte";
  import FrequencyChart from "./FrequencyChart.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";

  const API_BASE = "http://localhost:3333";

  let loading = $state(false);
  let error = $state<string | null>(null);
  let currentAnalysis = $state<KeywordAnalysis | null>(null);
  let analyses = $state<KeywordAnalysis[]>([]);
  let showNewAnalysis = $state(false);

  $effect(() => {
    if (projectStore.currentProject?.id) {
      fetchAnalyses();
    } else {
      error = "Please select a project first";
      analyses = [];
      currentAnalysis = null;
    }
  });

  async function fetchAnalyses() {
    loading = true;
    error = null;
    try {
      const response = await fetch(
        `${API_BASE}/keyword_analysis/project/${projectStore.currentProject!.id}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch analyses");
      }
      const data = await response.json();

      analyses = data.map((analysis: KeywordAnalysis) => {
        const processed = {
          ...analysis,
          keywords:
            typeof analysis.keywords === "string"
              ? JSON.parse(analysis.keywords)
              : analysis.keywords,
          report:
            typeof analysis.report === "string"
              ? JSON.parse(analysis.report)
              : analysis.report,
          frequencyData:
            analysis.frequencyData && typeof analysis.frequencyData === "string"
              ? JSON.parse(analysis.frequencyData)
              : analysis.frequencyData,
        };
        return processed;
      });

      if (analyses.length > 0) {
        currentAnalysis = analyses[0];
      }
    } catch (err) {
      console.error("Error fetching analyses:", err);
      error = "Failed to load keyword analyses";
    } finally {
      loading = false;
    }
  }

  async function handleNewAnalysis(keywords: string[]) {
    if (!projectStore.currentProject?.id) {
      error = "Please select a project first";
      return;
    }

    loading = true;
    error = null;
    try {
      const response = await fetch(`${API_BASE}/keyword_analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          keywords,
          projectId: projectStore.currentProject.id,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create analysis");
      }
      const data = await response.json();
      const newAnalysis = {
        ...data.keyword_analysis,
        keywords:
          typeof data.keyword_analysis.keywords === "string"
            ? JSON.parse(data.keyword_analysis.keywords)
            : data.keyword_analysis.keywords,
        report:
          typeof data.keyword_analysis.report === "string"
            ? JSON.parse(data.keyword_analysis.report)
            : data.keyword_analysis.report,
        frequency_data:
          data.keyword_analysis.frequency_data &&
          typeof data.keyword_analysis.frequency_data === "string"
            ? JSON.parse(data.keyword_analysis.frequency_data)
            : data.keyword_analysis.frequency_data,
      };
      analyses = [...analyses, newAnalysis];
      currentAnalysis = newAnalysis;
      showNewAnalysis = false;
    } catch (err) {
      console.error("Error creating analysis:", err);
      error = "Failed to create keyword analysis";
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`${API_BASE}/keyword_analysis/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete analysis");
      }
      analyses = analyses.filter((a) => a.id !== id);
      if (currentAnalysis?.id === id) {
        currentAnalysis = analyses[0] || null;
      }
    } catch (err) {
      console.error("Error deleting analysis:", err);
      error = "Failed to delete analysis";
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error("Invalid date string:", dateString);
        return "Invalid date";
      }
      const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
      return formatted;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }

  function setCurrentAnalysis(analysis: KeywordAnalysis) {
    currentAnalysis = analysis;
    error = null;
    showNewAnalysis = false;
  }
</script>

<Card class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold text-primary">Keyword Analysis</h2>
    {#if projectStore.currentProject}
      <Button
        variant={showNewAnalysis ? "destructive" : "default"}
        onclick={() => (showNewAnalysis = !showNewAnalysis)}
        disabled={loading}
      >
        {showNewAnalysis ? "Cancel" : "New Analysis"}
      </Button>
    {/if}
  </div>

  {#if error}
    <div class="text-center py-12 text-destructive" transition:fade>
      <p class="mb-4">{error}</p>
      {#if !projectStore.currentProject}
        <p class="text-sm text-muted-foreground">
          Select a project to get started
        </p>
      {/if}
    </div>
  {:else if loading}
    <div class="flex justify-center items-center h-64" transition:fade>
      <div class="loader"></div>
    </div>
  {:else if showNewAnalysis}
    <div transition:slide>
      <KeywordInput on:submit={({ detail }) => handleNewAnalysis(detail)} />
    </div>
  {:else if currentAnalysis}
    <div class="space-y-6" transition:fade>
      <div class="grid grid-cols-2 gap-6">
        <VennDiagram analysis={currentAnalysis} />
        <FrequencyChart analysis={currentAnalysis} />
      </div>
      <AnalysisResults analysis={currentAnalysis} />
    </div>
  {:else if projectStore.currentProject}
    <div class="text-center py-12 text-muted-foreground" transition:fade>
      <p class="mb-4">No keyword analyses yet</p>
      <Button onclick={() => (showNewAnalysis = true)} disabled={loading}
        >Create Your First Analysis</Button
      >
    </div>
  {/if}

  {#if analyses.length > 0 && !showNewAnalysis}
    <div class="mt-8 border-t pt-6">
      <h3 class="text-base font-semibold mb-4">Previous Analyses</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each analyses as analysis}
          <div
            class={`relative border rounded-lg overflow-hidden transition-shadow hover:shadow-md ${
              currentAnalysis?.id === analysis.id
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
          >
            <button
              type="button"
              class="w-full text-left cursor-pointer p-4"
              onclick={() => {
                setCurrentAnalysis(analysis);
              }}
            >
              <div class="flex justify-between items-start">
                <div class="font-medium">{formatDate(analysis.createdAt)}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 -mt-1 -mr-1"
                  onclick={(e: MouseEvent) => {
                    e.stopPropagation();
                    handleDelete(analysis.id);
                  }}
                >
                  ×
                </Button>
              </div>
              <div class="mt-3 text-sm">
                <div
                  class="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1"
                >
                  Keywords
                </div>
                {(() => {
                  const keywordArray = Array.isArray(analysis.keywords)
                    ? analysis.keywords
                    : JSON.parse(analysis.keywords);
                  const displayKeywords = keywordArray.slice(0, 3).join(", ");
                  return keywordArray.length > 3
                    ? `${displayKeywords}, +${keywordArray.length - 3} more`
                    : displayKeywords;
                })()}
              </div>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Card>

<style>
  .loader {
    width: 3rem;
    height: 3rem;
    border: 4px solid;
    border-color: hsl(var(--primary));
    border-top-color: transparent;
    border-radius: 9999px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
