<script lang="ts">
  import type {
    ChartBlock as ChartBlockType,
    LabelIndexedChartBlock,
    ScatterChartBlock,
    HeatmapChartBlock,
    NetworkChartBlock,
    TreemapChartBlock,
  } from "$lib/types/analysis";
  import BarChart3 from "lucide-svelte/icons/bar-chart-3";
  import BarChartComponent from "./charts/BarChart.svelte";
  import LineChart from "./charts/LineChart.svelte";
  import PieChart from "./charts/PieChart.svelte";
  import ScatterChart from "./charts/ScatterChart.svelte";
  import HeatmapChart from "./charts/HeatmapChart.svelte";
  import NetworkGraph from "./charts/NetworkGraph.svelte";
  import TreemapChart from "./charts/TreemapChart.svelte";

  interface Props {
    block: ChartBlockType;
  }

  const { block }: Props = $props();
</script>

<div class="rounded-lg border bg-card overflow-hidden">
  {#if block.title}
    <div class="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
      <BarChart3 class="size-4 text-muted-foreground" />
      <h4 class="text-sm font-medium">{block.title}</h4>
    </div>
  {/if}

  <div class="p-4">
    {#if block.chartType === "bar"}
      <BarChartComponent block={block as LabelIndexedChartBlock} />
    {:else if block.chartType === "line"}
      <LineChart block={block as LabelIndexedChartBlock} />
    {:else if block.chartType === "pie"}
      <PieChart block={block as LabelIndexedChartBlock} />
    {:else if block.chartType === "scatter"}
      <ScatterChart block={block as ScatterChartBlock} />
    {:else if block.chartType === "heatmap"}
      <HeatmapChart block={block as HeatmapChartBlock} />
    {:else if block.chartType === "network"}
      <NetworkGraph block={block as NetworkChartBlock} />
    {:else if block.chartType === "treemap"}
      <TreemapChart block={block as TreemapChartBlock} />
    {:else}
      <div class="p-6 text-center text-sm text-muted-foreground">
        <BarChart3 class="size-8 mx-auto mb-2 opacity-40" />
        <p>Chart type "{block.chartType}" is not yet supported.</p>
      </div>
    {/if}
  </div>
</div>
