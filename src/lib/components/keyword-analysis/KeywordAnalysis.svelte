<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import KeywordInput from "./KeywordInput.svelte";
  import AnalysisResults from "./AnalysisResults.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { api } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import type { DriveStep } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";
  import { onDestroy } from "svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  let loading = $state(false);
  let switching = $state(false);
  let error = $state<string | null>(null);
  let currentAnalysis = $state<KeywordAnalysis | null>(null);
  let analyses = $state<KeywordAnalysis[]>([]);
  let showNewAnalysis = $state(false);
  // Track in-flight create request to allow cancellation and avoid timeouts
  let createAnalysisAbort: AbortController | null = null;

  onDestroy(() => {
    if (createAnalysisAbort) createAnalysisAbort.abort();
  });

  // --- Driver.js Steps Definitions (factory functions for i18n) ---
  function getNoAnalysisSteps(): DriveStep[] {
    return [
      {
        element: "#keyword-analysis-header",
        popover: {
          title: t("tours.keywordAnalysis.welcome.title"),
          description: t("tours.keywordAnalysis.welcome.description"),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#no-analysis-placeholder",
        popover: {
          title: t("tours.keywordAnalysis.startFirst.title"),
          description: t("tours.keywordAnalysis.startFirst.description"),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#create-first-analysis-button",
        popover: {
          title: t("tours.keywordAnalysis.inputKeywords.title"),
          description: t("tours.keywordAnalysis.inputKeywords.description"),
          side: "top",
          align: "center",
        },
        onHighlightStarted: () => {
          const button = document.getElementById("create-first-analysis-button");
          if (button) button.style.pointerEvents = "auto";
        },
      },
    ];
  }

  function getWithAnalysisSteps(): DriveStep[] {
    return [
      {
        element: "#keyword-analysis-header",
        popover: {
          title: t("tours.keywordAnalysis.exploring.title"),
          description: t("tours.keywordAnalysis.exploring.description"),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#analysis-results-card",
        popover: {
          title: t("tours.keywordAnalysis.resultsOverview.title"),
          description: t("tours.keywordAnalysis.resultsOverview.description"),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#analysis-summary-accordion",
        popover: {
          title: t("tours.keywordAnalysis.aiSummary.title"),
          description: t("tours.keywordAnalysis.aiSummary.description"),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#frequency-chart-accordion",
        popover: {
          title: t("tours.keywordAnalysis.frequencyChart.title"),
          description: t("tours.keywordAnalysis.frequencyChart.description"),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#venn-diagram-accordion",
        popover: {
          title: t("tours.keywordAnalysis.vennDiagram.title"),
          description: t("tours.keywordAnalysis.vennDiagram.description"),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#frequency-table-accordion",
        popover: {
          title: t("tours.keywordAnalysis.frequencyTable.title"),
          description: t("tours.keywordAnalysis.frequencyTable.description"),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#cross-table-accordion",
        popover: {
          title: t("tours.keywordAnalysis.crossTable.title"),
          description: t("tours.keywordAnalysis.crossTable.description"),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#triple-table-accordion",
        popover: {
          title: t("tours.keywordAnalysis.tripleTable.title"),
          description: t("tours.keywordAnalysis.tripleTable.description"),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#previous-analyses-section",
        popover: {
          title: t("tours.keywordAnalysis.previousAnalyses.title"),
          description: t("tours.keywordAnalysis.previousAnalyses.description"),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#new-analysis-button",
        popover: {
          title: t("tours.keywordAnalysis.newAnalysis.title"),
          description: t("tours.keywordAnalysis.newAnalysis.description"),
          side: "left",
          align: "start",
        },
      },
    ];
  }
  // --- End Driver.js Steps Definitions ---

  function startTour() {
    let driverInstance;
    if (currentAnalysis || analyses.length > 0) {
      driverInstance = driver({
        showProgress: true,
        popoverClass: "quester-driver-theme",
        steps: getWithAnalysisSteps(),
      });
    } else {
      driverInstance = driver({
        showProgress: true,
        popoverClass: "quester-driver-theme",
        steps: getNoAnalysisSteps(),
      });
    }
    driverInstance.drive();
  }

  $effect(() => {
    if (projectStore.currentProject?.id) {
      fetchAnalyses();
    } else {
      error = t("keywordAnalysis.selectProjectFirst");
      analyses = [];
      currentAnalysis = null;
    }
  });

  async function fetchAnalyses() {
    loading = true;
    error = null;
    try {
      const data = await api.get(
        `/keyword_analysis/project/${projectStore.currentProject!.id}`
      );

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
            (analysis.frequencyData &&
            typeof analysis.frequencyData === "string"
              ? JSON.parse(analysis.frequencyData)
              : analysis.frequencyData) ||
            (analysis.frequency_data &&
            typeof analysis.frequency_data === "string"
              ? JSON.parse(analysis.frequency_data)
              : analysis.frequency_data),
        };
        return processed;
      });

      if (analyses.length > 0) {
        currentAnalysis = analyses[0];
      }
    } catch (err) {
      console.error("Error fetching analyses:", err);
      error = t("keywordAnalysis.loadFailed");
    } finally {
      loading = false;
    }
  }

  async function handleNewAnalysis(keywords: string[]) {
    if (!projectStore.currentProject?.id) {
      error = t("keywordAnalysis.selectProjectFirst");
      return;
    }

    // Cancel any previous create request
    if (createAnalysisAbort) {
      createAnalysisAbort.abort();
    }
    createAnalysisAbort = new AbortController();

    loading = true;
    error = null;
    try {
      const data = await api.post(
        `/keyword_analysis`,
        {
          keywords,
          projectId: projectStore.currentProject.id,
        },
        {
          // Keyword analysis can take longer; extend timeout and wire abort
          timeout: 180000, // 3 minutes
          signal: createAnalysisAbort.signal,
        }
      );
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
        frequencyData:
          (data.keyword_analysis.frequencyData &&
          typeof data.keyword_analysis.frequencyData === "string"
            ? JSON.parse(data.keyword_analysis.frequencyData)
            : data.keyword_analysis.frequencyData) ||
          (data.keyword_analysis.frequency_data &&
          typeof data.keyword_analysis.frequency_data === "string"
            ? JSON.parse(data.keyword_analysis.frequency_data)
            : data.keyword_analysis.frequency_data),
      };
      analyses = [...analyses, newAnalysis];
      currentAnalysis = newAnalysis;
      showNewAnalysis = false;
    } catch (err) {
      // Suppress console noise on intentional aborts; show clearer message on timeout
      if (err instanceof Error && err.name === "AbortError") {
        error = t("keywordAnalysis.canceledOrTimedOut");
      } else {
        console.error("Error creating analysis:", err);
        error = t("keywordAnalysis.createFailed");
      }
    } finally {
      loading = false;
      createAnalysisAbort = null;
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/keyword_analysis/${id}`);
      analyses = analyses.filter((a) => a.id !== id);
      if (currentAnalysis?.id === id) {
        currentAnalysis = analyses[0] || null;
      }
    } catch (err) {
      console.error("Error deleting analysis:", err);
      error = t("keywordAnalysis.deleteFailed");
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
    switching = true;
    currentAnalysis = analysis;
    error = null;
    showNewAnalysis = false;

    // Reset switching state after a brief delay to allow for smooth transitions
    setTimeout(() => {
      switching = false;
    }, 100);
  }
</script>

<Card class="p-6">
  <div
    class="flex justify-between items-center mb-6"
    id="keyword-analysis-header"
  >
    <h2 class="text-2xl font-bold text-primary">{$_("keywordAnalysis.title")}</h2>
    {#if projectStore.currentProject}
      <div class="flex items-center space-x-2">
        <Button
          variant={showNewAnalysis ? "destructive" : "default"}
          onclick={() => (showNewAnalysis = !showNewAnalysis)}
          disabled={loading}
          id="new-analysis-button"
        >
          {showNewAnalysis ? $_("common.cancel") : $_("keywordAnalysis.newAnalysis")}
        </Button>
        <Button variant="outline" onclick={startTour}>
          <GraduationCap class="h-4 w-4 mr-2" />
          {$_("dashboard.tour")}
        </Button>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="text-center py-12 text-destructive" transition:fade>
      <p class="mb-4">{error}</p>
      {#if !projectStore.currentProject}
        <p class="text-sm text-muted-foreground">
          {$_("keywordAnalysis.selectProjectToStart")}
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
    <div class="space-y-6" transition:fade id="analysis-results-card">
      {#if switching}
        <div class="flex justify-center items-center py-8" transition:fade>
          <div class="loader mr-2"></div>
          <span class="text-muted-foreground">{$_("keywordAnalysis.switchingAnalysis")}</span>
        </div>
      {:else}
        {#key currentAnalysis.id}
          <AnalysisResults analysis={currentAnalysis} />
        {/key}
      {/if}
    </div>
  {:else if projectStore.currentProject}
    <div transition:fade id="no-analysis-placeholder">
      <EmptyState
        title={$_("keywordAnalysis.noAnalysesYet")}
        description={$_("keywordAnalysis.createFirstDescription")}
        variant="data-empty"
        ctaText={$_("keywordAnalysis.createFirstAnalysis")}
        ctaAction={() => (showNewAnalysis = true)}
        ctaDisabled={loading}
      />
    </div>
  {/if}

  {#if analyses.length > 0 && !showNewAnalysis}
    <div class="mt-8 border-t pt-6" id="previous-analyses-section">
      <h3 class="text-base font-semibold mb-4">{$_("keywordAnalysis.previousAnalyses")}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each analyses as analysis}
          <div
            class={`relative border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
              currentAnalysis?.id === analysis.id
                ? "border-primary bg-primary/10 shadow-md transform scale-[1.02]"
                : "border-border hover:border-primary/50 hover:shadow-sm"
            }`}
          >
            <button
              type="button"
              class="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset"
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
                  {$_("keywordAnalysis.keywords")}
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

  :global(.quester-driver-theme) {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
  }
  :global(.quester-driver-theme .driver-popover-title) {
    font-size: 1.1rem;
    font-weight: bold;
  }
  :global(.quester-driver-theme .driver-popover-description) {
    font-size: 0.9rem;
  }
  :global(.quester-driver-theme .driver-popover-navigation-btns button) {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: var(--radius);
  }
  :global(.quester-driver-theme .driver-popover-navigation-btns button:hover) {
    background-color: hsl(var(--primary) / 0.9);
  }
  :global(.quester-driver-theme .driver-popover-close-btn) {
    color: hsl(var(--foreground));
  }
  :global(.quester-driver-theme .driver-popover-progress-text) {
    color: hsl(var(--muted-foreground));
  }
</style>
