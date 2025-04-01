<!-- src/lib/components/model/EdgeSettingsPanel.svelte -->
<script lang="ts">
  import { edgeSettings, type EdgeType } from "./edge-settings-store";
  import { Panel } from "@xyflow/svelte";

  const edgeTypes: { value: EdgeType; label: string }[] = [
    { value: "straight", label: "Straight" },
    { value: "step", label: "Step" },
    { value: "smoothstep", label: "Smooth Step" },
    { value: "bezier", label: "Bezier" },
  ];

  let activeSection: "type" | "style" | "markers" | null = null;

  function toggleSection(section: "type" | "style" | "markers") {
    activeSection = activeSection === section ? null : section;
  }
</script>

<Panel position="top-right" class="edge-settings-panel z-50">
  <div
    class="p-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all"
  >
    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
      Default Connection Settings
    </h3>

    <!-- Type Section -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <button
        class="w-full py-2 flex justify-between items-center text-left"
        on:click={() => toggleSection("type")}
      >
        <span class="text-sm text-gray-700 dark:text-gray-300"
          >Connection Type</span
        >
        <svg
          class="w-4 h-4 transform transition-transform {activeSection ===
          'type'
            ? 'rotate-180'
            : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {#if activeSection === "type"}
        <div class="pb-3">
          <select
            bind:value={$edgeSettings.type}
            class="w-full text-xs p-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded"
          >
            <option value="default">Default</option>
            <option value="step">Step</option>
            <option value="smoothstep">Smooth Step</option>
            <option value="straight">Straight</option>
            <option value="bezier">Bezier</option>
          </select>
          <label class="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              bind:checked={$edgeSettings.animated}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span class="text-xs text-gray-600 dark:text-gray-400"
              >Animated</span
            >
          </label>
        </div>
      {/if}
    </div>

    <!-- Style Section -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <button
        class="w-full py-2 flex justify-between items-center text-left"
        on:click={() => toggleSection("style")}
      >
        <span class="text-sm text-gray-700 dark:text-gray-300">Style</span>
        <svg
          class="w-4 h-4 transform transition-transform {activeSection ===
          'style'
            ? 'rotate-180'
            : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {#if activeSection === "style"}
        <div class="pb-3 space-y-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600 dark:text-gray-400">Color</label
            >
            <input
              type="color"
              bind:value={$edgeSettings.color}
              class="w-8 h-8 rounded cursor-pointer"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600 dark:text-gray-400">Width</label
            >
            <input
              type="range"
              min="1"
              max="10"
              bind:value={$edgeSettings.width}
              class="w-full accent-indigo-600"
            />
          </div>
        </div>
      {/if}
    </div>

    <!-- Markers Section -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <button
        class="w-full py-2 flex justify-between items-center text-left"
        on:click={() => toggleSection("markers")}
      >
        <span class="text-sm text-gray-700 dark:text-gray-300">Markers</span>
        <svg
          class="w-4 h-4 transform transition-transform {activeSection ===
          'markers'
            ? 'rotate-180'
            : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {#if activeSection === "markers"}
        <div class="pb-3">
          <div class="flex gap-4">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                bind:checked={$edgeSettings.markerStart}
                class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-xs text-gray-600 dark:text-gray-400"
                >Start Arrow</span
              >
            </label>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                bind:checked={$edgeSettings.markerEnd}
                class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-xs text-gray-600 dark:text-gray-400"
                >End Arrow</span
              >
            </label>
          </div>
        </div>
      {/if}
    </div>
  </div>
</Panel>

<style>
  :global(.edge-color-input) {
    appearance: none;
    -webkit-appearance: none;
    padding: 0;
  }

  :global(.edge-color-input::-webkit-color-swatch-wrapper) {
    padding: 0;
  }

  :global(.edge-color-input::-webkit-color-swatch) {
    border: none;
  }

  :global(.edge-settings-panel) {
    margin: 1rem;
    min-width: 200px;
    position: absolute !important;
    top: 0;
    right: 0;
    z-index: 50;
  }
</style>
