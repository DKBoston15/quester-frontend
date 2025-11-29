<script lang="ts">
  import { onMount } from "svelte";
  import { Chart } from "chart.js/auto";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import { notesStore } from "$lib/stores/NotesStore";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { analyzeLiterature, extractTextFromTipTap } from "./analytics/utils";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import {
    PieChart,
    FileText,
    BookText,
    FlaskConical,
    GraduationCap,
    Info,
  } from "lucide-svelte";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import EmptyState from "$lib/components/ui/empty-state/EmptyState.svelte";
  import KeyInsights from "$lib/components/analytics/KeyInsights.svelte";
  import { insightsStore } from "$lib/stores/InsightsStore";
  import { get } from "svelte/store";
  import { _ } from "svelte-i18n";

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
          if (chart?.options?.plugins?.legend?.labels) {
            chart.options.plugins.legend.labels.color = textColor;
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
        if (fullscreenChart?.options?.plugins?.legend?.labels) {
          fullscreenChart.options.plugins.legend.labels.color = textColor;
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

  interface DataCounts {
    [key: string]: number;
  }

  interface AnalyticsData {
    summary: {
      totalLiteratureCount?: number;
      totalNotesCount?: number;
      keywords: { names: string[]; counts: number[] };
      topAuthors: { names: string[]; counts: number[] };
      topPublishers: { names: string[]; counts: number[] };
      publicationYears: { names: string[]; counts: number[] };
      publicationYearFrequency?: { names: string[]; counts: number[] };
      literatureTypes: { names: string[]; counts: number[] };
      noteTypes?: { names: string[]; counts: number[] };
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
      yearTypeMatrix: {
        years: string[];
        types: string[];
        datasets: { type: string; data: number[] }[];
      };
    } | null;
  }

  let activeTab = $state("overview");
  let isLoading = $state(true);
  let data = $state<AnalyticsData>({ summary: null });
  let yearChartMode = $state<"individual" | "frequency">("individual");
  let switchPressed = $state(false);

  // Canvas references
  let canvasRefs = $state<Record<string, HTMLCanvasElement | null>>({
    publishers: null,
    keywords: null,
    years: null,
    types: null,
    noteTypes: null,
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
    yearTypeStacked: null,
  });

  // Chart instances
  let charts: Record<string, Chart> = {};

  let activeChart: {
    canvas: HTMLCanvasElement | null;
    title: string;
    color: string;
  } | null = $state(null);
  let fullscreenChart: Chart | null = null;

  // driver.js setup
  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#analytics-header",
        popover: {
          title: get(_)('analyticsTutorial.exploreAnalytics.title'),
          description: get(_)('analyticsTutorial.exploreAnalytics.description'),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#analytics-tabs",
        popover: {
          title: get(_)('analyticsTutorial.navigateViews.title'),
          description: get(_)('analyticsTutorial.navigateViews.description'),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#overview-charts",
        popover: {
          title: get(_)('analyticsTutorial.projectOverview.title'),
          description: get(_)('analyticsTutorial.projectOverview.description'),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#notes-charts",
        popover: {
          title: get(_)('analyticsTutorial.notesContentAnalysis.title'),
          description: get(_)('analyticsTutorial.notesContentAnalysis.description'),
          side: "top",
          align: "start",
        },
        onHighlighted: () => {
          // Switch to the 'notes' tab if not already active
          if (activeTab !== "notes") activeTab = "notes";
        },
      },
      {
        element: "#literature-charts",
        popover: {
          title: get(_)('analyticsTutorial.literatureTitleAnalysis.title'),
          description: get(_)('analyticsTutorial.literatureTitleAnalysis.description'),
          side: "top",
          align: "start",
        },
        onHighlighted: () => {
          // Switch to the 'literature' tab
          if (activeTab !== "literature") activeTab = "literature";
        },
      },
      {
        element: "#research-charts",
        popover: {
          title: get(_)('analyticsTutorial.researchDesignInsights.title'),
          description: get(_)('analyticsTutorial.researchDesignInsights.description'),
          side: "top",
          align: "start",
        },
        onHighlighted: () => {
          // Switch to the 'research' tab
          if (activeTab !== "research") activeTab = "research";
        },
      },
      {
        element: "#fullscreen-button-example",
        popover: {
          title: get(_)('analyticsTutorial.viewFullscreen.title'),
          description: get(_)('analyticsTutorial.viewFullscreen.description'),
          side: "left",
          align: "start",
        },
        onHighlighted: () => {
          // Switch back to overview tab for context
          if (activeTab !== "overview") activeTab = "overview";
        },
      },
      {
        element: ".stacked-chart-card",
        popover: {
          title: get(_)('analyticsTutorial.literatureTypesByYear.title'),
          description: get(_)('analyticsTutorial.literatureTypesByYear.description'),
          side: "top",
          align: "center",
        },
        onHighlighted: () => {
          // Ensure overview tab is active
          if (activeTab !== "overview") activeTab = "overview";
        },
      },
      {
        element: ".analytics-container", // General container if no data
        popover: {
          title: get(_)('analyticsTutorial.noDataYet.title'),
          description: get(_)('analyticsTutorial.noDataYet.description'),
          side: "top",
          align: "center",
        },
        onHighlighted: () => {
          // Ensure overview tab is active if switching back
          if (activeTab !== "overview") activeTab = "overview";
        },
      },
      {
        element: ".analytics-container",
        popover: {
          title: get(_)('analyticsTutorial.gainDeeperInsights.title'),
          description: get(_)('analyticsTutorial.gainDeeperInsights.description'),
          side: "top",
          align: "center",
        },
      },
    ],
  });

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

    const originalChartKey = Object.keys(charts).find(
      (key) => canvasRefs[key] === activeChart?.canvas
    );
    const originalChart = charts[originalChartKey || ""];

    if (!originalChart) return;

    const fullscreenCanvas = document.getElementById(
      "fullscreen-canvas"
    ) as HTMLCanvasElement;
    if (!fullscreenCanvas) return;

    // Get text color from current theme
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    // Check if this is the years chart or stacked chart
    const isYearsChart =
      activeChart.title === "Distribution of Publication Years" ||
      activeChart.title === "Publication Year Frequency Distribution";
    const isStackedChart =
      activeChart.title === "Literature Types by Publication Year";

    if (isStackedChart) {
      const stackedData = data.summary?.yearTypeMatrix;
      if (stackedData) {
        const plainStackedData = {
          years: [...stackedData.years],
          types: [...stackedData.types],
          datasets: stackedData.datasets.map(
            (d: { type: string; data: number[] }) => ({
              type: d.type,
              data: [...d.data],
            })
          ),
        };
        fullscreenChart = createStackedBarChart(
          fullscreenCanvas,
          plainStackedData,
          activeChart.title
        );
      }
    } else {
      // For years chart, use dynamic data based on mode
      if (isYearsChart) {
        const summary = JSON.parse(JSON.stringify(data.summary));
        const isFrequencyMode = yearChartMode === "frequency";
        const chartData = isFrequencyMode
          ? summary.publicationYearFrequency || { names: [], counts: [] }
          : summary.publicationYears;
        const chartColor = isFrequencyMode
          ? "rgb(147, 197, 253)"
          : "rgb(255, 206, 86)";

        fullscreenChart = new Chart(fullscreenCanvas, {
          type: "bar",
          data: {
            labels: chartData.names || [],
            datasets: [
              {
                label: get(_)('projectActivityChart.count'),
                data: chartData.counts || [],
                backgroundColor: chartColor,
              },
            ],
          },
          options: {
            indexAxis: "x",
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                left: 10,
                right: 10,
                top: 5,
                bottom: 5,
              },
            },
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
                  maxRotation: 45,
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
                  callback: function (value: number | string) {
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
        // Create a new chart with the same data but adjusted options for fullscreen
        fullscreenChart = new Chart(fullscreenCanvas, {
          type: "bar",
          data: {
            labels: originalChart.data.labels,
            datasets: [
              {
                label: get(_)('projectActivityChart.count'),
                data: originalChart.data.datasets[0].data,
                backgroundColor: activeChart?.color || "rgb(75, 192, 192)",
              },
            ],
          },
          options: {
            indexAxis: isYearsChart ? "x" : ("y" as const),
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                left: 10,
                right: 10,
                top: 5,
                bottom: 5,
              },
            },
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
                    // Check if the indexAxis is 'y' (horizontal bar chart)
                    if (this.chart.options.indexAxis === "y") {
                      // For horizontal bars, x-axis is numerical count
                      const numValue = Number(value);
                      return Number.isInteger(numValue) ? numValue : null;
                    } else {
                      // For vertical bars (like Years), x-axis uses labels
                      const labels = this.chart.data.labels;
                      return labels[Number(value)] || value;
                    }
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
      }
    }

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

  // Auto-generate insights if conditions are met
  async function tryAutoGenerateInsights(
    projectId: string,
    analyticsData: any
  ) {
    try {
      // Check if we can generate insights (daily limit not reached)
      if (!insightsStore.canGenerateInsights(projectId)) {
        return;
      }

      // Check if there are existing insights for this project
      const existingInsights = insightsStore.getInsights(projectId);

      // Check if we have significant data to warrant insights generation
      const hasSignificantData =
        (analyticsData.totalLiteratureCount || 0) >= 5 || // At least 5 pieces of literature
        (analyticsData.totalNotesCount || 0) >= 3; // Or at least 3 notes

      if (!hasSignificantData) {
        return;
      }

      // If no existing insights, auto-generate
      if (existingInsights.length === 0) {
        await insightsStore.generateInsights(projectId, false, analyticsData);
        return;
      }

      // If significant change in data (more than 25% increase), auto-generate
      const lastUpdate = insightsStore.getLastUpdated(projectId);
      if (lastUpdate) {
        const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();
        const hoursOld = timeSinceLastUpdate / (1000 * 60 * 60);

        // Auto-regenerate if insights are more than 24 hours old and we have new data
        if (hoursOld > 24) {
          await insightsStore.generateInsights(projectId, false, analyticsData);
        }
      }
    } catch (error) {
      console.error("Error in auto-generation:", error);
    }
  }

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

      // Auto-generate insights if there's significant new data and we can generate
      await tryAutoGenerateInsights(projectId, analysisData);
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
      maintainAspectRatio: false,
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
          labels: [get(_)('projectActivityChart.noData')],
          datasets: [
            {
              label: get(_)('projectActivityChart.count'),
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
            label: get(_)('projectActivityChart.count'),
            data: [...data],
            backgroundColor: color,
          },
        ],
      },
      options: chartOptions,
    });
  }

  function createStackedBarChart(
    canvas: HTMLCanvasElement,
    yearTypeData: {
      years: string[];
      types: string[];
      datasets: { type: string; data: number[] }[];
    },
    title: string
  ): Chart {
    // Get text color based on theme
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    // Define colors for different literature types
    const typeColors: Record<string, string> = {
      "Journal Article": "rgb(54, 162, 235)",
      "Literature Review": "rgb(255, 99, 132)",
      Book: "rgb(255, 206, 86)",
      "Book Chapter": "rgb(75, 192, 192)",
      "Conference Presentation": "rgb(153, 102, 255)",
      "Conference Proceedings": "rgb(255, 159, 64)",
      Dissertation: "rgb(199, 199, 199)",
      Website: "rgb(83, 102, 255)",
      "Gray Literature": "rgb(255, 99, 255)",
      Other: "rgb(128, 128, 128)",
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 5,
          bottom: 5,
        },
      },
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
          display: true,
          labels: {
            color: textColor,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            color: "rgba(128, 128, 128, 0.1)",
          },
          ticks: {
            color: textColor,
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          stacked: true,
          grid: {
            color: "rgba(128, 128, 128, 0.1)",
          },
          ticks: {
            color: textColor,
            stepSize: 1,
            callback: function (value: number | string) {
              const numValue = Number(value);
              if (Number.isInteger(numValue)) {
                return numValue;
              }
              return null;
            },
          },
        },
      },
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      categoryPercentage: 0.9,
      barPercentage: 0.95,
    };

    if (yearTypeData.years.length === 0 || yearTypeData.datasets.length === 0) {
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: [get(_)('projectActivityChart.noData')],
          datasets: [
            {
              label: get(_)('projectActivityChart.count'),
              data: [0],
              backgroundColor: "rgb(200, 200, 200)",
            },
          ],
        },
        options: chartOptions,
      });
    }

    const plainYears = [...yearTypeData.years];
    const plainDatasets = yearTypeData.datasets.map((dataset, index) => ({
      label: dataset.type,
      data: [...dataset.data],
      backgroundColor:
        typeColors[dataset.type] || `hsl(${(index * 137.508) % 360}, 70%, 50%)`,
      borderColor:
        typeColors[dataset.type] || `hsl(${(index * 137.508) % 360}, 70%, 40%)`,
      borderWidth: 1,
    }));

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: plainYears,
        datasets: plainDatasets,
      },
      options: chartOptions,
    });
  }

  function createYearChart() {
    if (!data.summary || !canvasRefs.years) return;

    // Destroy existing chart
    if (charts.years) {
      charts.years.destroy();
    }

    const summary = JSON.parse(JSON.stringify(data.summary));
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#000000";

    const isFrequencyMode = yearChartMode === "frequency";
    const chartData = isFrequencyMode
      ? summary.publicationYearFrequency || { names: [], counts: [] }
      : summary.publicationYears;
    const chartTitle = isFrequencyMode
      ? "Publication Year Frequency Distribution"
      : "Distribution of Publication Years";
    const chartColor = isFrequencyMode
      ? "rgb(147, 197, 253)"
      : "rgb(255, 206, 86)";

    if (chartData.names.length === 0) {
      charts.years = new Chart(canvasRefs.years, {
        type: "bar",
        data: {
          labels: [get(_)('projectActivityChart.noData')],
          datasets: [
            {
              label: get(_)('projectActivityChart.publications'),
              data: [0],
              backgroundColor: "rgb(200, 200, 200)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: chartTitle,
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
          labels: [...chartData.names],
          datasets: [
            {
              label: get(_)('projectActivityChart.publications'),
              data: [...chartData.counts],
              backgroundColor: chartColor,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: chartTitle,
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

  // Sync switch state with yearChartMode
  $effect(() => {
    switchPressed = yearChartMode === "frequency";
  });

  // React to yearChartMode changes
  $effect(() => {
    if (data.summary) {
      createYearChart();
    }
  });

  // Effect to recreate fullscreen chart when year chart mode changes
  $effect(() => {
    if (
      fullscreenChart &&
      activeChart &&
      (activeChart.title === "Distribution of Publication Years" ||
        activeChart.title === "Publication Year Frequency Distribution")
    ) {
      fullscreenChart.destroy();
      fullscreenChart = null;
      // Trigger chart recreation
      setTimeout(() => {
        const fullscreenCanvas = document.getElementById(
          "fullscreen-canvas"
        ) as HTMLCanvasElement;
        if (fullscreenCanvas) {
          createFullscreenChart(fullscreenCanvas.parentElement!);
        }
      }, 0);
    }
  });

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

    // Year chart is now handled by createYearChart() function
    createYearChart();

    if (canvasRefs.types) {
      charts.types = createHorizontalBarChart(
        canvasRefs.types,
        summary.literatureTypes.names,
        summary.literatureTypes.counts,
        "Types of Literature",
        "rgb(255, 206, 86)"
      );
    }

    if (canvasRefs.noteTypes) {
      const noteTypesData = summary.noteTypes || { names: [], counts: [] };
      charts.noteTypes = createHorizontalBarChart(
        canvasRefs.noteTypes,
        noteTypesData.names,
        noteTypesData.counts,
        "Note Section Types",
        "rgb(34, 197, 94)"
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

    if (canvasRefs.yearTypeStacked) {
      const plainYearTypeData = {
        years: [...summary.yearTypeMatrix.years],
        types: [...summary.yearTypeMatrix.types],
        datasets: summary.yearTypeMatrix.datasets.map(
          (d: { type: string; data: number[] }) => ({
            type: d.type,
            data: [...d.data],
          })
        ),
      };
      charts.yearTypeStacked = createStackedBarChart(
        canvasRefs.yearTypeStacked,
        plainYearTypeData,
        "Literature Types by Publication Year"
      );
    }
  }
</script>

<div class="analytics-container">
  <div class="flex justify-between items-center mb-6" id="analytics-header">
    <div class="flex items-center gap-2">
      <h1 class="text-3xl font-bold">{$_('analytics.title')}</h1>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Info class="h-5 w-5 text-muted-foreground" />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p class="text-sm max-w-xs">
            {$_('analytics.projectAnalyticsTooltip')}
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button variant="outline" onclick={() => driverObj.drive()}>
            <GraduationCap class="h-4 w-4 mr-2" />
            {$_('dashboard.tour')}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{$_('dashboard.tutorial')}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </div>

  <Dialog.Root
    open={!!activeChart}
    onOpenChange={(open: boolean) => !open && closeFullscreen()}
  >
    <Dialog.Content class="fullscreen-dialog">
      <div class="fullscreen-canvas-container">
        {#if activeChart && (activeChart.title === "Distribution of Publication Years" || activeChart.title === "Publication Year Frequency Distribution")}
          <div class="fullscreen-controls">
            <div
              class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2"
            >
              <span
                class="text-sm font-medium {yearChartMode === 'individual'
                  ? 'text-foreground'
                  : 'text-muted-foreground'}"
              >
                Individual
              </span>
              <Switch
                bind:pressed={switchPressed}
                onPressedChange={(pressed: boolean) => {
                  yearChartMode = pressed ? "frequency" : "individual";
                  // Update the active chart title
                  if (activeChart) {
                    activeChart.title =
                      yearChartMode === "individual"
                        ? "Distribution of Publication Years"
                        : "Publication Year Frequency Distribution";
                    activeChart.color =
                      yearChartMode === "individual"
                        ? "rgb(255, 206, 86)"
                        : "rgb(147, 197, 253)";
                  }
                  // Recreate the fullscreen chart with new mode
                  if (fullscreenChart) {
                    fullscreenChart.destroy();
                    fullscreenChart = null;
                  }
                  // Immediately recreate the chart
                  setTimeout(() => {
                    const fullscreenCanvas = document.getElementById(
                      "fullscreen-canvas"
                    ) as HTMLCanvasElement;
                    if (fullscreenCanvas) {
                      createFullscreenChart(fullscreenCanvas.parentElement!);
                    }
                  }, 0);
                }}
                aria-label={$_('ariaLabels.toggleYearsTimePeriods')}
              />
              <span
                class="text-sm font-medium {yearChartMode === 'frequency'
                  ? 'text-foreground'
                  : 'text-muted-foreground'}"
              >
                Time Periods
              </span>
            </div>
          </div>
        {/if}
        <canvas id="fullscreen-canvas"></canvas>
      </div>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Key Insights Section -->
  {#if projectStore.currentProject}
    <KeyInsights
      projectId={projectStore.currentProject.id}
      analyticsData={data?.summary}
    />
  {/if}

  {#if isLoading}
    <div class="loading">{$_('analytics.loadingData')}</div>
  {:else if !data.summary}
    <div id="analytics-no-data">
      <EmptyState
        title={$_('analytics.noDataToAnalyze')}
        description={$_('emptyStateDescriptions.addLiteratureForAnalytics')}
        variant="data-empty"
        height="h-96"
      />
    </div>
  {:else}
    <Tabs.Root
      value={activeTab}
      onValueChange={(value: string) => (activeTab = value)}
      class="space-y-6"
    >
      <Tabs.List
        class="inline-flex h-10 items-center justify-center gap-4"
        id="analytics-tabs"
      >
        <Tabs.Trigger value="overview" class="tab-button">
          <PieChart class="h-4 w-4 mr-2" />
          {$_('analytics.tabs.overview')}
        </Tabs.Trigger>
        <Tabs.Trigger value="notes" class="tab-button">
          <FileText class="h-4 w-4 mr-2" />
          {$_('analytics.tabs.notesAnalysis')}
        </Tabs.Trigger>
        <Tabs.Trigger value="literature" class="tab-button">
          <BookText class="h-4 w-4 mr-2" />
          {$_('analytics.tabs.literatureAnalysis')}
        </Tabs.Trigger>
        <Tabs.Trigger value="research" class="tab-button">
          <FlaskConical class="h-4 w-4 mr-2" />
          {$_('analytics.tabs.designsAnalysis')}
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="overview" class="space-y-6">
        <div class="charts-grid" id="overview-charts">
          <div class="chart-card">
            <button
              id="fullscreen-button-example"
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
            <div class="chart-controls">
              <div
                class="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2"
              >
                <span
                  class="text-sm font-medium {yearChartMode === 'individual'
                    ? 'text-foreground'
                    : 'text-muted-foreground'}"
                >
                  Individual
                </span>
                <Switch
                  bind:pressed={switchPressed}
                  onPressedChange={(pressed: boolean) => {
                    yearChartMode = pressed ? "frequency" : "individual";
                  }}
                  aria-label={$_('ariaLabels.toggleYearsTimePeriods')}
                />
                <span
                  class="text-sm font-medium {yearChartMode === 'frequency'
                    ? 'text-foreground'
                    : 'text-muted-foreground'}"
                >
                  Time Periods
                </span>
              </div>
              <button
                class="fullscreen-button"
                aria-label={$_('analytics.viewChartFullscreen')}
                onclick={() =>
                  openFullscreen(
                    canvasRefs.years,
                    yearChartMode === "individual"
                      ? "Distribution of Publication Years"
                      : "Publication Year Frequency Distribution",
                    yearChartMode === "individual"
                      ? "rgb(255, 206, 86)"
                      : "rgb(147, 197, 253)"
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
            </div>
            <canvas bind:this={canvasRefs.years}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
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
          <div class="chart-card stacked-chart-card">
            <button
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
              onclick={() =>
                openFullscreen(
                  canvasRefs.yearTypeStacked,
                  "Literature Types by Publication Year",
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
            <canvas bind:this={canvasRefs.yearTypeStacked}></canvas>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="notes" class="space-y-6">
        <div class="charts-grid" id="notes-charts">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
              onclick={() =>
                openFullscreen(
                  canvasRefs.noteTypes,
                  "Note Section Types",
                  "rgb(34, 197, 94)"
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
            <canvas bind:this={canvasRefs.noteTypes}></canvas>
          </div>
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
        <div class="charts-grid" id="literature-charts">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
        <div class="charts-grid" id="research-charts">
          <div class="chart-card">
            <button
              class="fullscreen-button"
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
              aria-label={$_('analytics.viewChartFullscreen')}
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
    padding-top: 4rem;
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

  .loading {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    color: var(--text-2);
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

  .chart-controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    max-width: calc(100% - 2rem);
  }

  .fullscreen-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
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

  .chart-controls .fullscreen-button {
    position: relative;
    top: auto;
    right: auto;
  }

  .fullscreen-canvas-container {
    width: 90%;
    height: calc(85vh - 10rem);
    padding: 2rem;
    padding-top: 4rem;
    margin: 0 auto;
    position: relative;
  }

  .fullscreen-controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 20;
    max-width: calc(100% - 2rem);
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
</style>
