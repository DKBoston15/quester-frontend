<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    type NodeTypes,
    type Edge,
    type Node,
    MarkerType,
    ConnectionMode,
  } from "@xyflow/svelte";
  import { writable } from "svelte/store";
  import { onDestroy } from "svelte";
  import "@xyflow/svelte/dist/style.css";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import { edgeSettings } from "./edge-settings-store";
  import ResizableNode from "./ResizableNode.svelte";
  import CircleNode from "./CircleNode.svelte";
  import EdgeSettingsPanel from "./EdgeSettingsPanel.svelte";
  import EdgeCustomizationPanel from "./EdgeCustomizationPanel.svelte";

  import FlowToolbar from "./FlowToolbar.svelte";

  let { modelId } = $props<{
    modelId: string;
    projectId: string;
  }>();

  const nodeTypes: NodeTypes = {
    ResizableNode: ResizableNode as any,
    CircleNode: CircleNode as any,
  } satisfies NodeTypes;

  const nodes = writable<Node[]>([]);
  const edges = writable<Edge[]>([]);
  const showGrid = writable(true);
  const snapToGrid = writable(true);

  // Track customized edges and selected edge
  const customizedEdges = new Set<string>();
  const selectedEdge = writable<Edge | null>(null);

  $effect(() => {
    const modelData = modelStore.currentModel;

    if (!modelData) return;

    const model = "model" in modelData ? modelData.model : modelData;

    if (model && typeof model === "object") {
      const modelNodes = "nodes" in model ? model.nodes : null;
      const modelEdges = "edges" in model ? model.edges : null;

      if (modelNodes && modelEdges) {
        try {
          const parsedNodes =
            typeof modelNodes === "string"
              ? JSON.parse(modelNodes)
              : modelNodes;
          const parsedEdges =
            typeof modelEdges === "string"
              ? JSON.parse(modelEdges)
              : modelEdges;

          if (Array.isArray(parsedNodes) && Array.isArray(parsedEdges)) {
            nodes.set(parsedNodes);
            edges.set(parsedEdges);
          }
        } catch (error) {
          console.error("Error parsing nodes or edges:", error);
        }
      }
    }
  });

  let saveTimeout: number;
  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (!modelId) return;

      try {
        const cleanNodes = $nodes.map((node) => ({
          ...node,
          measured: undefined,
        }));

        const cleanEdges = $edges.map((edge) => {
          const newEdge = { ...edge };
          return newEdge;
        });

        await modelStore.updateModel(modelId, {
          nodes: JSON.stringify(cleanNodes) as any,
          edges: JSON.stringify(cleanEdges) as any,
        });
        console.log("Model saved successfully");
      } catch (error) {
        console.error("Error saving model:", error);
      }
    }, 1000) as unknown as number;
  };

  $effect(() => {
    if (Array.isArray($nodes)) {
      debouncedSave();
    }
  });

  $effect(() => {
    if (Array.isArray($edges)) {
      debouncedSave();
    }
  });

  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  const onConnect = (params: any) => {
    console.log("Connection created with params:", params);
    console.log("Current edge settings:", $edgeSettings);

    const newEdge: Edge = {
      ...params,
      id: `e${Date.now()}`,
      type: $edgeSettings.type,
      animated: $edgeSettings.animated,
      data: { customized: false },
      style: `stroke: ${$edgeSettings.color}; stroke-width: ${$edgeSettings.width}px;`,
      markerEnd: $edgeSettings.markerEnd
        ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
        : undefined,
      markerStart: $edgeSettings.markerStart
        ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
        : undefined,
    };

    console.log("New edge with full configuration:", newEdge);
    edges.update((eds) => {
      const updatedEdges = [...eds, newEdge];
      console.log("Updated edges store:", updatedEdges);
      return updatedEdges;
    });
  };

  // Handle edge selection
  const onEdgeClick = (event: CustomEvent<{ edge: Edge }>) => {
    const edge = event.detail.edge;
    console.log("Edge clicked:", edge);
    selectedEdge.set(edge);
  };

  // Handle deselection
  const onPaneClick = () => {
    selectedEdge.set(null);
  };

  // Handle edge customization
  const onEdgeCustomize = (edge: Edge, customSettings: any) => {
    customizedEdges.add(edge.id);
    edges.update((currentEdges) =>
      currentEdges.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            type: customSettings.type,
            animated: customSettings.animated,
            data: { ...e.data, customized: true },
            style: `stroke: ${customSettings.color}; stroke-width: ${customSettings.width}px;`,
            markerEnd: customSettings.markerEnd
              ? { type: MarkerType.ArrowClosed, color: customSettings.color }
              : undefined,
            markerStart: customSettings.markerStart
              ? { type: MarkerType.ArrowClosed, color: customSettings.color }
              : undefined,
          };
        }
        return e;
      })
    );
  };

  // Reset edge to default settings
  const onEdgeResetToDefault = (edgeId: string) => {
    customizedEdges.delete(edgeId);
    edges.update((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            type: $edgeSettings.type,
            animated: $edgeSettings.animated,
            data: { ...edge.data, customized: false },
            style: `stroke: ${$edgeSettings.color}; stroke-width: ${$edgeSettings.width}px;`,
            markerEnd: $edgeSettings.markerEnd
              ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
              : undefined,
            markerStart: $edgeSettings.markerStart
              ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
              : undefined,
          };
        }
        return edge;
      })
    );
  };

  // Create a reactive statement to log edge settings changes
  $effect(() => {
    console.log("Edge settings updated:", $edgeSettings);
    // Update only non-customized edges when settings change
    edges.update((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.data?.customized || customizedEdges.has(edge.id)) {
          return edge;
        }
        return {
          ...edge,
          type: $edgeSettings.type,
          animated: $edgeSettings.animated,
          style: `stroke: ${$edgeSettings.color}; stroke-width: ${$edgeSettings.width}px;`,
          markerEnd: $edgeSettings.markerEnd
            ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
            : undefined,
          markerStart: $edgeSettings.markerStart
            ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
            : undefined,
        };
      })
    );
  });
</script>

<div class="overview" style="height: 100vh; width: 100%;" data-flowid={modelId}>
  {console.log($snapToGrid)}
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    defaultEdgeOptions={{
      type: $edgeSettings.type,
      animated: $edgeSettings.animated,
      style: `stroke: ${$edgeSettings.color}; stroke-width: ${$edgeSettings.width}px;`,
      markerEnd: $edgeSettings.markerEnd
        ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
        : undefined,
      markerStart: $edgeSettings.markerStart
        ? { type: MarkerType.ArrowClosed, color: $edgeSettings.color }
        : undefined,
    }}
    fitView
    snapGrid={$snapToGrid ? [10, 10] : [0.1, 0.1]}
    connectionMode={ConnectionMode.Loose}
    on:nodeschange={({ detail }) => nodes.set(detail)}
    on:edgeschange={({ detail }) => {
      console.log("Edges changed:", detail);
      edges.set(detail);
    }}
    on:connect={({ detail }) => onConnect(detail)}
    on:edgeclick={onEdgeClick}
    on:paneclick={onPaneClick}
    on:edgecontextmenu={({ detail }) =>
      console.log("Edge right-clicked:", detail)}
    on:connectstart={(event) => console.log("Connection started:", event)}
    on:connectend={(event) => console.log("Connection ended:", event)}
  >
    {#if $showGrid}
      <Background patternColor="#aaa" gap={20} />
    {/if}
    <Controls />
    <FlowToolbar {nodes} {showGrid} {snapToGrid} />
    <EdgeSettingsPanel />
    {#if $selectedEdge}
      <EdgeCustomizationPanel
        edge={$selectedEdge}
        selected={true}
        on:customize={(event) => onEdgeCustomize($selectedEdge, event.detail)}
        on:reset={() => onEdgeResetToDefault($selectedEdge.id)}
      />
    {/if}
    <MiniMap
      zoomable
      pannable
      height={120}
      nodeClass={(node) => node.type || ""}
    />
  </SvelteFlow>
</div>

<style>
  .overview {
    display: flex;
    flex-direction: column;
  }

  :global(.svelte-flow__attribution) {
    display: none !important;
  }

  /* Minimap Dark Mode Styles */
  :global(.dark .svelte-flow__minimap) {
    background-color: rgb(30 41 59 / 0.8) !important;
    border-radius: 0.75rem;
    border: 1px solid rgb(51 65 85);
  }

  :global(.dark .svelte-flow__minimap-svg) {
    border-radius: 0.5rem;
    overflow: visible;
  }

  :global(.dark .svelte-flow__minimap-node) {
    fill: rgb(51 65 85);
  }

  :global(.dark .svelte-flow__minimap-node.selected) {
    fill: rgb(79 70 229);
  }

  :global(.dark .svelte-flow__minimap-mask) {
    fill: rgb(15 23 42 / 0.8);
  }

  :global(.svelte-flow__controls) {
    border-radius: 0.75rem;
    padding: 8px !important;
    margin: 8px !important;
    gap: 8px !important;
  }

  :global(.svelte-flow__controls-button) {
    border: none !important;
    border-radius: 0.375rem !important;
    width: 32px !important;
    height: 32px !important;
    transition: all 0.2s !important;
  }

  :global(.svelte-flow__controls-button svg) {
    fill: currentColor;
    width: 14px;
    height: 14px;
  }

  /* Controls Dark Mode Styles */
  :global(.dark .svelte-flow__controls) {
    background-color: rgb(30 41 59 / 0.8) !important;
    border: 1px solid rgb(51 65 85);
  }

  :global(.dark .svelte-flow__controls-button) {
    background-color: rgb(51 65 85) !important;
    color: rgb(148 163 184) !important;
  }

  :global(.dark .svelte-flow__controls-button:hover) {
    background-color: rgb(71 85 105) !important;
    color: rgb(226 232 240) !important;
  }

  :global(.dark .svelte-flow__controls-button svg) {
    fill: currentColor;
  }
</style>
