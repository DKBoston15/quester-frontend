<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { NetworkChartBlock } from "$lib/types/analysis";
  import { isDarkMode } from "$lib/utils/mode-watcher";

  interface Props {
    block: NetworkChartBlock;
  }

  const { block }: Props = $props();

  let container = $state<HTMLDivElement | null>(null);
  let graphInstance: any = null;
  let resizeObserver: ResizeObserver | null = null;

  const preferredGroupColors: Record<string, string> = {
    "highly-cited": "#22c55e",
    citing: "#3b82f6",
    isolated: "#94a3b8",
    default: "#3b82f6",
  };

  const groupLabels: Record<string, string> = {
    "highly-cited": "Highly Cited",
    citing: "Citing Paper",
    isolated: "Unlinked Paper",
    default: "Paper",
  };

  const fallbackPalette = [
    "#22c55e",
    "#3b82f6",
    "#a855f7",
    "#f97316",
    "#ef4444",
    "#06b6d4",
    "#f59e0b",
    "#ec4899",
  ];

  const edgeColor = $derived(
    $isDarkMode ? "rgba(148, 163, 184, 0.72)" : "rgba(71, 85, 105, 0.6)",
  );

  const graphData = $derived.by(() => ({
    nodes: block.data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      val: n.size ?? 1,
      color: getGroupColor(n.group),
    })),
    links: block.data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      value: e.weight ?? 1,
      label: e.label,
    })),
  }));

  const legendItems = $derived.by(() => {
    const groups = new Set<string>(
      block.data.nodes.map((node) => node.group ?? "default"),
    );
    const ordered = [...groups].sort((a, b) => {
      const order = ["highly-cited", "citing", "isolated", "default"];
      const aPos = order.indexOf(a);
      const bPos = order.indexOf(b);
      if (aPos === -1 && bPos === -1) return a.localeCompare(b);
      if (aPos === -1) return 1;
      if (bPos === -1) return -1;
      return aPos - bPos;
    });

    return ordered.map((group) => ({
      key: group,
      color: getGroupColor(group === "default" ? undefined : group),
      label: groupLabels[group] ?? toTitleCase(group),
    }));
  });

  onMount(() => {
    if (!container) return;
    initGraph();
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    graphInstance?._destructor?.();
  });

  async function initGraph() {
    if (!container) return;

    try {
      const ForceGraph = (await import("force-graph")).default;

      graphInstance = new ForceGraph(container)
        .graphData(graphData)
        .nodeId("id")
        .nodeLabel("label")
        .nodeVal("val")
        .nodeColor("color")
        .linkColor(() => edgeColor)
        .linkWidth((link: any) =>
          Math.max(1.4, Math.sqrt(Number(link.value) || 1)),
        )
        .linkLabel("label")
        .backgroundColor("rgba(0, 0, 0, 0)")
        .width(container.clientWidth)
        .height(300);

      resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? container?.clientWidth;
        if (width && graphInstance) {
          graphInstance.width(Math.max(220, width));
        }
      });
      resizeObserver.observe(container);
    } catch (err) {
      console.error("Failed to load force-graph:", err);
    }
  }

  $effect(() => {
    if (!graphInstance || !container) return;
    graphInstance
      .graphData(graphData)
      .linkColor(() => edgeColor)
      .width(container.clientWidth);
  });

  function getGroupColor(group?: string): string {
    if (!group) return preferredGroupColors.default;
    if (preferredGroupColors[group]) return preferredGroupColors[group];
    const hash = hashString(group);
    return fallbackPalette[hash % fallbackPalette.length];
  }

  function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function toTitleCase(value: string): string {
    return value
      .split(/[_-\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
</script>

<div class="w-full space-y-3">
  <div bind:this={container} class="w-full" style="height: 300px;"></div>

  <div class="rounded-md border p-2.5">
    <div class="text-xs font-semibold mb-1.5 text-muted-foreground">Legend</div>
    <div class="grid gap-1 sm:grid-cols-2">
      {#each legendItems as item}
        <div
          class="flex items-center rounded-md p-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <span
            class="w-2.5 h-2.5 rounded-full mr-2 border border-black/20 dark:border-white/25"
            style={`background-color: ${item.color};`}
          ></span>
          <span class="text-xs truncate">{item.label}</span>
        </div>
      {/each}
      <div
        class="flex items-center rounded-md p-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <span
          class="inline-block w-6 h-[2px] rounded-full mr-2"
          style={`background-color: ${edgeColor};`}
        ></span>
        <span class="text-xs truncate">Citation Link</span>
      </div>
    </div>
  </div>
</div>
