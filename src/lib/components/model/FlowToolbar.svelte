<script lang="ts">
  import { writable } from "svelte/store";
  import type { Node } from "@xyflow/svelte";
  import { toPng } from "html-to-image";
  import {
    getNodesBounds,
    getViewportForBounds,
    useSvelteFlow,
  } from "@xyflow/svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";

  // Define props using $props
  let {
    nodes,
    showGrid,
    snapToGrid,
    modelName = "",
  } = $props<{
    nodes: ReturnType<typeof writable<Node[]>>;
    showGrid: ReturnType<typeof writable<boolean>>;
    snapToGrid: ReturnType<typeof writable<boolean>>;
    modelName?: string;
  }>();

  let bgColor = "#ffffff";
  let isTransparent = false;

  const { screenToFlowPosition, getViewport } = useSvelteFlow(); // Get flow methods

  const addNode = (type: string, options: any = {}) => {
    // Get viewport dimensions (assuming it takes full width/height for calculation)
    // A more robust way might involve getting the actual element dimensions
    const flowElement = document.querySelector(".svelte-flow"); // Find the flow container
    const containerWidth = flowElement?.clientWidth ?? window.innerWidth;
    const containerHeight = flowElement?.clientHeight ?? window.innerHeight;

    // Calculate the center of the screen in screen coordinates
    const screenCenterX = containerWidth / 2;
    const screenCenterY = containerHeight / 2;

    // Project the screen center to flow coordinates
    const flowPosition = screenToFlowPosition({
      x: screenCenterX,
      y: screenCenterY,
    });

    // TODO: Offset by node dimensions if needed for true centering
    // const nodeWidth = type === 'CircleNode' ? 100 : 150; // Example default widths
    // const nodeHeight = type === 'CircleNode' ? 100 : 50; // Example default heights
    // flowPosition.x -= nodeWidth / 2;
    // flowPosition.y -= nodeHeight / 2;

    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: flowPosition, // Use calculated position
      data: { label: options.label || "" },
      sourcePosition: options.sourcePosition,
      targetPosition: options.targetPosition,
    };

    nodes.update((currentNodes: Node[]) => [...currentNodes, newNode]);
  };

  const downloadImage = async () => {
    const nodesBounds = getNodesBounds($nodes);
    
    // Add padding around the content (20% on each side)
    const padding = 100;
    const contentWidth = nodesBounds.width + padding * 2;
    const contentHeight = nodesBounds.height + padding * 2;
    
    // Ensure minimum dimensions for very small models
    const minWidth = 400;
    const minHeight = 300;
    const imageWidth = Math.max(contentWidth, minWidth);
    const imageHeight = Math.max(contentHeight, minHeight);
    
    // Calculate viewport to fit all content with padding
    const viewport = getViewportForBounds(
      {
        x: nodesBounds.x - padding,
        y: nodesBounds.y - padding,
        width: contentWidth,
        height: contentHeight,
      },
      imageWidth,
      imageHeight,
      0.1, // Lower min zoom to accommodate larger models
      3.0, // Higher max zoom for better quality
      0.05 // Smaller padding since we already added manual padding
    );
    
    const viewportDomNode = document.querySelector<HTMLElement>(".svelte-flow__viewport");

    if (viewport && viewportDomNode) {
      try {
        const dataUrl = await toPng(viewportDomNode, {
          backgroundColor: isTransparent ? "transparent" : bgColor,
          width: imageWidth,
          height: imageHeight,
          style: {
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          },
          pixelRatio: 2, // Higher resolution for better quality
          // Filter out UI elements that shouldn't be in export
          filter: (node: Element) => {
            if (node.id === 'flow-toolbar' || 
                node.classList?.contains('svelte-flow__controls') ||
                node.classList?.contains('svelte-flow__minimap') ||
                node.id === 'edge-customization-panel') {
              return false;
            }
            return true;
          },
        });

        const fileName = modelName ? `${modelName.replace(/[^a-zA-Z0-9]/g, '-')}-model.png` : "flow-diagram.png";
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error("Error generating image:", error);
      }
    }
  };
</script>

<div
  id="flow-toolbar"
  class="inline-block p-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all absolute top-4 left-4 z-10"
>
  <div class="flex flex-col gap-4">
    {#if modelName}
      <div
        class="pb-2 border-b border-gray-200 dark:border-gray-700 max-w-[200px]"
      >
        <Tooltip.Root>
          <Tooltip.Trigger class="w-full text-left">
            <h2
              class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate"
            >
              {modelName}
            </h2>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={5}>
            <p>{modelName}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/if}

    <!-- Add Nodes Section -->
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
        >Add Nodes</span
      >
      <div class="flex gap-2">
        <button
          id="add-rectangle-node"
          onclick={() => addNode("ResizableNode")}
          class="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
        >
          <span class="w-4 h-4 border-2 border-current rounded-sm"></span>
          Rectangle
        </button>
        <button
          id="add-circle-node"
          onclick={() => addNode("CircleNode")}
          class="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
        >
          <span class="w-4 h-4 border-2 border-current rounded-full"></span>
          Circle
        </button>
      </div>
    </div>

    <!-- View Settings Section -->
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
        >View Settings</span
      >
      <div class="flex flex-col gap-2">
        <label
          class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
        >
          <div class="flex items-center h-4">
            <input
              type="checkbox"
              bind:checked={$showGrid}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          <div class="pt-2">Show Grid</div>
        </label>
        <label
          class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
        >
          <div class="flex items-center h-4">
            <input
              type="checkbox"
              bind:checked={$snapToGrid}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          <div class="pt-2">Snap to Grid</div>
        </label>
      </div>
    </div>

    <!-- Download Section -->
    <hr class="border-gray-200 dark:border-gray-700" />
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
        >Background Color for Download</span
      >
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <div class="relative group">
            <input
              type="color"
              bind:value={bgColor}
              disabled={isTransparent}
              class="{isTransparent
                ? 'opacity-30'
                : ''} w-8 h-8 rounded cursor-pointer"
            />
          </div>
          <label
            class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap"
          >
            <input
              type="checkbox"
              bind:checked={isTransparent}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            Transparent
          </label>
        </div>
        <button
          onclick={downloadImage}
          class="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Image
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .flow-toolbar {
    position: absolute;
    top: 20px;
    left: 20px;
    background: white;
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .toolbar-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-label {
    font-size: 12px;
    color: #666;
    padding: 0 4px;
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    background: #f5f5f5;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  button:hover {
    background: #e5e5e5;
  }

  button.active {
    background: #4299e1;
    color: white;
  }

  .icon {
    font-size: 16px;
  }
</style>
