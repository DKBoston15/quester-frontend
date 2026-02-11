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

  const lineColors = [
    "hsl(160, 60%, 45%)",
    "hsl(200, 60%, 50%)",
    "hsl(260, 50%, 55%)",
    "hsl(30, 70%, 50%)",
    "hsl(340, 60%, 50%)",
  ];

  const allValues = $derived(
    block.data.datasets.flatMap((ds) => ds.data),
  );
  const yMin = $derived(Math.min(...allValues, 0));
  const yMax = $derived(Math.max(...allValues, 0) * 1.1 || 1);
  const labelCount = $derived(block.data.labels.length);
  const needsRotation = $derived(labelCount > 8);
  const labelStep = $derived(Math.max(1, Math.ceil(labelCount / 10)));
  const minChartWidth = $derived(Math.max(720, labelCount * (needsRotation ? 88 : 74)));

  function handlePointHover(
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

  function handlePointLeave() {
    tooltipData = null;
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
    style={`height: ${needsRotation ? 390 : 300}px; min-width: ${minChartWidth}px;`}
    bind:this={chartHostRef}
  >
    {#if chartReady}
      <LayerCake
        data={block.data.labels.map((l, i) => ({ x: i, label: l }))}
        x="x"
        y="x"
        xDomain={[0, block.data.labels.length - 1]}
        yDomain={[yMin, yMax]}
        padding={{ top: 10, right: 24, bottom: needsRotation ? 108 : 40, left: 50 }}
      >
        <Svg>
          <ChartContext>
          {#snippet content({ width, height, xScale, yScale })}
            <!-- Grid lines -->
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

            <!-- X axis labels -->
            {#each block.data.labels as label, i (`${i}-${label}`)}
              {#if i % labelStep === 0}
                {@const x = xScale(i)}
                {@const y = height + (needsRotation ? 26 : 18)}
                <text
                  x={x}
                  y={y}
                  text-anchor={needsRotation ? "end" : "middle"}
                  transform={needsRotation ? `rotate(-45 ${x} ${y})` : undefined}
                  class="text-[10px] fill-muted-foreground"
                >
                  {label.length > 14 ? label.slice(0, 14) + "…" : label}
                </text>
              {/if}
            {/each}

            <!-- Lines and points per dataset -->
            {#each block.data.datasets as ds, di (`${di}-${ds.label}`)}
              {@const color =
                typeof ds.borderColor === "string"
                  ? ds.borderColor
                  : lineColors[di % lineColors.length]}
              {@const pathD = ds.data
                .map(
                  (v, i) =>
                    `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`,
                )
                .join(" ")}

              <path d={pathD} fill="none" stroke={color} stroke-width="2" />

              {#each ds.data as value, i (`${i}-${value}`)}
                <circle
                  cx={xScale(i)}
                  cy={yScale(value)}
                  r="3.5"
                  fill={color}
                  class="cursor-pointer transition-all hover:r-[5]"
                  role="img"
                  aria-label={`${ds.label}: ${block.data.labels[i]} = ${value}`}
                  onmouseenter={(e) =>
                    handlePointHover(e, {
                      label: block.data.labels[i],
                      value,
                      dataset: ds.label,
                    })}
                  onmouseleave={handlePointLeave}
                />
              {/each}
            {/each}

            <!-- Legend -->
            {#if block.data.datasets.length > 1}
              {#each block.data.datasets as ds, di (`legend-${di}-${ds.label}`)}
                {@const color =
                  typeof ds.borderColor === "string"
                    ? ds.borderColor
                    : lineColors[di % lineColors.length]}
                <g transform="translate({width - 120}, {di * 16 + 4})">
                  <line x1="0" x2="16" y1="0" y2="0" stroke={color} stroke-width="2" />
                  <text
                    x="20"
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
