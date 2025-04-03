<!-- src/routes/project/Analytics.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { Chart } from "chart.js/auto";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { analyzeLiterature } from "./analytics/utils";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Dialog from "$lib/components/ui/dialog";
  import { PieChart, FileText, BookText, FlaskConical } from "lucide-svelte";

  // Watch for theme changes and update charts
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") {
        const isDark = document.documentElement.classList.contains("dark");
        const textColor = isDark ? "#ffffff" : "#000000";

        Chart.defaults.color = textColor;
        Chart.defaults.plugins.title.color = textColor;
        Chart.defaults.plugins.legend.labels.color = textColor;
        Chart.defaults.scale.grid.color = "rgba(128, 128, 128, 0.1)";
        Chart.defaults.scale.ticks.color = textColor;

        // Update all existing charts
        Object.values(charts).forEach((chart) => {
          if (chart?.options?.plugins?.title) {
            chart.options.plugins.title.color = textColor;
          }
          if (chart?.options?.scales?.x?.ticks) {
            chart.options.scales.x.ticks.color = textColor;
          }
          if (chart?.options?.scales?.y?.ticks) {
            chart.options.scales.y.ticks.color = textColor;
          }
          chart?.update();
        });

        // Update fullscreen chart if it exists
        if (fullscreenChart?.options?.plugins?.title) {
          fullscreenChart.options.plugins.title.color = textColor;
        }
        if (fullscreenChart?.options?.scales?.x?.ticks) {
          fullscreenChart.options.scales.x.ticks.color = textColor;
        }
        if (fullscreenChart?.options?.scales?.y?.ticks) {
          fullscreenChart.options.scales.y.ticks.color = textColor;
        }
        fullscreenChart?.update();
      }
    });
  });

  function getPreview(content: string | any) {
    try {
      if (!content) return "";

      // Handle string content that might be JSON
      if (typeof content === "string") {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(content);
          return extractTextFromTipTap(parsed);
        } catch (e) {
          // Not valid JSON, treat as text
          const tmp = document.createElement("DIV");
          tmp.innerHTML = content;
          return tmp.textContent || tmp.innerText || content;
        }
      }

      // Handle direct object content (already parsed JSON)
      if (typeof content === "object" && content !== null) {
        return extractTextFromTipTap(content);
      }

      return "";
    } catch (err) {
      console.warn("Error getting preview:", err);
      return "";
    }
  }

  // Helper function to recursively extract text from TipTap JSON
  function extractTextFromTipTap(node: any): string {
    if (!node) return "";

    // If it's a text node, return its text content
    if (node.type === "text" && node.text) {
      return node.text + " ";
    }

    // If it has content array, recursively process each child
    if (node.content && Array.isArray(node.content)) {
      return node.content
        .map((child: any) => extractTextFromTipTap(child))
        .join("");
    }

    // For any other node type that might have content
    if (typeof node === "object") {
      return Object.values(node)
        .map((value: any) => {
          if (Array.isArray(value)) {
            return value
              .map((item: any) => extractTextFromTipTap(item))
              .join("");
          }
          if (typeof value === "object") {
            return extractTextFromTipTap(value);
          }
          return "";
        })
        .join("");
    }

    return "";
  }

  interface DataCounts {
    [key: string]: number;
  }

  interface AnalyticsData {
    summary: {
      keywords: { names: string[]; counts: number[] };
      topAuthors: { names: string[]; counts: number[] };
      topPublishers: { names: string[]; counts: number[] };
      publicationYears: { names: string[]; counts: number[] };
      literatureTypes: { names: string[]; counts: number[] };
      researchDesigns: { names: string[]; counts: number[] };
      analyticDesigns: { names: string[]; counts: number[] };
      samplingDesigns: { names: string[]; counts: number[] };
      measurementDesigns: { names: string[]; counts: number[] };
      nounsWordCounts: { names: string[]; counts: number[] };
      verbsWordCounts: { names: string[]; counts: number[] };
      adjectivesWordCounts: { names: string[]; counts: number[] };
      literatureNounsWordCounts: { names: string[]; counts: number[] };
      literatureVerbsWordCounts: { names: string[]; counts: number[] };
      literatureAdjectivesWordCounts: { names: string[]; counts: number[] };
    } | null;
  }

  let activeTab = $state("overview");
  let isLoading = $state(true);
  let data = $state<AnalyticsData>({ summary: null });

  // Canvas references
  let canvasRefs = $state<Record<string, HTMLCanvasElement | null>>({
    publishers: null,
    keywords: null,
    years: null,
    types: null,
    notesNouns: null,
    notesVerbs: null,
    notesAdjectives: null,
    litNouns: null,
    litVerbs: null,
    litAdjectives: null,
    researchDesigns: null,
    samplingDesigns: null,
    measurementDesigns: null,
    analyticDesigns: null,
  });

  // Chart instances
  let charts: Record<string, Chart> = {};

  let activeChart: {
    canvas: HTMLCanvasElement | null;
    title: string;
    color: string;
  } | null = $state(null);
  let fullscreenChart: Chart | null = null;

  function openFullscreen(
    canvas: HTMLCanvasElement | null,
    title: string,
    color: string
  ) {
    if (!canvas) return;
    activeChart = { canvas, title, color };
  }

  function closeFullscreen() {
    if (fullscreenChart) {
      fullscreenChart.destroy();
      fullscreenChart = null;
    }
    activeChart = null;
  }

  function createFullscreenChart(node: HTMLElement) {
    if (!activeChart?.canvas) return;

    const originalChart =
      charts[
        Object.keys(charts).find(
          (key) => canvasRefs[key] === activeChart?.canvas
        ) || ""
      ];

    if (!originalChart) return;

    const fullscreenCanvas = document.getElementById(
      "fullscreen-canvas"
    ) as HTMLCanvasElement;
    if (!fullscreenCanvas) return;

    // Get text color from current theme
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    // Check if this is the years chart
    const isYearsChart =
      activeChart.title === "Distribution of Publication Years";

    // Create a new chart with the same data but adjusted options for fullscreen
    fullscreenChart = new Chart(fullscreenCanvas, {
      type: "bar",
      data: {
        labels: originalChart.data.labels,
        datasets: [
          {
            label: "Count",
            data: originalChart.data.datasets[0].data,
            backgroundColor: activeChart?.color || "rgb(75, 192, 192)",
          },
        ],
      },
      options: {
        indexAxis: isYearsChart ? "x" : ("y" as const),
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: activeChart?.title || "",
            color: textColor,
            font: {
              size: 16,
              weight: "bold" as const,
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: {
            display: false,
            labels: {
              color: textColor,
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(128, 128, 128, 0.1)",
            },
            ticks: {
              color: textColor,
              stepSize: 1,
              // @ts-ignore
              callback: function (this: any, value: number | string) {
                // Get the labels from the chart instance
                const labels = this.chart.data.labels;
                // Return the label corresponding to the index (value)
                return labels[Number(value)] || value;
              },
              maxRotation: 0,
              minRotation: 0,
            },
          },
          y: {
            grid: {
              display: isYearsChart,
              color: isYearsChart ? "rgba(128, 128, 128, 0.1)" : undefined,
            },
            ticks: {
              color: textColor,
              stepSize: 1,
              callback: function (value: number | string) {
                if (isYearsChart) {
                  const numValue = Number(value);
                  return Number.isInteger(numValue) ? numValue : null;
                }
                const labels = originalChart.data.labels;
                if (!Array.isArray(labels)) return value;
                const label = labels[Number(value)];
                if (typeof label !== "string") return value;

                const title = activeChart?.title || "";
                if (title === "Prevalent Publishers" && label.length > 10) {
                  return label.slice(0, 10) + "...";
                }
                if (label.length > 35) {
                  return label.slice(0, 35) + "...";
                }
                return label;
              },
            },
          },
        },
      },
    });

    return {
      destroy() {
        if (fullscreenChart) {
          fullscreenChart.destroy();
          fullscreenChart = null;
        }
      },
    };
  }

  onMount(() => {
    // Initialize Chart.js defaults with current theme
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    // Set initial Chart.js defaults
    Chart.defaults.color = textColor;
    Chart.defaults.plugins.title.color = textColor;
    Chart.defaults.plugins.legend.labels.color = textColor;
    Chart.defaults.scale.grid.color = "rgba(128, 128, 128, 0.1)";
    Chart.defaults.scale.ticks.color = textColor;

    // Start observing theme changes
    observer.observe(document.documentElement, { attributes: true });

    // Small delay to ensure theme is properly detected
    setTimeout(() => {
      loadData().then(() => {
        setupCharts();
      });
    }, 0);

    return () => {
      observer.disconnect();
      Object.values(charts).forEach((chart) => chart?.destroy());
    };
  });

  async function loadData() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    try {
      await Promise.all([
        literatureStore.loadLiterature(projectId),
        notesStore.loadNotes(projectId),
      ]);

      // Process notes to extract plain text content
      const processedNotes = notesStore.notes.map((note) => ({
        ...note,
        content: getPreview(note.content),
      }));

      const analysisData = await analyzeLiterature(
        literatureStore.data,
        processedNotes
      );

      data = { summary: analysisData };
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      isLoading = false;
    }
  }

  function createHorizontalBarChart(
    canvas: HTMLCanvasElement,
    labels: string[],
    data: number[],
    title: string,
    color: string = "rgb(75, 192, 192)"
  ): Chart {
    // Get text color based on theme
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    const chartOptions = {
      indexAxis: "y" as const,
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          color: textColor,
          font: {
            size: 16,
            weight: "bold" as const,
          },
          padding: {
            top: 10,
            bottom: 20,
          },
        },
        legend: {
          display: false,
          labels: {
            color: textColor,
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(128, 128, 128, 0.1)",
          },
          ticks: {
            color: textColor,
            stepSize: 1,
            callback: function (this: any, value: number | string) {
              const numValue = Number(value);
              if (Number.isInteger(numValue)) {
                return numValue;
              }
              return null;
            },
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: textColor,
            callback: function (this: any, value: any) {
              const label = labels[value];
              // For publisher chart, truncate to 10 characters
              if (title === "Prevalent Publishers" && label?.length > 10) {
                return label.slice(0, 10) + "...";
              }
              // For other charts, use standard length
              if (label?.length > 35) {
                return label.slice(0, 35) + "...";
              }
              return label;
            },
          },
        },
      },
    };

    if (labels.length === 0 || data.length === 0) {
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: ["No data"],
          datasets: [
            {
              label: "Count",
              data: [0],
              backgroundColor: "rgb(200, 200, 200)",
            },
          ],
        },
        options: chartOptions,
      });
    }

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: [...labels],
        datasets: [
          {
            label: "Count",
            data: [...data],
            backgroundColor: color,
          },
        ],
      },
      options: chartOptions,
    });
  }

  function setupCharts() {
    if (!data.summary) return;
    const summary = JSON.parse(JSON.stringify(data.summary));

    // Get text color based on theme
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    // Overview section
    if (canvasRefs.publishers) {
      charts.publishers = createHorizontalBarChart(
        canvasRefs.publishers,
        summary.topPublishers.names,
        summary.topPublishers.counts,
        "Prevalent Publishers",
        "rgb(54, 162, 235)"
      );
    }

    if (canvasRefs.keywords) {
      charts.keywords = createHorizontalBarChart(
        canvasRefs.keywords,
        summary.keywords.names,
        summary.keywords.counts,
        "Prevalent Keywords",
        "rgb(54, 162, 235)"
      );
    }

    if (canvasRefs.years) {
      if (summary.publicationYears.names.length === 0) {
        charts.years = new Chart(canvasRefs.years, {
          type: "bar",
          data: {
            labels: ["No data"],
            datasets: [
              {
                label: "Publications",
                data: [0],
                backgroundColor: "rgb(200, 200, 200)",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: "Distribution of Publication Years",
                color: textColor,
                font: {
                  size: 16,
                  weight: "bold" as const,
                },
                padding: {
                  top: 10,
                  bottom: 20,
                },
              },
              legend: {
                display: false,
                labels: {
                  color: textColor,
                },
              },
            },
            scales: {
              x: {
                grid: {
                  color: "rgba(128, 128, 128, 0.1)",
                },
                ticks: {
                  color: textColor,
                  stepSize: 1,
                  // @ts-ignore
                  callback: function (this: any, value: number | string) {
                    // Get the labels from the chart instance
                    const labels = this.chart.data.labels;
                    // Return the label corresponding to the index (value)
                    return labels[Number(value)] || value;
                  },
                  maxRotation: 0,
                  minRotation: 0,
                },
              },
              y: {
                grid: {
                  color: "rgba(128, 128, 128, 0.1)",
                },
                ticks: {
                  color: textColor,
                  stepSize: 1,
                  callback: function (this: any, value: number | string) {
                    const numValue = Number(value);
                    if (Number.isInteger(numValue)) {
                      return numValue;
                    }
                    return null;
                  },
                },
              },
            },
          },
        });
      } else {
        charts.years = new Chart(canvasRefs.years, {
          type: "bar",
          data: {
            labels: [...summary.publicationYears.names],
            datasets: [
              {
                label: "Publications",
                data: [...summary.publicationYears.counts],
                backgroundColor: "rgb(255, 206, 86)",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: "Distribution of Publication Years",
                color: textColor,
                font: {
                  size: 16,
                  weight: "bold" as const,
                },
                padding: {
                  top: 10,
                  bottom: 20,
                },
              },
              legend: {
                display: false,
                labels: {
                  color: textColor,
                },
              },
            },
            scales: {
              x: {
                grid: {
                  color: "rgba(128, 128, 128, 0.1)",
                },
                ticks: {
                  color: textColor,
                  stepSize: 1,
                  // @ts-ignore
                  callback: function (this: any, value: number | string) {
                    // Get the labels from the chart instance
                    const labels = this.chart.data.labels;
                    // Return the label corresponding to the index (value)
                    return labels[Number(value)] || value;
                  },
                  maxRotation: 0,
                  minRotation: 0,
                },
              },
              y: {
                grid: {
                  color: "rgba(128, 128, 128, 0.1)",
                },
                ticks: {
                  color: textColor,
                  stepSize: 1,
                  callback: function (this: any, value: number | string) {
                    const numValue = Number(value);
                    if (Number.isInteger(numValue)) {
                      return numValue;
                    }
                    return null;
                  },
                },
              },
            },
          },
        });
      }
    }

    if (canvasRefs.types) {
      charts.types = createHorizontalBarChart(
        canvasRefs.types,
        summary.literatureTypes.names,
        summary.literatureTypes.counts,
        "Types of Literature",
        "rgb(255, 206, 86)"
      );
    }

    // Notes content analysis
    if (canvasRefs.notesNouns) {
      charts.notesNouns = createHorizontalBarChart(
        canvasRefs.notesNouns,
        summary.nounsWordCounts.names,
        summary.nounsWordCounts.counts,
        "Notes - Prevalent Nouns",
        "rgb(54, 162, 235)"
      );
    }

    if (canvasRefs.notesVerbs) {
      charts.notesVerbs = createHorizontalBarChart(
        canvasRefs.notesVerbs,
        summary.verbsWordCounts.names,
        summary.verbsWordCounts.counts,
        "Notes - Prevalent Verbs",
        "rgb(54, 162, 235)"
      );
    }

    if (canvasRefs.notesAdjectives) {
      charts.notesAdjectives = createHorizontalBarChart(
        canvasRefs.notesAdjectives,
        summary.adjectivesWordCounts.names,
        summary.adjectivesWordCounts.counts,
        "Notes - Prevalent Adjectives",
        "rgb(54, 162, 235)"
      );
    }

    // Literature title analysis
    if (canvasRefs.litNouns) {
      charts.litNouns = createHorizontalBarChart(
        canvasRefs.litNouns,
        summary.literatureNounsWordCounts.names,
        summary.literatureNounsWordCounts.counts,
        "Literature Titles - Prevalent Nouns",
        "rgb(54, 162, 235)"
      );
    }

    if (canvasRefs.litVerbs) {
      charts.litVerbs = createHorizontalBarChart(
        canvasRefs.litVerbs,
        summary.literatureVerbsWordCounts.names,
        summary.literatureVerbsWordCounts.counts,
        "Literature Titles - Prevalent Verbs",
        "rgb(54, 162, 235)"
      );
    }

    if (canvasRefs.litAdjectives) {
      charts.litAdjectives = createHorizontalBarChart(
        canvasRefs.litAdjectives,
        summary.literatureAdjectivesWordCounts.names,
        summary.literatureAdjectivesWordCounts.counts,
        "Literature Titles - Prevalent Adjectives",
        "rgb(54, 162, 235)"
      );
    }

    // Research design analysis
    if (canvasRefs.researchDesigns) {
      charts.researchDesigns = createHorizontalBarChart(
        canvasRefs.researchDesigns,
        summary.researchDesigns.names,
        summary.researchDesigns.counts,
        "Prevalent Research Designs",
        "rgb(180, 30, 50)"
      );
    }

    if (canvasRefs.samplingDesigns) {
      charts.samplingDesigns = createHorizontalBarChart(
        canvasRefs.samplingDesigns,
        summary.samplingDesigns.names,
        summary.samplingDesigns.counts,
        "Prevalent Sampling Designs",
        "rgb(180, 30, 50)"
      );
    }

    if (canvasRefs.measurementDesigns) {
      charts.measurementDesigns = createHorizontalBarChart(
        canvasRefs.measurementDesigns,
        summary.measurementDesigns.names,
        summary.measurementDesigns.counts,
        "Prevalent Measurement Designs",
        "rgb(180, 30, 50)"
      );
    }

    if (canvasRefs.analyticDesigns) {
      charts.analyticDesigns = createHorizontalBarChart(
        canvasRefs.analyticDesigns,
        summary.analyticDesigns.names,
        summary.analyticDesigns.counts,
        "Prevalent Analytic Designs",
        "rgb(180, 30, 50)"
      );
    }
  }
</script>

<div class="analytics-container">
  <h1 class="text-3xl font-bold mb-6">Analytics</h1>

  <Dialog.Root
    open={!!activeChart}
    onOpenChange={(open: boolean) => !open && closeFullscreen()}
  >
    <Dialog.Content class="fullscreen-dialog">
      <div class="fullscreen-canvas-container">
        <canvas id="fullscreen-canvas"></canvas>
      </div>
    </Dialog.Content>
  </Dialog.Root>

  {#if isLoading}
    <div class="loading">Loading data...</div>
  {:else if !data.summary}
    <div class="no-data">
      <h3>No data to analyze yet!</h3>
      <p>Add literature and notes to see your analytics.</p>
    </div>
  {:else}
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => (activeTab = value)}
      class="space-y-6"
    >
      <Tabs.List class="inline-flex h-10 items-center justify-center gap-4">
        <Tabs.Trigger value="overview" class="tab-button">
          <PieChart class="h-4 w-4 mr-2" />
          Overview
        </Tabs.Trigger>
        <Tabs.Trigger value="notes" class="tab-button">
          <FileText class="h-4 w-4 mr-2" />
          Notes Analysis
        </Tabs.Trigger>
        <Tabs.Trigger value="literature" class="tab-button">
          <BookText class="h-4 w-4 mr-2" />
          Literature Analysis
        </Tabs.Trigger>
        <Tabs.Trigger value="research" class="tab-button">
          <FlaskConical class="h-4 w-4 mr-2" />
          Research Design
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="overview" class="space-y-6">
        <div class="charts-grid">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.publishers,
                  "Prevalent Publishers",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.publishers}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.keywords,
                  "Prevalent Keywords",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.keywords}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.years,
                  "Distribution of Publication Years",
                  "rgb(255, 206, 86)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.years}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.types,
                  "Types of Literature",
                  "rgb(255, 206, 86)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.types}></canvas>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="notes" class="space-y-6">
        <div class="charts-grid">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.notesNouns,
                  "Notes - Prevalent Nouns",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.notesNouns}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.notesVerbs,
                  "Notes - Prevalent Verbs",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.notesVerbs}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.notesAdjectives,
                  "Notes - Prevalent Adjectives",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.notesAdjectives}></canvas>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="literature" class="space-y-6">
        <div class="charts-grid">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.litNouns,
                  "Literature Titles - Prevalent Nouns",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.litNouns}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.litVerbs,
                  "Literature Titles - Prevalent Verbs",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.litVerbs}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.litAdjectives,
                  "Literature Titles - Prevalent Adjectives",
                  "rgb(54, 162, 235)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.litAdjectives}></canvas>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="research" class="space-y-6">
        <div class="charts-grid">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.researchDesigns,
                  "Prevalent Research Designs",
                  "rgb(180, 30, 50)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.researchDesigns}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.samplingDesigns,
                  "Prevalent Sampling Designs",
                  "rgb(180, 30, 50)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.samplingDesigns}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.measurementDesigns,
                  "Prevalent Measurement Designs",
                  "rgb(180, 30, 50)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.measurementDesigns}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label="View chart in fullscreen"
              onclick={() =>
                openFullscreen(
                  canvasRefs.analyticDesigns,
                  "Prevalent Analytic Designs",
                  "rgb(180, 30, 50)"
                )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            </button>
            <canvas bind:this={canvasRefs.analyticDesigns}></canvas>
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  {/if}
</div>

<svelte:window
  on:resize={() => {
    if (fullscreenChart) {
      fullscreenChart.resize();
    }
  }}
/>

<svelte:head>
  {#if activeChart}
    <Dialog.Portal>
      <div use:createFullscreenChart></div>
    </Dialog.Portal>
  {/if}
</svelte:head>

<style>
  .analytics-container {
    padding: 2rem;
    max-width: 1600px;
    margin: 0 auto;
  }

  h1 {
    margin-bottom: 2rem;
    font-size: 2rem;
    font-weight: 600;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 2rem;
  }

  .chart-card {
    position: relative;
    background: var(--card);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
    min-height: 400px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgb(0 0 0 / 0.2);
  }

  :global(.dark) .chart-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  }

  .chart-card canvas {
    width: 100% !important;
    height: 350px !important;
    margin: auto;
    padding: 1rem;
    background: var(--card);
    border-radius: 0.5rem;
    border: 1px solid rgb(0 0 0 / 0.2);
  }

  :global(.dark) .chart-card canvas {
    background: hsl(var(--card));
    border-color: hsl(var(--border));
  }

  .loading,
  .no-data {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    color: var(--text-2);
  }

  .no-data h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  /* Add responsive adjustments */
  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }

    .chart-card {
      min-height: 300px;
    }

    .chart-card canvas {
      height: 250px !important;
    }
  }

  .fullscreen-button {
    position: absolute;
    top: 2rem;
    right: 2rem;
    z-index: 10;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--foreground);
    cursor: pointer;
    opacity: 0.7;
    transition:
      opacity 0.2s,
      background-color 0.2s;
  }

  .fullscreen-button:hover {
    opacity: 1;
    background: var(--accent);
  }

  .fullscreen-canvas-container {
    width: 90%;
    height: calc(85vh - 10rem);
    padding: 2rem;
    margin: 0 auto;
  }

  .fullscreen-canvas-container canvas {
    width: 100% !important;
    height: 100% !important;
  }

  :global(.fullscreen-dialog) {
    max-width: 90vw;
    max-height: 90vh;
    margin: 2.5vh auto;
  }

  .tab-button {
    @apply inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold;
  }
</style>
