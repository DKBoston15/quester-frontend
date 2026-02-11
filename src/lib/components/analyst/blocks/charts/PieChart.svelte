<script lang="ts">
  import type { LabelIndexedChartBlock } from "$lib/types/analysis";

  interface Props {
    block: LabelIndexedChartBlock;
  }

  const { block }: Props = $props();
  let containerRef = $state<HTMLDivElement | null>(null);

  let tooltipData = $state<{
    label: string;
    value: number;
    percentage: string;
    x: number;
    y: number;
    placement: "above" | "below";
  } | null>(null);

  const pieColors = [
    "hsl(160, 60%, 45%)",
    "hsl(200, 60%, 50%)",
    "hsl(260, 50%, 55%)",
    "hsl(30, 70%, 50%)",
    "hsl(340, 60%, 50%)",
    "hsl(80, 50%, 45%)",
    "hsl(300, 40%, 50%)",
    "hsl(180, 50%, 40%)",
  ];

  const dataset = $derived(block.data.datasets[0]);
  const total = $derived(
    dataset ? dataset.data.reduce((a: number, b: number) => a + b, 0) : 0,
  );

  const slices = $derived.by(() => {
    if (!dataset || total === 0) return [];
    let cumAngle = -Math.PI / 2;

    return block.data.labels.map((label, i) => {
      const value = dataset.data[i] ?? 0;
      const angle = (value / total) * Math.PI * 2;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      cumAngle = endAngle;

      const color =
        typeof dataset.backgroundColor === "string"
          ? dataset.backgroundColor
          : (dataset.backgroundColor?.[i] ?? pieColors[i % pieColors.length]);

      return { label, value, startAngle, endAngle, color, percentage: ((value / total) * 100).toFixed(1) };
    });
  });

  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
  ): string {
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  function handleSliceHover(
    e: MouseEvent,
    slice: { label: string; value: number; percentage: string },
  ) {
    const targetRect = (e.target as SVGElement).getBoundingClientRect();
    const containerRect = containerRef?.getBoundingClientRect();
    if (!containerRect) return;

    const x = targetRect.left - containerRect.left + targetRect.width / 2;
    const yAbove = targetRect.top - containerRect.top - 8;
    const yBelow = targetRect.top - containerRect.top + targetRect.height + 8;
    const placement = yAbove < 34 ? "below" : "above";

    tooltipData = {
      ...slice,
      x,
      y: placement === "above" ? yAbove : yBelow,
      placement,
    };
  }

  function handleSliceLeave() {
    tooltipData = null;
  }
</script>

<div class="relative w-full overflow-x-auto" style="height: 320px;" bind:this={containerRef}>
  <div class="relative min-w-[780px] h-full">
    <svg viewBox="0 0 780 320" class="w-full h-full">
      {#each slices as slice (`slice-${slice.label}`)}
        <path
          d={describeArc(190, 160, 125, slice.startAngle, slice.endAngle)}
          fill={slice.color}
          stroke="white"
          stroke-width="2"
          class="cursor-pointer transition-opacity hover:opacity-80"
          role="img"
          aria-label={`${slice.label}: ${slice.value} (${slice.percentage}%)`}
          onmouseenter={(e) => handleSliceHover(e, slice)}
          onmouseleave={handleSliceLeave}
        />
      {/each}

      <!-- Legend -->
      {#each slices as slice, i (`legend-${slice.label}-${i}`)}
        <g transform="translate(390, {i * 20 + 22})">
          <rect width="12" height="12" fill={slice.color} rx="2" />
          <text x="18" y="10" class="text-[11px] fill-muted-foreground">
            {slice.label.length > 38 ? slice.label.slice(0, 38) + "…" : slice.label}
            ({slice.percentage}%)
          </text>
        </g>
      {/each}
    </svg>
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
      <div>{tooltipData.value} ({tooltipData.percentage}%)</div>
    </div>
  {/if}
</div>
