<script lang="ts">
  import { LayerCake, Svg } from "layercake";
  import ChartContext from "./ChartContext.svelte";
  import type { ScatterChartBlock } from "$lib/types/analysis";

  interface Props {
    block: ScatterChartBlock;
  }

  const { block }: Props = $props();
  let containerRef = $state<HTMLDivElement | null>(null);
  let chartReady = $state(false);

  let tooltipData = $state<{
    label: string;
    x: number;
    y: number;
    dataset: string;
    screenX: number;
    screenY: number;
    placement: "above" | "below";
  } | null>(null);

  const scatterColors = [
    "hsl(160, 60%, 45%)",
    "hsl(200, 60%, 50%)",
    "hsl(260, 50%, 55%)",
    "hsl(30, 70%, 50%)",
    "hsl(340, 60%, 50%)",
  ];

  type ScatterPoint = { x: number; y: number; label?: string };
  type NormalizedScatterDataset = {
    label: string;
    points: ScatterPoint[];
    backgroundColor?: string;
  };

  const normalizedDatasets = $derived.by<NormalizedScatterDataset[]>(() => {
    const labels = (block.data as any)?.labels as string[] | undefined;
    const rawDatasets = (block.data as any)?.datasets ?? [];

    return rawDatasets.map((ds: any, di: number) => {
      const points: ScatterPoint[] = Array.isArray(ds.points)
        ? ds.points
            .map((point: any) => {
              const x = Number(point?.x);
              const y = Number(point?.y);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
              return {
                x,
                y,
                label:
                  typeof point?.label === "string" ? point.label : undefined,
              };
            })
            .filter((point: ScatterPoint | null): point is ScatterPoint => point !== null)
        : Array.isArray(ds.data)
          ? ds.data
              .map((rawY: unknown, i: number) => {
                const y = Number(rawY);
                const label = labels?.[i];
                const parsedX = label !== undefined ? Number(label) : NaN;
                const x = Number.isFinite(parsedX) ? parsedX : i + 1;

                if (!Number.isFinite(y)) return null;
                return {
                  x,
                  y,
                  label: label ?? `Point ${i + 1}`,
                };
              })
              .filter(Boolean)
          : [];

      const backgroundColor = Array.isArray(ds.backgroundColor)
        ? ds.backgroundColor[0]
        : ds.backgroundColor;

      return {
        label: ds.label ?? `Series ${di + 1}`,
        points,
        backgroundColor,
      };
    });
  });

  const allPoints = $derived(
    normalizedDatasets.flatMap((ds: NormalizedScatterDataset) => ds.points),
  );
  const xMin = $derived(
    allPoints.length > 0
      ? Math.min(...allPoints.map((p: ScatterPoint) => p.x))
      : 0,
  );
  const xMax = $derived(
    allPoints.length > 0
      ? Math.max(...allPoints.map((p: ScatterPoint) => p.x))
      : 1,
  );
  const yMin = $derived(
    allPoints.length > 0
      ? Math.min(...allPoints.map((p: ScatterPoint) => p.y))
      : 0,
  );
  const yMax = $derived(
    allPoints.length > 0
      ? Math.max(...allPoints.map((p: ScatterPoint) => p.y))
      : 1,
  );

  // Add 10% padding to domains
  const xPad = $derived((xMax - xMin) * 0.1 || 1);
  const yPad = $derived((yMax - yMin) * 0.1 || 1);

  function handlePointHover(
    e: MouseEvent,
    point: { x: number; y: number; label?: string },
    datasetLabel: string,
  ) {
    const targetRect = (e.target as SVGElement).getBoundingClientRect();
    const containerRect = containerRef?.getBoundingClientRect();
    if (!containerRect) return;

    const screenX = targetRect.left - containerRect.left + targetRect.width / 2;
    const yAbove = targetRect.top - containerRect.top - 8;
    const yBelow = targetRect.top - containerRect.top + targetRect.height + 8;
    const placement = yAbove < 34 ? "below" : "above";

    tooltipData = {
      label: point.label ?? `(${point.x}, ${point.y})`,
      x: point.x,
      y: point.y,
      dataset: datasetLabel,
      screenX,
      screenY: placement === "above" ? yAbove : yBelow,
      placement,
    };
  }

  function handlePointLeave() {
    tooltipData = null;
  }

  function syncChartReady() {
    const rect = containerRef?.getBoundingClientRect();
    chartReady = !!rect && rect.width > 0 && rect.height > 0;
  }

  $effect(() => {
    if (!containerRef || typeof ResizeObserver === "undefined") {
      syncChartReady();
      return;
    }

    const observer = new ResizeObserver(() => {
      syncChartReady();
    });
    observer.observe(containerRef);
    syncChartReady();

    return () => observer.disconnect();
  });
</script>

<div class="relative w-full" style="height: 300px;" bind:this={containerRef}>
  {#if allPoints.length === 0}
    <div class="h-full flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      No scatter points available for this dataset.
    </div>
  {:else if chartReady}
    <LayerCake
      data={allPoints}
      x="x"
      y="y"
      xDomain={[xMin - xPad, xMax + xPad]}
      yDomain={[yMin - yPad, yMax + yPad]}
      padding={{ top: 10, right: 10, bottom: 30, left: 50 }}
    >
      <Svg>
        <ChartContext>
        {#snippet content({ width, height, xScale, yScale })}
          <!-- Grid -->
          {#each yScale.ticks(5) as tick (tick)}
            <g transform="translate(0, {yScale(tick)})">
              <line x1="0" x2={width} stroke="currentColor" opacity="0.1" />
              <text
                x="-8"
                dy="0.32em"
                text-anchor="end"
                class="text-[10px] fill-muted-foreground">{tick}</text
              >
            </g>
          {/each}
          {#each xScale.ticks(5) as tick (tick)}
            <g transform="translate({xScale(tick)}, 0)">
              <line y1="0" y2={height} stroke="currentColor" opacity="0.1" />
              <text
                y={height + 16}
                text-anchor="middle"
                class="text-[10px] fill-muted-foreground">{tick}</text
              >
            </g>
          {/each}

          <!-- Points per dataset -->
          {#each normalizedDatasets as ds, di (`${di}-${ds.label}`)}
            {@const color =
              ds.backgroundColor ?? scatterColors[di % scatterColors.length]}
            {#each ds.points as point (`${point.x}-${point.y}-${point.label ?? ""}`)}
              <circle
                cx={xScale(point.x)}
                cy={yScale(point.y)}
                r="4"
                fill={color}
                opacity="0.7"
                class="cursor-pointer transition-all hover:opacity-100"
                role="img"
                aria-label={`${ds.label}: ${point.label ?? `(${point.x}, ${point.y})`}`}
                onmouseenter={(e) => handlePointHover(e, point, ds.label)}
                onmouseleave={handlePointLeave}
              />
            {/each}
          {/each}

          <!-- Axis labels -->
          {#if block.xLabel}
            <text
              x={width / 2}
              y={height + 40}
              text-anchor="middle"
              class="text-xs fill-muted-foreground">{block.xLabel}</text
            >
          {/if}
          {#if block.yLabel}
            <text
              transform="rotate(-90)"
              x={-height / 2}
              y="-40"
              text-anchor="middle"
              class="text-xs fill-muted-foreground">{block.yLabel}</text
            >
          {/if}

          <!-- Legend -->
          {#if normalizedDatasets.length > 1}
            {#each normalizedDatasets as ds, di (`legend-${di}-${ds.label}`)}
              {@const color =
                ds.backgroundColor ?? scatterColors[di % scatterColors.length]}
              <g transform="translate({width - 100}, {di * 16 + 4})">
                <circle cx="6" cy="0" r="4" fill={color} />
                <text
                  x="14"
                  dy="0.32em"
                  class="text-[10px] fill-muted-foreground"
                >
                  {ds.label}
                </text>
              </g>
            {/each}
          {/if}
        {/snippet}
        </ChartContext>
      </Svg>
    </LayerCake>
  {/if}

  {#if tooltipData}
    <div
      class="absolute pointer-events-none z-10 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border"
      style={`left: ${tooltipData.screenX}px; top: ${tooltipData.screenY}px; transform: ${
        tooltipData.placement === "above"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)"
      };`}
    >
      <div class="font-medium">{tooltipData.label}</div>
      <div>
        {tooltipData.dataset}: ({tooltipData.x}, {tooltipData.y})
      </div>
    </div>
  {/if}
</div>
