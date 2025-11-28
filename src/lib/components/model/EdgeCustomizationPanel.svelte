<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Edge } from "@xyflow/svelte";
  import { _ } from "svelte-i18n";

  export let edge: Edge;
  export let selected = false;

  const dispatch = createEventDispatcher();

  let customSettings = {
    type: edge.type || "default",
    animated: edge.animated || false,
    color: "#374151",
    width: 2,
    markerStart: false,
    markerEnd: false,
  };

  // Extract current settings from edge
  $: {
    const style = edge.style as string;
    if (style) {
      const colorMatch = style.match(/stroke: ([^;]+);/);
      const widthMatch = style.match(/stroke-width: (\d+)px/);

      if (colorMatch) customSettings.color = colorMatch[1];
      if (widthMatch) customSettings.width = parseInt(widthMatch[1]);
    }

    customSettings.markerStart = !!edge.markerStart;
    customSettings.markerEnd = !!edge.markerEnd;
    customSettings.animated = edge.animated || false;
    customSettings.type = edge.type || "default";
  }

  function applyCustomSettings() {
    dispatch("customize", customSettings);
  }

  function resetToDefault() {
    dispatch("reset");
  }

  let center = { x: 0, y: 0 };

  function updatePosition() {
    if (!edge || !selected) return;

    const sourceNode = document.querySelector(`[data-id="${edge.source}"]`);
    const targetNode = document.querySelector(`[data-id="${edge.target}"]`);
    if (sourceNode && targetNode) {
      const sourceRect = sourceNode.getBoundingClientRect();
      const targetRect = targetNode.getBoundingClientRect();
      const x = (sourceRect.x + targetRect.x) / 2;
      const y = (sourceRect.y + targetRect.y) / 2;
      center = { x, y };
    }
  }

  $: if (edge && selected) {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(updatePosition);
  }
</script>

{#if selected}
  <div
    class="absolute z-50 transform -translate-x-1/2 -translate-y-full pointer-events-auto"
    style="left: {center.x}px; top: {center.y - 10}px;"
  >
    <div
      class="p-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all"
    >
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {$_("models.customization.connectionSettings")}
        </h3>
        <button
          class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          on:click={resetToDefault}
        >
          {$_("models.customization.reset")}
        </button>
      </div>

      <div class="space-y-3">
        <!-- Edge Type -->
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600 dark:text-gray-400">{$_("models.customization.type")}</label>
          <select
            bind:value={customSettings.type}
            class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded"
            on:change={applyCustomSettings}
          >
            <option value="default">{$_("models.customization.edgeTypes.default")}</option>
            <option value="step">{$_("models.customization.edgeTypes.step")}</option>
            <option value="smoothstep">{$_("models.customization.edgeTypes.smoothStep")}</option>
            <option value="straight">{$_("models.customization.edgeTypes.straight")}</option>
            <option value="bezier">{$_("models.customization.edgeTypes.bezier")}</option>
          </select>
        </div>

        <!-- Color -->
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600 dark:text-gray-400">{$_("models.customization.color")}</label>
          <div class="flex gap-2">
            <input
              type="color"
              bind:value={customSettings.color}
              class="w-8 h-8 rounded cursor-pointer"
              on:change={applyCustomSettings}
            />
          </div>
        </div>

        <!-- Width -->
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600 dark:text-gray-400">{$_("models.customization.width")}</label>
          <input
            type="range"
            min="1"
            max="10"
            bind:value={customSettings.width}
            class="w-full accent-indigo-600"
            on:change={applyCustomSettings}
          />
        </div>

        <!-- Animation -->
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={customSettings.animated}
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            on:change={applyCustomSettings}
          />
          <span class="text-xs text-gray-600 dark:text-gray-400 mt-2"
            >{$_("models.customization.animated")}</span
          >
        </label>

        <!-- Markers -->
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={customSettings.markerStart}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              on:change={applyCustomSettings}
            />
            <span class="text-xs text-gray-600 dark:text-gray-400 mt-2"
              >{$_('edgeCustomization.markerOne')}</span
            >
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={customSettings.markerEnd}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              on:change={applyCustomSettings}
            />
            <span class="text-xs text-gray-600 dark:text-gray-400 mt-2"
              >{$_('edgeCustomization.markerTwo')}</span
            >
          </label>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  div {
    pointer-events: all !important;
  }

  input,
  select,
  button {
    pointer-events: all !important;
  }
</style>
