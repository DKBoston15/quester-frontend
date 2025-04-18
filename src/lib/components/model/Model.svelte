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
  import { onDestroy, onMount } from "svelte";
  import "@xyflow/svelte/dist/style.css";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import { edgeSettings } from "./edge-settings-store";
  import ResizableNode from "./ResizableNode.svelte";
  import CircleNode from "./CircleNode.svelte";

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
  let initialLoadComplete = $state(false);

  // Track customized edges and selected edge
  const customizedEdges = new Set<string>();
  const selectedEdge = writable<Edge | null>(null);

  // Get the model name reactively
  let modelName = $derived(modelStore.currentModel?.name);

  // Log currentModel changes for debugging
  $effect(() => {
    console.log(
      "Model.svelte $effect: currentModel updated",
      modelStore.currentModel
    );
  });

  // Function to duplicate a node
  function duplicateNode(nodeToDuplicate: Node) {
    if (!nodeToDuplicate) {
      console.error("Duplicate Error: Could not find node to duplicate.");
      return;
    }

    // --- Get Position Safely ---
    let currentPosition = { x: 0, y: 0 };
    if (nodeToDuplicate.position) {
      currentPosition = nodeToDuplicate.position;
    } else {
      console.warn(
        `Duplicate Warning: Position missing for node ${nodeToDuplicate.id}. Using (0,0).`
      );
    }
    const newPosition = {
      x: currentPosition.x + 20,
      y: currentPosition.y + 20,
    };

    // --- Get Size Safely ---
    // Check top-level first, then data as fallback
    const width = nodeToDuplicate.width ?? nodeToDuplicate.data?.width;
    const height = nodeToDuplicate.height ?? nodeToDuplicate.data?.height;

    // --- Construct newNode Safely ---
    // Base properties first
    const newNode: Node = {
      id: `${nodeToDuplicate.id}-copy-${Date.now()}`,
      type: nodeToDuplicate.type,
      position: newPosition,
      data: { ...nodeToDuplicate.data }, // Copy data first
      selected: false,
    };

    // Add optional properties if they exist
    if (typeof width === "number") {
      newNode.width = width;
    }
    if (typeof height === "number") {
      newNode.height = height;
    }
    // Handle style property (string or object)
    if (nodeToDuplicate.style) {
      if (typeof nodeToDuplicate.style === "string") {
        newNode.style = nodeToDuplicate.style;
      } else if (
        typeof nodeToDuplicate.style === "object" &&
        nodeToDuplicate.style !== null
      ) {
        // Attempt to convert style object to CSS string
        try {
          newNode.style = Object.entries(nodeToDuplicate.style)
            .map(
              ([key, value]) =>
                `${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value};`
            )
            .join(" ");
        } catch (e) {
          console.warn(
            "Could not convert style object to string:",
            e,
            nodeToDuplicate.style
          );
          // Optionally assign an empty string or default style if conversion fails
          newNode.style = "";
        }
      }
    }
    if (nodeToDuplicate.sourcePosition) {
      newNode.sourcePosition = nodeToDuplicate.sourcePosition;
    }
    if (nodeToDuplicate.targetPosition) {
      newNode.targetPosition = nodeToDuplicate.targetPosition;
    }
    if (nodeToDuplicate.parentId) {
      newNode.parentId = nodeToDuplicate.parentId;
    }
    if (nodeToDuplicate.extent) {
      newNode.extent = nodeToDuplicate.extent;
    }

    nodes.update((currentNodes) => [...currentNodes, newNode]);
  }

  // Listen for duplicate events
  onMount(() => {
    const handleDuplicate = (event: CustomEvent) => {
      // Extract the id from the event detail
      const detail = event.detail;
      const nodeIdToDuplicate = detail?.id;

      if (!nodeIdToDuplicate || typeof nodeIdToDuplicate !== "string") {
        console.error(
          "Duplicate event received without a valid node ID.",
          detail
        );
        return;
      }

      // Find the node in the current state using the ID
      const currentNode = $nodes.find((n) => n.id === nodeIdToDuplicate);

      if (currentNode) {
        duplicateNode(currentNode); // Pass the found node object
      } else {
        console.error(`Node with ID ${nodeIdToDuplicate} not found in store.`);
      }
    };

    document.addEventListener("duplicate", handleDuplicate as EventListener);

    return () => {
      document.removeEventListener(
        "duplicate",
        handleDuplicate as EventListener
      );
    };
  });

  $effect(() => {
    const modelData = modelStore.currentModel;
    console.log(
      "Model.svelte: $effect watching currentModel triggered. InitialLoadComplete:",
      initialLoadComplete,
      "Data:",
      modelData
    );

    if (!modelData) {
      console.log("Model.svelte: No model data, returning.");
      return;
    }

    // Only process if the initial load hasn't happened yet
    if (!initialLoadComplete) {
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
              console.log(
                "Model.svelte: Performing initial set of nodes and edges."
              );
              nodes.set(parsedNodes);
              edges.set(parsedEdges);

              // Apply loaded edge settings
              const firstEdge = parsedEdges[0];
              if (firstEdge) {
                edgeSettings.set({
                  type: firstEdge.type,
                  color: firstEdge.style.match(/stroke: (#[0-9a-fA-F]{6})/)[1],
                  width: parseInt(
                    firstEdge.style.match(/stroke-width: (\d+)px/)[1]
                  ),
                  animated: firstEdge.animated,
                  markerStart: !!firstEdge.markerStart,
                  markerEnd: !!firstEdge.markerEnd,
                });
                console.log(
                  "Loaded edge settings applied during initial load:",
                  firstEdge
                );
              }

              console.log("Model.svelte: Marking initial load complete.");
              initialLoadComplete = true; // Mark as complete AFTER setting data
            }
          } catch (error) {
            console.error(
              "Error parsing nodes or edges during initial load:",
              error
            );
            // Consider setting initialLoadComplete = true even on error?
            // Maybe not, to allow retry if modelData updates again.
          }
        } else {
          console.log(
            "Model.svelte: modelNodes or modelEdges missing/invalid during initial load."
          );
        }
      } else {
        console.log(
          "Model.svelte: model is not a valid object during initial load."
        );
      }
    } else {
      console.log(
        "Model.svelte: Initial load already complete, skipping set from currentModel."
      );
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

        console.log(
          "Saving model with nodes:",
          cleanNodes,
          "and edges:",
          cleanEdges
        );

        await modelStore.updateModel(modelId, {
          nodes: JSON.stringify(cleanNodes) as any,
          edges: JSON.stringify(cleanEdges) as any,
        });
      } catch (error) {
        console.error("Error saving model:", error);
      }
    }, 1000) as unknown as number;
  };

  $effect(() => {
    if (initialLoadComplete && Array.isArray($nodes)) {
      debouncedSave();
    }
  });

  $effect(() => {
    if (initialLoadComplete && Array.isArray($edges)) {
      debouncedSave();
    }
  });

  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  $effect(() => {
    console.log("Current edge settings:", $edgeSettings);
  });

  const onConnect = (params: any) => {
    const newEdge: Edge = {
      ...params,
      id: `e${Date.now()}`,
      data: { customized: false },
      // Remove default settings
      style: "",
      markerEnd: undefined,
      markerStart: undefined,
    };

    console.log("Creating new edge without default settings:", newEdge);

    edges.update((eds) => {
      const updatedEdges = [...eds, newEdge];
      return updatedEdges;
    });
  };

  // Handle edge selection
  const onEdgeClick = (event: CustomEvent<{ edge: Edge }>) => {
    const edge = event.detail.edge;
    selectedEdge.set(edge);
  };

  // Handle deselection
  const onPaneClick = () => {
    selectedEdge.set(null);
  };

  // Handle edge customization
  const onEdgeCustomize = (edge: Edge, customSettings: any) => {
    console.log("Customizing edge:", edge.id, "with settings:", customSettings);
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
      edges.set(detail);
    }}
    on:connect={({ detail }) => onConnect(detail)}
    on:edgeclick={onEdgeClick}
    on:paneclick={onPaneClick}
    on:duplicate={({ detail }) => duplicateNode(detail)}
  >
    {#if $showGrid}
      <Background patternColor="#aaa" gap={20} />
    {/if}
    <Controls />
    <FlowToolbar {nodes} {showGrid} {snapToGrid} {modelName} />
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
