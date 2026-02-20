<script lang="ts">
  import type { HeatmapChartBlock } from "$lib/types/analysis";

  interface Props {
    block: HeatmapChartBlock;
  }

  const { block }: Props = $props();
  let containerRef = $state<HTMLDivElement | null>(null);

  let tooltipData = $state<{
    xLabel: string;
    yLabel: string;
    value: number;
    x: number;
    y: number;
    placement: "above" | "below";
  } | null>(null);

  const allValues = $derived(block.data.cells.flat());
  const minVal = $derived(allValues.length > 0 ? Math.min(...allValues) : 0);
  const maxVal = $derived(allValues.length > 0 ? Math.max(...allValues) : 1);
  const range = $derived(maxVal - minVal || 1);

  const minColor = $derived(block.colorScale?.min ?? "hsl(200, 80%, 95%)");
  const maxColor = $derived(block.colorScale?.max ?? "hsl(200, 80%, 35%)");

  function interpolateColor(value: number): string {
    const t = (value - minVal) / range;
    // Simple HSL interpolation
    const minHsl = parseHSL(minColor);
    const maxHsl = parseHSL(maxColor);
    if (!minHsl || !maxHsl) {
      return `rgba(59, 130, 246, ${0.1 + t * 0.9})`;
    }
    const h = minHsl.h + t * (maxHsl.h - minHsl.h);
    const s = minHsl.s + t * (maxHsl.s - minHsl.s);
    const l = minHsl.l + t * (maxHsl.l - minHsl.l);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function parseHSL(
    color: string,
  ): { h: number; s: number; l: number } | null {
    const m = color.match(
      /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/,
    );
    if (!m) return null;
    return { h: parseInt(m[1]), s: parseInt(m[2]), l: parseInt(m[3]) };
  }

  function handleCellHover(
    e: MouseEvent,
    xi: number,
    yi: number,
    value: number,
  ) {
    const targetRect = (e.target as SVGElement).getBoundingClientRect();
    const containerRect = containerRef?.getBoundingClientRect();
    if (!containerRect) return;

    const x = targetRect.left - containerRect.left + targetRect.width / 2;
    const yAbove = targetRect.top - containerRect.top - 8;
    const yBelow = targetRect.top - containerRect.top + targetRect.height + 8;
    const placement = yAbove < 34 ? "below" : "above";

    tooltipData = {
      xLabel: block.data.xLabels[xi],
      yLabel: block.data.yLabels[yi],
      value,
      x,
      y: placement === "above" ? yAbove : yBelow,
      placement,
    };
  }

  function handleCellLeave() {
    tooltipData = null;
  }

  const xLabelCount = $derived(block.data.xLabels.length);
  const yLabelCount = $derived(block.data.yLabels.length);
  const needsXRotation = $derived(xLabelCount > 6);
  const maxVisibleXLabels = 7;
  const xLabelStep = $derived(
    Math.max(1, Math.ceil(xLabelCount / maxVisibleXLabels)),
  );
  const bottomPadding = $derived(needsXRotation ? 100 : 40);
  const gridTop = 30;
  const labelOffset = 90;

  const cellWidth = $derived(
    Math.max(needsXRotation ? 64 : 50, 820 / Math.max(block.data.xLabels.length, 1)),
  );
  const cellHeight = $derived(
    Math.max(20, 300 / Math.max(block.data.yLabels.length, 1)),
  );
  const svgWidth = $derived(
    labelOffset + block.data.xLabels.length * cellWidth + 20,
  );
  const svgHeight = $derived(
    gridTop + block.data.yLabels.length * cellHeight + bottomPadding,
  );
</script>

<div
  class="relative w-full overflow-x-auto"
  style={`height: ${Math.max(svgHeight, 390)}px;`}
  bind:this={containerRef}
>
  {#if xLabelCount === 0 || yLabelCount === 0}
    <div class="h-full flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      No heatmap data available for this dataset.
    </div>
  {:else}
    <svg
      width={svgWidth}
      height={svgHeight}
      class="min-w-full"
    >
      <!-- Y labels -->
      {#each block.data.yLabels as label, yi (`${yi}-${label}`)}
        <text
          x={labelOffset - 4}
          y={gridTop + yi * cellHeight + cellHeight / 2}
          text-anchor="end"
          dominant-baseline="middle"
          class="text-[10px] fill-muted-foreground"
        >
          {label.length > 14 ? label.slice(0, 14) + "…" : label}
        </text>
      {/each}

      <!-- X labels -->
      {#each block.data.xLabels as label, xi (`${xi}-${label}`)}
        {#if xi % xLabelStep === 0}
          {@const x = labelOffset + xi * cellWidth + cellWidth / 2}
          {@const y = gridTop + yLabelCount * cellHeight + (needsXRotation ? 22 : 16)}
          <text
            x={x}
            y={y}
            text-anchor={needsXRotation ? "end" : "middle"}
            transform={needsXRotation ? `rotate(-45 ${x} ${y})` : undefined}
            class="text-[10px] fill-muted-foreground"
          >
            {label.length > 16 ? label.slice(0, 16) + "…" : label}
          </text>
        {/if}
      {/each}

      <!-- Cells -->
      {#each block.data.cells as row, yi (yi)}
        {#each row as value, xi (`${yi}-${xi}`)}
          <rect
            x={labelOffset + xi * cellWidth}
            y={gridTop + yi * cellHeight}
            width={cellWidth - 1}
            height={cellHeight - 1}
            fill={interpolateColor(value)}
            rx="2"
            class="cursor-pointer"
            role="img"
            aria-label={`${block.data.yLabels[yi]} × ${block.data.xLabels[xi]}: ${value}`}
            onmouseenter={(e) => handleCellHover(e, xi, yi, value)}
            onmouseleave={handleCellLeave}
          />
          {#if cellWidth > 30 && cellHeight > 18}
            <text
              x={labelOffset + xi * cellWidth + cellWidth / 2}
              y={gridTop + yi * cellHeight + cellHeight / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              class="text-[9px] fill-foreground pointer-events-none"
            >
              {value}
            </text>
          {/if}
        {/each}
      {/each}
    </svg>
  {/if}

  {#if tooltipData}
    <div
      class="absolute pointer-events-none z-10 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border"
      style={`left: ${tooltipData.x}px; top: ${tooltipData.y}px; transform: ${
        tooltipData.placement === "above"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)"
      };`}
    >
      <div class="font-medium">
        {tooltipData.yLabel} × {tooltipData.xLabel}
      </div>
      <div>Value: {tooltipData.value}</div>
    </div>
  {/if}
</div>
