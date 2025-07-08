<!-- KeywordAnalysis.svelte -->
<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import KeywordInput from "./KeywordInput.svelte";
  import AnalysisResults from "./AnalysisResults.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { API_BASE_URL } from "$lib/config";
  import { driver } from "driver.js";
  import type { DriveStep, Side } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";

  let loading = $state(false);
  let switching = $state(false);
  let error = $state<string | null>(null);
  let currentAnalysis = $state<KeywordAnalysis | null>(null);
  let analyses = $state<KeywordAnalysis[]>([]);
  let showNewAnalysis = $state(false);

  // --- Driver.js Steps Definitions ---
  const noAnalysisSteps: DriveStep[] = [
    {
      element: "#keyword-analysis-header",
      popover: {
        title: "Welcome to Keyword Analysis",
        description:
          "This tool helps you understand keyword frequency and relationships within your project's literature. Discover patterns, identify research gaps, and refine your focus.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#no-analysis-placeholder",
      popover: {
        title: "Start Your First Analysis",
        description:
          "You haven't run any analyses yet. Click 'Create Your First Analysis' to begin exploring keyword connections.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#create-first-analysis-button",
      popover: {
        title: "Input Your Keywords",
        description:
          "Enter 2-10 keywords relevant to your research questions. Quester will then search your literature for occurrences and co-occurrences.",
        side: "top",
        align: "center",
      },
      onHighlightStarted: () => {
        const button = document.getElementById("create-first-analysis-button");
        if (button) button.style.pointerEvents = "auto";
      },
    },
  ];

  const withAnalysisSteps: DriveStep[] = [
    {
      element: "#keyword-analysis-header",
      popover: {
        title: "Exploring Your Keyword Analysis",
        description:
          "This analysis reveals patterns in your selected keywords across your project literature. Let's break down the results.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#analysis-results-card", // Target the AnalysisResults component card
      popover: {
        title: "Analysis Results Overview",
        description:
          "Here you'll find a summary, visualizations, and detailed tables showing how your keywords appear and overlap in your sources.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "#analysis-summary-accordion", // Requires ID on AccordionItem in AnalysisResults
      popover: {
        title: "AI-Generated Summary",
        description:
          "Read an AI-generated interpretation of the keyword patterns, potential research gaps, and areas of high concentration. A great starting point for insights!",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#frequency-chart-accordion", // Requires ID on AccordionItem in AnalysisResults
      popover: {
        title: "Frequency Distribution Chart",
        description:
          "Visualize how often each keyword appears individually. Identify the most dominant terms in your literature set.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#venn-diagram-accordion", // Requires ID on AccordionItem in AnalysisResults
      popover: {
        title: "Keyword Overlap (Venn Diagram)",
        description:
          "Select 2 or 3 keywords to see their co-occurrence visually. Click on sections to filter literature containing specific keyword combinations (opens Google Scholar).",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#frequency-table-accordion", // Requires ID on AccordionItem in AnalysisResults
      popover: {
        title: "Frequency Distribution Table",
        description:
          "See the exact counts and percentages for each keyword. Click counts to view corresponding results on Google Scholar. Download the data as CSV.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#cross-table-accordion", // Requires ID on AccordionItem in AnalysisResults
      popover: {
        title: "Cross Distribution Table",
        description:
          "Examine the co-occurrence frequency for every pair of keywords. Identify which terms frequently appear together. Download as CSV.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#triple-table-accordion", // Requires ID on AccordionItem in AnalysisResults
      popover: {
        title: "Three-Way Distribution Table",
        description:
          "Explore the co-occurrence for combinations of three keywords. Available when 3+ keywords are analyzed. Download as CSV.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#previous-analyses-section",
      popover: {
        title: "Previous Analyses",
        description:
          "Access your past analyses here. Click on one to view its results again or delete analyses you no longer need.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "#new-analysis-button",
      popover: {
        title: "Run a New Analysis",
        description:
          "Explore different keyword combinations or update your analysis as your literature grows by running a new analysis anytime.",
        side: "left",
        align: "start",
      },
    },
  ];
  // --- End Driver.js Steps Definitions ---

  // Commented out upfront driver definitions
  // const driverNoAnalysis = driver({ ... });
  // const driverWithAnalysis = driver({ ... });

  function startTour() {
    let driverInstance;
    if (currentAnalysis || analyses.length > 0) {
      driverInstance = driver({
        showProgress: true,
        popoverClass: "quester-driver-theme",
        steps: withAnalysisSteps,
      });
    } else {
      driverInstance = driver({
        showProgress: true,
        popoverClass: "quester-driver-theme",
        steps: noAnalysisSteps,
      });
    }
    driverInstance.drive();
  }

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
        `${API_BASE_URL}/keyword_analysis/project/${projectStore.currentProject!.id}`,
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
      const response = await fetch(`${API_BASE_URL}/keyword_analysis`, {
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
      console.error("Error creating analysis:", err);
      error = "Failed to create keyword analysis";
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/keyword_analysis/${id}`, {
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
    <h2 class="text-2xl font-bold text-primary">Keyword Analysis</h2>
    {#if projectStore.currentProject}
      <div class="flex items-center space-x-2">
        <Button
          variant={showNewAnalysis ? "destructive" : "default"}
          onclick={() => (showNewAnalysis = !showNewAnalysis)}
          disabled={loading}
          id="new-analysis-button"
        >
          {showNewAnalysis ? "Cancel" : "New Analysis"}
        </Button>
        <Button variant="outline" size="icon" onclick={startTour}>
          <GraduationCap class="h-4 w-4" />
          <span class="sr-only">Learn about Keyword Analysis</span>
        </Button>
      </div>
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
    <div class="space-y-6" transition:fade id="analysis-results-card">
      {#if switching}
        <div class="flex justify-center items-center py-8" transition:fade>
          <div class="loader mr-2"></div>
          <span class="text-muted-foreground">Switching analysis...</span>
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
        title="No keyword analyses yet"
        description="Create your first analysis to begin exploring keyword connections in your literature."
        variant="data-empty"
        ctaText="Create Your First Analysis"
        ctaAction={() => (showNewAnalysis = true)}
        ctaDisabled={loading}
      />
    </div>
  {/if}

  {#if analyses.length > 0 && !showNewAnalysis}
    <div class="mt-8 border-t pt-6" id="previous-analyses-section">
      <h3 class="text-base font-semibold mb-4">Previous Analyses</h3>
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
