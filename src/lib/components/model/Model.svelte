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
  import { modelStore } from "$lib/stores/ModelStore";
  import { undoRedoStore } from "$lib/stores/UndoRedoStore";
  import { edgeSettings } from "./edge-settings-store";
  import ResizableNode from "./ResizableNode.svelte";
  import CircleNode from "./CircleNode.svelte";
  import EllipseNode from "./EllipseNode.svelte";

  import EdgeCustomizationPanel from "./EdgeCustomizationPanel.svelte";

  import FlowToolbar from "./FlowToolbar.svelte";
  import { driver, type DriveStep, type Driver } from "driver.js";
  import "driver.js/dist/driver.css";

  let { modelId } = $props<{
    modelId: string;
    projectId: string;
  }>();

  const nodeTypes: NodeTypes = {
    ResizableNode: ResizableNode as any,
    CircleNode: CircleNode as any,
    EllipseNode: EllipseNode as any,
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

  // Expose method for tutorial to add nodes
  export function addTutorialNode(nodeType: string = "ResizableNode") {
    const position = {
      x: 300,
      y: 200,
    };

    const newNode: Node = {
      id: `tutorial-${nodeType}-${Date.now()}`,
      type: nodeType,
      position: position,
      data: { label: "Tutorial Node" },
      selected: false,
    };

    nodes.update((currentNodes) => [...currentNodes, newNode]);

    return newNode.id;
  }

  // Undo/Redo functions
  function performUndo() {
    const previousState = undoRedoStore.undo();
    if (previousState) {
      nodes.set(previousState.nodes);
      edges.set(previousState.edges);
      undoRedoStore.completeHistoryChange();
    }
  }

  function performRedo() {
    const nextState = undoRedoStore.redo();
    if (nextState) {
      nodes.set(nextState.nodes);
      edges.set(nextState.edges);
      undoRedoStore.completeHistoryChange();
    }
  }

  // Expose method for tutorial to add nodes at specific position
  export function addTutorialNodeAt(
    nodeType: string = "ResizableNode",
    x: number,
    y: number,
    label?: string
  ) {
    const newNode: Node = {
      id: `tutorial-${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x, y },
      data: { label: label || "Tutorial Node" },
      selected: false,
    };

    nodes.update((currentNodes) => [...currentNodes, newNode]);

    return newNode.id;
  }

  // Expose method to select a node
  export function selectNode(nodeId: string) {
    nodes.update((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }))
    );
  }

  // Expose undo/redo methods
  export { performUndo, performRedo };

  // Expose method to create an edge between two nodes
  export function addTutorialEdge(sourceNodeId: string, targetNodeId: string) {
    const newEdge: Edge = {
      id: `tutorial-edge-${Date.now()}`,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: null,
      targetHandle: null,
      data: { customized: false },
      style: "",
      markerEnd: undefined,
      markerStart: undefined,
    };

    edges.update((currentEdges) => [...currentEdges, newEdge]);

    return newEdge.id;
  }

  // Register globally for tutorial access
  onMount(() => {
    (window as any).tutorialMethods = {
      addTutorialNode,
      addTutorialNodeAt,
      selectNode,
      addTutorialEdge,
    };

    return () => {
      delete (window as any).tutorialMethods;
    };
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

  // Listen for duplicate, z-index, and auto-connect events
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

    const handleBringToFront = (event: CustomEvent) => {
      const detail = event.detail;
      const nodeId = detail?.id;

      if (!nodeId) {
        console.error("BringToFront event received without a valid node ID.");
        return;
      }

      nodes.update((currentNodes) => {
        // Find the node to bring to front
        const nodeIndex = currentNodes.findIndex((node) => node.id === nodeId);
        if (nodeIndex === -1) return currentNodes;

        // Remove the node from its current position
        const nodeToMove = currentNodes[nodeIndex];
        const remainingNodes = currentNodes.filter(
          (node) => node.id !== nodeId
        );

        // Add it to the end (top layer)
        const newNodes = [...remainingNodes, nodeToMove];

        // Save state for undo/redo after a short delay
        setTimeout(() => {
          if (!undoRedoStore.isApplyingChange) {
            undoRedoStore.saveState(newNodes, $edges);
          }
        }, 100);

        return newNodes;
      });
    };

    const handleSendToBack = (event: CustomEvent) => {
      const detail = event.detail;
      const nodeId = detail?.id;

      if (!nodeId) {
        console.error("SendToBack event received without a valid node ID.");
        return;
      }

      nodes.update((currentNodes) => {
        // Find the node to send to back
        const nodeIndex = currentNodes.findIndex((node) => node.id === nodeId);
        if (nodeIndex === -1) return currentNodes;

        // Remove the node from its current position
        const nodeToMove = currentNodes[nodeIndex];
        const remainingNodes = currentNodes.filter(
          (node) => node.id !== nodeId
        );

        // Add it to the beginning (back layer)
        const newNodes = [nodeToMove, ...remainingNodes];

        // Save state for undo/redo after a short delay
        setTimeout(() => {
          if (!undoRedoStore.isApplyingChange) {
            undoRedoStore.saveState(newNodes, $edges);
          }
        }, 100);

        return newNodes;
      });
    };

    const handleAutoConnect = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail?.action === "connect-latest-nodes") {
        // Get the two most recent nodes
        const currentNodes = $nodes;
        if (currentNodes.length >= 2) {
          const sourceNode = currentNodes[currentNodes.length - 2];
          const targetNode = currentNodes[currentNodes.length - 1];

          // Create connection
          const connection = {
            source: sourceNode.id,
            target: targetNode.id,
            sourceHandle: null,
            targetHandle: null,
          };

          onConnect(connection);
        }
      }
    };

    document.addEventListener("duplicate", handleDuplicate as EventListener);
    document.addEventListener(
      "bringToFront",
      handleBringToFront as EventListener
    );
    document.addEventListener("sendToBack", handleSendToBack as EventListener);
    document.addEventListener(
      "autoConnectNodes",
      handleAutoConnect as EventListener
    );

    return () => {
      document.removeEventListener(
        "duplicate",
        handleDuplicate as EventListener
      );
      document.removeEventListener(
        "bringToFront",
        handleBringToFront as EventListener
      );
      document.removeEventListener(
        "sendToBack",
        handleSendToBack as EventListener
      );
      document.removeEventListener(
        "autoConnectNodes",
        handleAutoConnect as EventListener
      );
    };
  });

  $effect(() => {
    const modelData = modelStore.currentModel;

    if (!modelData || initialLoadComplete) {
      return;
    }

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

          // Convert objects to arrays if needed (for new models that might have {} instead of [])
          const finalNodes = Array.isArray(parsedNodes) ? parsedNodes : [];
          const finalEdges = Array.isArray(parsedEdges) ? parsedEdges : [];

          nodes.set(finalNodes);
          edges.set(finalEdges);

          // Initialize undo/redo history
          undoRedoStore.initialize(finalNodes, finalEdges);

          // Apply loaded edge settings
          const firstEdge = finalEdges[0];
          if (firstEdge && firstEdge.style) {
            const colorMatch = firstEdge.style.match(
              /stroke: (#[0-9a-fA-F]{6})/
            );
            const widthMatch = firstEdge.style.match(/stroke-width: (\d+)px/);

            edgeSettings.set({
              type: firstEdge.type || "default",
              color: colorMatch ? colorMatch[1] : "#000000",
              width: widthMatch ? parseInt(widthMatch[1]) : 1,
              animated: firstEdge.animated || false,
              markerStart: !!firstEdge.markerStart,
              markerEnd: !!firstEdge.markerEnd,
            });
          }

          initialLoadComplete = true;
        } catch (error) {
          console.error("Error parsing model data:", error);
          initialLoadComplete = true;
        }
      } else {
        initialLoadComplete = true;
      }
    } else {
      initialLoadComplete = true;
    }
  });

  let saveTimeout: number;
  let historyTimeout: number;

  const debouncedHistorySave = () => {
    if (historyTimeout) clearTimeout(historyTimeout);
    historyTimeout = setTimeout(() => {
      if (!undoRedoStore.isApplyingChange) {
        undoRedoStore.saveState($nodes, $edges);
      }
    }, 500) as unknown as number;
  };

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (!modelId) return;

      try {
        const currentNodes = $nodes;
        const currentEdges = $edges;

        const cleanNodes = currentNodes.map((node) => ({
          ...node,
          measured: undefined,
        }));

        const cleanEdges = currentEdges.map((edge) => {
          const newEdge = { ...edge };
          return newEdge;
        });

        await modelStore.updateModel(modelId, {
          nodes: JSON.stringify(cleanNodes) as any,
          edges: JSON.stringify(cleanEdges) as any,
        });
      } catch (error) {
        console.error("Error saving model:", error);
      }
    }, 1000) as unknown as number;
  };

  // Subscribe to nodes changes for saving and history
  $effect(() => {
    const currentNodes = $nodes;
    if (initialLoadComplete && Array.isArray(currentNodes)) {
      debouncedSave();
      debouncedHistorySave();
    }
  });

  // Subscribe to edges changes for saving and history
  $effect(() => {
    const currentEdges = $edges;
    if (initialLoadComplete && Array.isArray(currentEdges)) {
      debouncedSave();
      debouncedHistorySave();
    }
  });

  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (historyTimeout) clearTimeout(historyTimeout);
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

  // Create a reactive statement to update edge settings
  let lastEdgeSettings = $state($edgeSettings);
  $effect(() => {
    const currentSettings = $edgeSettings;

    // Only update if settings actually changed to prevent infinite loops
    if (
      !initialLoadComplete ||
      (lastEdgeSettings.type === currentSettings.type &&
        lastEdgeSettings.color === currentSettings.color &&
        lastEdgeSettings.width === currentSettings.width &&
        lastEdgeSettings.animated === currentSettings.animated &&
        lastEdgeSettings.markerEnd === currentSettings.markerEnd &&
        lastEdgeSettings.markerStart === currentSettings.markerStart)
    ) {
      return;
    }

    lastEdgeSettings = { ...currentSettings };

    // Update only non-customized edges when settings change
    edges.update((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.data?.customized || customizedEdges.has(edge.id)) {
          return edge;
        }
        return {
          ...edge,
          type: currentSettings.type,
          animated: currentSettings.animated,
          style: `stroke: ${currentSettings.color}; stroke-width: ${currentSettings.width}px;`,
          markerEnd: currentSettings.markerEnd
            ? { type: MarkerType.ArrowClosed, color: currentSettings.color }
            : undefined,
          markerStart: currentSettings.markerStart
            ? { type: MarkerType.ArrowClosed, color: currentSettings.color }
            : undefined,
        };
      })
    );
  });

  // --- Driver.js Tour Definition ---
  const driverObj = driver({
    allowClose: false, // Prevent closing by clicking overlay
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#flow-toolbar",
        popover: {
          title: "Model Building Tools",
          description:
            "Add Rectangle or Circle nodes, toggle grid visibility and snapping, and download your model as an image using this toolbar.",
          side: "right",
          align: "start",
        },
      },
      {
        element: ".svelte-flow", // Target the main canvas area
        popover: {
          title: "Your Modeling Canvas",
          description:
            "This is your main workspace. Drag nodes from the toolbar to add them. Connect nodes by dragging between their handles.",
          side: "top",
          align: "center",
        },
      },
      {
        element: ".svelte-flow__controls", // Target the controls panel
        popover: {
          title: "Canvas Controls",
          description:
            "Use these controls to zoom in/out, fit the entire model to the view, and lock/unlock the canvas panning.",
          side: "top", // Adjust side based on actual position
          align: "end",
        },
      },
      {
        element: ".svelte-flow__minimap", // Target the minimap
        popover: {
          title: "Minimap Navigation",
          description:
            "This provides an overview of your entire model. Click and drag within the minimap to quickly navigate large canvases.",
          side: "left", // Adjust side based on actual position
          align: "end",
        },
      },
      {
        element: ".svelte-flow__node", // Target the first node found
        popover: {
          title: "Nodes",
          description:
            "Nodes represent the core concepts or variables in your model. Click to select, resize using handles, and double-click (if applicable) to edit content.",
          side: "right",
          align: "start",
        },
        onHighlightStarted: (
          element: Element | undefined,
          step: DriveStep,
          options: { driver: Driver }
        ) => {
          const toolbar = document.getElementById("flow-toolbar");
          if (!document.querySelector(".svelte-flow__node")) {
            options.driver.moveNext(); // Use options.driver
          } else if (toolbar) {
            toolbar.classList.add("driver-secondary-highlight");
          }
        },
        onDeselected: () => {
          const toolbar = document.getElementById("flow-toolbar");
          toolbar?.classList.remove("driver-secondary-highlight");
        },
      },
      {
        element: ".svelte-flow__edge", // Target the first edge found
        popover: {
          title: "Edges",
          description:
            "Edges show the relationships or connections between your concepts. Click an edge to select it and customize its appearance using the panel that appears.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (
          element: Element | undefined,
          step: DriveStep,
          options: { driver: Driver }
        ) => {
          const toolbar = document.getElementById("flow-toolbar");
          if (!document.querySelector(".svelte-flow__edge")) {
            options.driver.moveNext(); // Use options.driver
          } else if (toolbar) {
            toolbar.classList.add("driver-secondary-highlight");
          }
        },
        onDeselected: () => {
          const toolbar = document.getElementById("flow-toolbar");
          toolbar?.classList.remove("driver-secondary-highlight");
        },
      },
      {
        element: "#edge-customization-panel", // Assuming this ID exists
        popover: {
          title: "Edge Customization",
          description:
            "When an edge is selected, use this panel to change its style, color, arrowheads, and animation to clearly communicate the nature of the relationship.",
          side: "left",
          align: "start",
        },
        onHighlightStarted: (
          element: Element | undefined,
          step: DriveStep,
          options: { driver: Driver }
        ) => {
          const panel = document.getElementById("edge-customization-panel");
          if (!panel || getComputedStyle(panel).display === "none") {
            options.driver.moveNext(); // Use options.driver
          }
        },
      },
      {
        element: "#model-view-container",
        popover: {
          title: "Model View Container",
          description:
            "This is the container for the model view. It's used to apply any additional styling or layout constraints.",
          side: "right",
          align: "start",
        },
      },
    ],
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

  /* Override driver.js button styles specifically within this component context */
  :global(
      .driver-popover.quester-driver-theme
        .driver-popover-navigation-btns
        button
    ) {
    background-color: hsl(var(--primary)) !important;
    color: hsl(var(--primary-foreground)) !important;
    border: 1px solid transparent !important;
    padding: 0.5rem 1rem !important;
    border-radius: 0.375rem !important; /* rounded-md */
    font-size: 0.875rem !important; /* text-sm */
    font-weight: 500 !important; /* medium */
    transition: background-color 0.2s !important;
    /* Reset potential conflicting styles */
    box-shadow: none !important;
    text-transform: none !important;
  }

  :global(
      .driver-popover.quester-driver-theme
        .driver-popover-navigation-btns
        button:hover
    ) {
    /* Adjust hover state - assuming a slightly darker/lighter primary */
    /* You might need to define a --primary-hover variable or adjust opacity */
    filter: brightness(90%) !important;
  }

  /* Ensure disabled state is clear if needed */
  :global(
      .driver-popover.quester-driver-theme
        .driver-popover-navigation-btns
        button:disabled
    ) {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }

  /* Style for secondary highlight during specific tour steps */
  :global(#flow-toolbar.driver-secondary-highlight) {
    outline: 2px solid hsl(var(--primary)) !important;
    outline-offset: 2px;
    box-shadow: 0 0 10px hsl(var(--primary) / 0.5) !important; /* Optional glow */
    transition:
      outline 0.2s,
      box-shadow 0.2s;
    z-index: 10001 !important; /* Ensure it's above the driver overlay */
  }
</style>
