<script lang="ts">
  import { LayerCake, Svg } from "layercake";
  import ChartContext from "./ChartContext.svelte";
  import type { LabelIndexedChartBlock } from "$lib/types/analysis";

  interface Props {
    block: LabelIndexedChartBlock;
  }

  const { block }: Props = $props();
  let containerRef = $state<HTMLDivElement | null>(null);
  let chartHostRef = $state<HTMLDivElement | null>(null);
  let chartReady = $state(false);

  let tooltipData = $state<{
    label: string;
    value: number;
    dataset: string;
    x: number;
    y: number;
    placement: "above" | "below";
  } | null>(null);

  const barColors = [
    "hsl(160, 60%, 45%)",
    "hsl(200, 60%, 50%)",
    "hsl(260, 50%, 55%)",
    "hsl(30, 70%, 50%)",
    "hsl(340, 60%, 50%)",
  ];

  const chartData = $derived.by(() => {
    const labels = block.data.labels;
    const datasets = block.data.datasets;
    const datasetCount = Math.max(datasets.length, 1);
    const barWidth = 0.7 / datasetCount;

    return labels.flatMap((label, i) =>
      datasets.map((ds, di) => ({
        label,
        value: ds.data[i] ?? 0,
        dataset: ds.label,
        datasetIndex: di,
        barOffset: (di - (datasetCount - 1) / 2) * barWidth,
        barWidth,
        color:
          typeof ds.backgroundColor === "string"
            ? ds.backgroundColor
            : (ds.backgroundColor?.[i] ?? barColors[di % barColors.length]),
        x: i,
      })),
    );
  });

  const maxValue = $derived(
    Math.max(...block.data.datasets.flatMap((ds) => ds.data), 0) * 1.1 || 1,
  );
  const labelCount = $derived(block.data.labels.length);
  const needsRotation = $derived(labelCount > 5);
  const labelStep = $derived(Math.max(1, Math.ceil(labelCount / 10)));
  const minChartWidth = $derived(Math.max(720, labelCount * (needsRotation ? 92 : 76)));

  function handleBarHover(
    e: MouseEvent,
    item: { label: string; value: number; dataset: string },
  ) {
    const targetRect = (e.target as SVGElement).getBoundingClientRect();
    const containerRect = containerRef?.getBoundingClientRect();
    if (!containerRect) return;

    const x = targetRect.left - containerRect.left + targetRect.width / 2;
    const yAbove = targetRect.top - containerRect.top - 8;
    const yBelow = targetRect.top - containerRect.top + targetRect.height + 8;
    const placement = yAbove < 34 ? "below" : "above";

    tooltipData = {
      ...item,
      x,
      y: placement === "above" ? yAbove : yBelow,
      placement,
    };
  }

  function handleBarLeave() {
    tooltipData = null;
  }

  function getSafeWidth(width: number): number {
    return Number.isFinite(width) && width > 0 ? width : 0;
  }

  function getSafeHeight(height: number): number {
    return Number.isFinite(height) && height > 0 ? height : 0;
  }

  function getSlotWidth(width: number): number {
    const safeWidth = getSafeWidth(width);
    return safeWidth / Math.max(block.data.labels.length, 1);
  }

  function getLabelX(index: number, width: number): number {
    const slotWidth = getSlotWidth(width);
    return index * slotWidth + slotWidth / 2;
  }

  function getBarGeometry(
    item: { x: number; barOffset: number; barWidth: number },
    width: number,
  ) {
    const slotWidth = getSlotWidth(width);
    const centerX = item.x * slotWidth + slotWidth / 2;
    const computedWidth = Math.max(slotWidth * item.barWidth, 1);
    const x = centerX + item.barOffset * slotWidth - computedWidth / 2;
    return { x, width: computedWidth };
  }

  function syncChartReady() {
    const rect = chartHostRef?.getBoundingClientRect();
    chartReady = !!rect && rect.width > 0 && rect.height > 0;
  }

  $effect(() => {
    if (!chartHostRef || typeof ResizeObserver === "undefined") {
      syncChartReady();
      return;
    }

    const observer = new ResizeObserver(() => {
      syncChartReady();
    });
    observer.observe(chartHostRef);
    syncChartReady();

    return () => observer.disconnect();
  });
</script>

<div class="relative w-full overflow-x-auto" bind:this={containerRef}>
  <div
    class="relative"
    style={`height: ${needsRotation ? 400 : 300}px; min-width: ${minChartWidth}px;`}
    bind:this={chartHostRef}
  >
    {#if chartReady}
      <LayerCake
        x="x"
        y="value"
        data={chartData}
        yDomain={[0, maxValue]}
        padding={{ top: 10, right: needsRotation ? 48 : 36, bottom: needsRotation ? 118 : 36, left: 50 }}
      >
        <Svg>
          <ChartContext>
          {#snippet content({ width, height, yScale })}
            {@const safeWidth = getSafeWidth(width)}
            {@const safeHeight = getSafeHeight(height)}
            <!-- Y axis -->
            {#each yScale.ticks(5) as tick (tick)}
              <g transform="translate(0, {yScale(tick)})">
                <line x1="0" x2={safeWidth} stroke="currentColor" opacity="0.1" />
                <text
                  x="-8"
                  dy="0.32em"
                  text-anchor="end"
                  class="text-[10px] fill-muted-foreground">{tick}</text
                >
              </g>
            {/each}

            <!-- X axis labels -->
            {#each block.data.labels as label, i (`${i}-${label}`)}
              {#if i % labelStep === 0}
                {@const labelX = getLabelX(i, safeWidth)}
                {@const labelY = safeHeight + (needsRotation ? 28 : 20)}
                <text
                  x={labelX}
                  y={labelY}
                  text-anchor={needsRotation ? "end" : "middle"}
                  transform={needsRotation ? `rotate(-45 ${labelX} ${labelY})` : undefined}
                  class="text-[10px] fill-muted-foreground"
                >
                  {label.length > 16 ? label.slice(0, 16) + "..." : label}
                </text>
              {/if}
            {/each}

            <!-- Bars -->
            {#each chartData as item (`${item.datasetIndex}-${item.x}-${item.label}`)}
              {@const geometry = getBarGeometry(item, safeWidth)}
              {@const barH = safeHeight - yScale(item.value)}
              <rect
                x={geometry.x}
                y={yScale(item.value)}
                width={geometry.width}
                height={Math.max(barH, 0)}
                fill={item.color}
                rx="2"
                opacity="0.85"
                class="transition-opacity hover:opacity-100 cursor-pointer"
                role="img"
                aria-label={`${item.label}: ${item.value}`}
                onmouseenter={(e) => handleBarHover(e, item)}
                onmouseleave={handleBarLeave}
              />
            {/each}

            <!-- Axis labels -->
            {#if block.xLabel}
              <text
                x={safeWidth / 2}
                y={safeHeight + (needsRotation ? 92 : 40)}
                text-anchor="middle"
                class="text-xs fill-muted-foreground">{block.xLabel}</text
              >
            {/if}
            {#if block.yLabel}
              <text
                transform="rotate(-90)"
                x={-safeHeight / 2}
                y="-40"
                text-anchor="middle"
                class="text-xs fill-muted-foreground">{block.yLabel}</text
              >
            {/if}
          {/snippet}
          </ChartContext>
        </Svg>
      </LayerCake>
    {/if}
  </div>

  {#if tooltipData}
    <div
      class="absolute pointer-events-none z-10 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border"
      style={`left: ${tooltipData.x}px; top: ${tooltipData.y}px; transform: ${
        tooltipData.placement === "above"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)"
      };`}
    >
      <div class="font-medium">{tooltipData.label}</div>
      <div>{tooltipData.dataset}: {tooltipData.value}</div>
    </div>
  {/if}
</div>
