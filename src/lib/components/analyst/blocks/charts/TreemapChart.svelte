<script lang="ts">
  import { onMount } from "svelte";
  import type { TreemapChartBlock, TreemapNode } from "$lib/types/analysis";

  interface Props {
    block: TreemapChartBlock;
  }

  const { block }: Props = $props();
  let containerRef = $state<HTMLDivElement | null>(null);

  let rects = $state<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      name: string;
      value: number;
      share: number;
      rank: number;
      color: string;
    }>
  >([]);
  let tooltipData = $state<{
    name: string;
    value: number;
    share: number;
    rank: number;
    x: number;
    y: number;
    placement: "above" | "below";
  } | null>(null);

  const treemapColors = [
    "hsl(160, 50%, 45%)",
    "hsl(200, 50%, 50%)",
    "hsl(260, 40%, 55%)",
    "hsl(30, 60%, 50%)",
    "hsl(340, 50%, 50%)",
    "hsl(80, 45%, 45%)",
    "hsl(300, 35%, 50%)",
    "hsl(180, 45%, 40%)",
    "hsl(220, 50%, 55%)",
    "hsl(10, 55%, 50%)",
  ];

  onMount(async () => {
    try {
      const d3 = await import("d3");
      const width = 500;
      const height = 300;

      const flattenedChildren = flattenNodes(block.data.children);
      const root = d3
        .hierarchy({ name: "root", children: flattenedChildren, value: 0 } as TreemapNode)
        .sum((d: any) => d.value || 0)
        .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));

      d3.treemap<TreemapNode>().size([width, height]).padding(2)(root);

      const leaves = root.leaves() as any[];
      const totalValue = leaves.reduce((sum, leaf) => sum + (leaf.data.value || 0), 0) || 1;

      rects = leaves.map((leaf: any, i: number) => ({
        x: leaf.x0,
        y: leaf.y0,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0,
        name: leaf.data.name,
        value: leaf.data.value,
        share: (leaf.data.value / totalValue) * 100,
        rank: i + 1,
        color: treemapColors[i % treemapColors.length],
      }));
    } catch (err) {
      console.error("Failed to render treemap:", err);
    }
  });

  function flattenNodes(nodes: TreemapNode[]): TreemapNode[] {
    const result: TreemapNode[] = [];
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        result.push(...flattenNodes(node.children));
      } else {
        result.push(node);
      }
    }
    return result;
  }

  function handleRectHover(
    e: MouseEvent,
    item: { name: string; value: number; share: number; rank: number },
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

  function handleRectLeave() {
    tooltipData = null;
  }

  function compactLabel(name: string): string {
    const tokens = name
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length === 0) return "";
    if (tokens.length === 1) return tokens[0].slice(0, 3);
    return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
  }
</script>

<div class="relative w-full" style="height: 300px;" bind:this={containerRef}>
  <svg viewBox="0 0 500 300" class="w-full h-full">
    {#each rects as rect (`${rect.rank}-${rect.name}`)}
      <g>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={rect.color}
          stroke="white"
          stroke-width="1"
          rx="2"
          class="cursor-pointer transition-opacity hover:opacity-80"
          role="img"
          aria-label={`${rect.name}: ${rect.value} (${rect.share.toFixed(1)}%)`}
          onmouseenter={(e) => handleRectHover(e, rect)}
          onmouseleave={handleRectLeave}
        />
        <title>{rect.name}: {rect.value} ({rect.share.toFixed(1)}%)</title>
        {#if rect.width > 40 && rect.height > 20}
          <text
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="9"
            fill="#ffffff"
            font-weight="600"
            style="pointer-events: none;"
          >
            {rect.name.length > Math.floor(rect.width / 6)
              ? rect.name.slice(0, Math.floor(rect.width / 6)) + "…"
              : rect.name}
          </text>
        {:else if rect.width > 20 && rect.height > 14}
          <text
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8"
            fill="rgba(255, 255, 255, 0.92)"
            font-weight="700"
            style="pointer-events: none;"
          >
            {compactLabel(rect.name)}
          </text>
        {/if}
      </g>
    {/each}
  </svg>

  {#if tooltipData}
    <div
      class="absolute pointer-events-none z-10 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border"
      style={`left: ${tooltipData.x}px; top: ${tooltipData.y}px; transform: ${
        tooltipData.placement === "above"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)"
      };`}
    >
      <div class="font-medium">{tooltipData.name}</div>
      <div>Value: {tooltipData.value}</div>
      <div>Share: {tooltipData.share.toFixed(1)}%</div>
      <div>Rank: #{tooltipData.rank}</div>
    </div>
  {/if}
</div>
