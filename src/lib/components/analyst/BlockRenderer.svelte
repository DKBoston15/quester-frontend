<script lang="ts">
  import type { AnalysisBlock, TableBlock as TableBlockType } from "$lib/types/analysis";
  import TableBlock from "./blocks/TableBlock.svelte";
  import ChartBlock from "./blocks/ChartBlock.svelte";
  import MetricBlock from "./blocks/MetricBlock.svelte";
  import ComparisonBlock from "./blocks/ComparisonBlock.svelte";
  import CitationBlock from "./blocks/CitationBlock.svelte";
  import SaveArtifactDialog from "./SaveArtifactDialog.svelte";
  import { exportTableAsCSV, exportElementAsPNG } from "$lib/utils/analysis-export";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import Bookmark from "lucide-svelte/icons/bookmark";
  import Download from "lucide-svelte/icons/download";
  import Image from "lucide-svelte/icons/image";

  interface Props {
    block: AnalysisBlock;
    projectId?: string;
    messageId?: string;
  }

  const { block, projectId, messageId }: Props = $props();

  let showSaveDialog = $state(false);
  let blockElement: HTMLDivElement | undefined = $state();

  function handleExportCSV() {
    if (block.type !== "table") return;
    const tableBlock = block as TableBlockType;
    exportTableAsCSV(tableBlock.columns, tableBlock.rows, `${tableBlock.title || "table"}.csv`);
  }

  async function handleExportPNG() {
    if (!blockElement || block.type !== "chart") return;
    try {
      const exportOptions =
        block.chartType === "treemap"
          ? { minWidth: 1800, minHeight: 1100, pixelRatio: 2.25 }
          : block.chartType === "heatmap"
            ? { minWidth: 1600, minHeight: 1000, pixelRatio: 2.1 }
            : block.chartType === "bar" || block.chartType === "line"
              ? { minWidth: 1500, minHeight: 900, pixelRatio: 2.1 }
              : block.chartType === "network"
                ? { minWidth: 1400, minHeight: 900, pixelRatio: 2.1, useClone: false }
                : undefined;

      await exportElementAsPNG(
        blockElement,
        `${block.title || block.type}.png`,
        exportOptions,
      );
    } catch (err) {
      console.error("Failed to export as PNG:", err);
    }
  }
</script>

<div
  class="group/block relative"
  bind:this={blockElement}
  id={`analysis-block-${block.id}`}
  data-analysis-block-id={block.id}
  data-analysis-message-id={messageId}
>
  {#if block.type === "table"}
    <TableBlock {block} />
  {:else if block.type === "chart"}
    <ChartBlock {block} />
  {:else if block.type === "metric"}
    <MetricBlock {block} />
  {:else if block.type === "comparison"}
    <ComparisonBlock {block} />
  {:else if block.type === "citation"}
    <CitationBlock {block} />
  {:else}
    <div
      class="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground"
    >
      Unsupported block type: {(block as any).type}
    </div>
  {/if}

  <!-- Action buttons (hover) -->
  <div
    class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity"
    data-export-ignore="true"
  >
    {#if block.type === "table"}
      <button
        class="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Export as CSV"
        onclick={handleExportCSV}
      >
        <Download class="size-3.5" />
      </button>
    {/if}

    {#if block.type === "chart"}
      <button
        class="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Export as PNG"
        onclick={handleExportPNG}
      >
        <Image class="size-3.5" />
      </button>
    {/if}

    {#if projectId}
      <button
        class="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Save as artifact"
        onclick={() => (showSaveDialog = true)}
      >
        <Bookmark class="size-3.5" />
      </button>
    {/if}
  </div>

  {#if projectId}
    <SaveArtifactDialog
      {block}
      {projectId}
      {messageId}
      open={showSaveDialog}
      onOpenChange={(v) => (showSaveDialog = v)}
      onSaved={() => analystStore.notifyArtifactSaved()}
    />
  {/if}
</div>
