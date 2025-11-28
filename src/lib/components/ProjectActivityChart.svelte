<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Chart from "chart.js/auto";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  const t = (key: string) => get(_)(key);

  interface ActivityCount {
    literature: number;
    notes: number;
    models: number;
    outcomes: number;
  }

  interface DailyActivityCounts {
    [date: string]: ActivityCount;
  }

  let {
    dailyActivityCounts = {},
    projectName = "Project Activity",
    dateRange = "all",
  } = $props<{
    dailyActivityCounts: DailyActivityCounts;
    projectName: string;
    dateRange: "7" | "14" | "30" | "all";
  }>();

  // Chart configuration and state
  let chartCanvas: HTMLCanvasElement;
  let chartInstance: Chart | null = null;
  let chartError: string | null = null;
  let hasData: boolean = false;

  // Gets text color based on light/dark theme
  function getTextColor(): string {
    if (typeof document === "undefined") return "#000000"; // Default for SSR
    return document.documentElement.classList.contains("dark")
      ? "#ffffff"
      : "#000000";
  }

  // Create the chart when the component is mounted
  onMount(() => {
    // Destroy any previous chart instance if it exists
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    // Force a reset of state
    chartError = null;

    // Immediately check for data and initialize the chart
    if (chartCanvas) {
      initializeChart();
    } else {
      // Only use a timeout if canvas isn't available yet
      setTimeout(() => {
        if (chartCanvas) {
          initializeChart();
        } else {
          console.error(
            `[CHART ${projectName}] Canvas still not available after timeout`
          );
        }
      }, 50);
    }

    // Clean up on component destruction
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  });

  // Prepare chart data from dailyActivityCounts, filtered by dateRange
  function prepareChartData(): { labels: string[]; datasets: any[] } | null {
    const countsData = { ...dailyActivityCounts } as DailyActivityCounts;
    if (!countsData || Object.keys(countsData).length === 0) {
      return null;
    }

    try {
      // Get all dates and sort them
      const allSortedDates = Object.keys(countsData).sort();

      // Filter dates based on the selected range
      let filteredDates: string[];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      switch (dateRange) {
        case "7":
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 6); // Include today + 6 previous days
          filteredDates = allSortedDates.filter((date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d >= sevenDaysAgo && d <= today;
          });
          break;
        case "14":
          const fourteenDaysAgo = new Date(today);
          fourteenDaysAgo.setDate(today.getDate() - 13);
          filteredDates = allSortedDates.filter((date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d >= fourteenDaysAgo && d <= today;
          });
          break;
        case "30":
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 29);
          filteredDates = allSortedDates.filter((date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d >= thirtyDaysAgo && d <= today;
          });
          break;
        default: // 'all'
          filteredDates = allSortedDates;
          break;
      }

      if (filteredDates.length === 0) {
        return null;
      }

      // Format dates for display
      const formattedDates = filteredDates.map((date) => {
        const [year, month, day] = date.split("-");
        return `${month}/${day}`;
      });

      // Validate that we have activity data within the filtered range
      let hasAnyActivity = false;

      // Create datasets using only filtered dates
      const literatureData = filteredDates.map((date) => {
        const count = countsData[date]?.literature || 0;
        if (count > 0) hasAnyActivity = true;
        return count;
      });

      const notesData = filteredDates.map((date) => {
        const count = countsData[date]?.notes || 0;
        if (count > 0) hasAnyActivity = true;
        return count;
      });

      const modelsData = filteredDates.map((date) => {
        const count = countsData[date]?.models || 0;
        if (count > 0) hasAnyActivity = true;
        return count;
      });

      const outcomesData = filteredDates.map((date) => {
        const count = countsData[date]?.outcomes || 0;
        if (count > 0) hasAnyActivity = true;
        return count;
      });

      // If no activity data is found in the filtered range, return null
      if (!hasAnyActivity) {
        return null;
      }

      // Return chart data structure
      return {
        labels: formattedDates,
        datasets: [
          {
            label: t("common.projectActivityChart.literature"),
            data: literatureData,
            backgroundColor: "#007bff",
          },
          {
            label: t("common.projectActivityChart.notes"),
            data: notesData,
            backgroundColor: "#28a745"
          },
          {
            label: t("common.projectActivityChart.models"),
            data: modelsData,
            backgroundColor: "#ffc107"
          },
          {
            label: t("common.projectActivityChart.outcomes"),
            data: outcomesData,
            backgroundColor: "#dc3545"
          },
        ],
      };
    } catch (error) {
      console.error(
        `[CHART ${projectName}] Error preparing chart data:`,
        error
      );
      return null;
    }
  }

  // Initialize the chart with the current data
  function initializeChart() {
    try {
      // Clear any previous error
      chartError = null;

      // Check if we have a valid canvas element
      if (!chartCanvas) {
        throw new Error("Chart canvas not available");
      }

      // Destroy any existing chart instance
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }

      // Prepare chart data (now respects dateRange)
      const chartData = prepareChartData();

      // Determine if there's data *after* filtering
      hasData = !!chartData;

      // If we don't have data after filtering, create an empty chart
      if (!chartData) {
        createEmptyChart();
        return;
      }

      // --- START: Conditional Bar Thickness ---
      const maxBarThickness = chartData.labels.length === 1 ? 100 : undefined; // Set max thickness if only one bar

      // Apply maxBarThickness to each dataset if defined
      if (maxBarThickness !== undefined) {
        chartData.datasets.forEach((dataset) => {
          dataset.maxBarThickness = maxBarThickness;
        });
      }
      // --- END: Conditional Bar Thickness ---

      // Create new chart instance
      const ctx = chartCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Get colors based on theme
      const isDarkMode = document.documentElement.classList.contains("dark");
      const gridColor = isDarkMode
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              color: getTextColor(),
            },
            legend: {
              position: "top",
              labels: {
                color: getTextColor(),
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: {
                color: gridColor,
              },
              ticks: {
                color: getTextColor(),
              },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: {
                color: gridColor,
              },
              ticks: {
                color: getTextColor(),
              },
            },
          },
        },
      });
    } catch (error: unknown) {
      console.error(`[CHART ${projectName}] Error initializing chart:`, error);
      chartError = `Error: ${error instanceof Error ? error.message : String(error)}`;
      hasData = false;
      chartInstance = null;
    }
  }

  // Create an empty chart with "No Data" message
  function createEmptyChart() {
    // Destroy any existing chart instance
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    // Get canvas context
    const ctx = chartCanvas.getContext("2d");
    if (!ctx) {
      console.error(
        `[CHART ${projectName}] Failed to get canvas context for empty chart`
      );
      return;
    }

    // Create a simple chart with "No Data" message
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [get(_)('projectActivityChart.noData')],
        datasets: [
          {
            label: get(_)('projectActivityChart.noActivityDataAvailable'),
            data: [0],
            backgroundColor: "rgba(200, 200, 200, 0.3)",
            borderColor: "rgba(200, 200, 200, 0.5)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: get(_)('projectActivityChart.noActivityDataFor', { values: { projectName } }),
            color: getTextColor(),
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 1,
            ticks: {
              color: getTextColor(),
            },
            grid: {
              display: false,
            },
          },
          x: {
            ticks: {
              color: getTextColor(),
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // Clean up chart instance when component is destroyed
  onDestroy(() => {
    if (chartInstance) {
      chartInstance.destroy();
    }
  });

  // Reactively update the chart when dailyActivityCounts OR dateRange changes
  $effect(() => {
    // Rerun logic when either prop changes
    const currentData = dailyActivityCounts;
    const currentRange = dateRange;

    // Re-initialize the chart which will now use the new range
    if (chartCanvas) {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }

      initializeChart();
    }
  });
</script>

<div class="chart-container" style="aspect-ratio: 4/3;">
  <!-- Canvas always displayed -->
  <canvas bind:this={chartCanvas}></canvas>

  <!-- Error message overlay -->
  {#if chartError}
    <div class="message-overlay">
      <p class="error-message">{chartError}</p>
    </div>
  {/if}
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
    overflow: hidden; /* Prevent overflow */
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block; /* Prevent extra space */
  }

  .message-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.7);
    z-index: 10;
  }

  .error-message {
    background-color: rgba(255, 255, 255, 0.9);
    padding: 1rem;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    color: #dc3545;
  }

  .debug-info {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 5px;
    font-size: 10px;
    z-index: 100;
    display: block;
  }

  :global(.dark) .message-overlay {
    background-color: rgba(0, 0, 0, 0.7);
  }

  :global(.dark) .error-message {
    background-color: rgba(30, 30, 30, 0.9);
    color: #ff6b6b;
  }
</style>
