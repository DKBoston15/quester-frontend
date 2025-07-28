<script lang="ts">
  import {
    Handle,
    NodeResizer,
    NodeToolbar,
    Position,
    type NodeProps,
  } from "@xyflow/svelte";
  import { createEventDispatcher } from "svelte";

  type $$Props = NodeProps;

  let {
    data = {},
    selected = false,
    id = "",
    position = { x: 0, y: 0 },
    width = 100,
    height = 100,
    sourcePosition,
    targetPosition,
  } = $props();
  const dispatch = createEventDispatcher();

  // Local state
  let bgColor = $state((data.bgColor as string) || "#ffffff");
  let borderColor = $state((data.borderColor as string) || "#374151");
  let textColor = $state((data.textColor as string) || "#000000");
  let fontSize = $state((data.fontSize as number) || 16);
  let borderWidth = $state((data.borderWidth as number) || 2);
  let borderStyle = $state((data.borderStyle as string) || "solid");
  let fontWeight = $state((data.fontWeight as string) || "normal");
  let bgOpacity = $state((data.bgOpacity as number) || 1);
  let textOpacity = $state((data.textOpacity as number) || 1);
  let textAlign = $state((data.textAlign as string) || "center");
  let shadowColor = $state((data.shadowColor as string) || "#000000");
  let shadowBlur = $state((data.shadowBlur as number) || 0);
  let transparentBg = $state((data.transparentBg as boolean) || false);
  let transparentBorder = $state((data.transparentBorder as boolean) || false);
  let showHandles = $state((data.showHandles as boolean) ?? true);
  let activeTab = $state<"style" | "text" | "effects">("style");

  // Update data when local state changes
  $effect(() => {
    data.bgColor = bgColor;
    data.borderColor = borderColor;
    data.textColor = textColor;
    data.fontSize = fontSize;
    data.borderWidth = borderWidth;
    data.borderStyle = borderStyle;
    data.fontWeight = fontWeight;
    data.bgOpacity = bgOpacity;
    data.textOpacity = textOpacity;
    data.textAlign = textAlign;
    data.shadowColor = shadowColor;
    data.shadowBlur = shadowBlur;
    data.transparentBg = transparentBg;
    data.transparentBorder = transparentBorder;
    data.showHandles = showHandles;
  });

  // Derived values based on transparent options
  let effectiveBgColor = $derived(transparentBg ? "transparent" : bgColor);
  let effectiveBorderColor = $derived(
    transparentBorder ? "transparent" : borderColor
  );

  // Convert hex to rgba
  function hexToRgba(hex: string, opacity: number): string {
    // Remove the hash if it exists
    hex = hex.replace("#", "");

    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return rgba
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Get effective background color with opacity
  let effectiveBgColorWithOpacity = $derived(
    transparentBg ? "transparent" : hexToRgba(bgColor, bgOpacity)
  );

  // Set tab
  function setTab(tab: "style" | "text" | "effects") {
    activeTab = tab;
  }

  function handleDuplicate() {
    const event = new CustomEvent("duplicate", {
      detail: { id },
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  }

  function bringToFront() {
    const event = new CustomEvent("bringToFront", {
      detail: { id },
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  }

  function sendToBack() {
    const event = new CustomEvent("sendToBack", {
      detail: { id },
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  }
</script>

<NodeToolbar isVisible={selected} position={Position.Top}>
  <div
    data-node-toolbar
    class="inline-block p-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all"
  >
    <!-- Tabs -->
    <div class="flex gap-2 mb-3">
      <button
        class="px-2 py-1 text-xs font-medium rounded {activeTab === 'style'
          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        onclick={() => setTab("style")}
      >
        Style
      </button>
      <button
        class="px-2 py-1 text-xs font-medium rounded {activeTab === 'text'
          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        onclick={() => setTab("text")}
      >
        Text
      </button>
      <button
        class="px-2 py-1 text-xs font-medium rounded {activeTab === 'effects'
          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        onclick={() => setTab("effects")}
      >
        Effects
      </button>
      <button
        class="px-2 py-1 text-xs font-medium rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        onclick={handleDuplicate}
      >
        Duplicate
      </button>
      <button
        class="px-2 py-1 text-xs font-medium rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        onclick={bringToFront}
        title="Bring to Front"
      >
        ↑ Front
      </button>
      <button
        class="px-2 py-1 text-xs font-medium rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        onclick={sendToBack}
        title="Send to Back"
      >
        ↓ Back
      </button>
    </div>

    <!-- STYLE TAB -->
    {#if activeTab === "style"}
      <!-- Color controls -->
      <div class="grid grid-cols-[auto_auto_auto] gap-4">
        <!-- Background color section -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-gray-700 dark:text-gray-300"
            >Background</span
          >
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <input
                type="color"
                bind:value={bgColor}
                disabled={transparentBg}
                class="{transparentBg
                  ? 'opacity-30'
                  : ''} w-8 h-8 rounded cursor-pointer"
              />
              <label
                class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                <input
                  type="checkbox"
                  bind:checked={transparentBg}
                  class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                Transparent
              </label>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              bind:value={bgOpacity}
              disabled={transparentBg}
              class="{transparentBg
                ? 'opacity-30'
                : ''} w-32 h-6 accent-indigo-600"
            />
          </div>
        </div>

        <!-- Border color section -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-gray-700 dark:text-gray-300">Border</span>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <input
                type="color"
                bind:value={borderColor}
                disabled={transparentBorder}
                class="{transparentBorder
                  ? 'opacity-30'
                  : ''} w-8 h-8 rounded cursor-pointer"
              />
              <label
                class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                <input
                  type="checkbox"
                  bind:checked={transparentBorder}
                  class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                Transparent
              </label>
            </div>
            <div class="flex gap-2">
              <select
                bind:value={borderStyle}
                class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded w-20"
                disabled={transparentBorder}
                class:opacity-30={transparentBorder}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </select>
              <select
                bind:value={borderWidth}
                class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded w-16"
                disabled={transparentBorder}
                class:opacity-30={transparentBorder}
              >
                <option value={0}>0px</option>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Handles section -->
        <div class="flex flex-col gap-2">
          <label
            class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              bind:checked={showHandles}
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            Show Handles
          </label>
        </div>
      </div>
    {/if}

    <!-- TEXT TAB -->
    {#if activeTab === "text"}
      <div class="grid grid-cols-[auto_auto_auto] gap-4">
        <div class="flex flex-col gap-2">
          <span class="text-xs text-gray-700 dark:text-gray-300">Color</span>
          <div class="flex items-center gap-2">
            <input
              type="color"
              bind:value={textColor}
              class="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              bind:value={textOpacity}
              class="w-32 h-6 accent-indigo-600"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-xs text-gray-700 dark:text-gray-300">Text</span>
          <div class="flex gap-2">
            <select
              bind:value={fontSize}
              class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded w-20"
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
              <option value={20}>20px</option>
              <option value={24}>24px</option>
              <option value={28}>28px</option>
              <option value={32}>32px</option>
            </select>
            <select
              bind:value={fontWeight}
              class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded w-20"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-xs text-gray-700 dark:text-gray-300">Align</span>
          <select
            bind:value={textAlign}
            class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded w-24"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    {/if}

    <!-- EFFECTS TAB -->
    {#if activeTab === "effects"}
      <div class="flex items-center gap-4">
        <div class="flex flex-col gap-2">
          <span class="text-xs text-gray-700 dark:text-gray-300">Shadow</span>
          <div class="flex items-center gap-2">
            <input
              type="color"
              bind:value={shadowColor}
              class="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              bind:value={shadowBlur}
              class="w-32 h-6 accent-indigo-600"
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</NodeToolbar>
<NodeResizer minWidth={5} minHeight={5} isVisible={selected} keepAspectRatio />
<!-- Top Handles -->
<Handle
  id="top-target"
  type="target"
  position={Position.Top}
  class={!showHandles ? "hidden" : ""}
/>
<Handle
  id="top-source"
  type="source"
  position={Position.Top}
  class={!showHandles ? "hidden" : ""}
/>
<!-- Left Handles -->
<Handle
  id="left-target"
  type="target"
  position={Position.Left}
  class={!showHandles ? "hidden" : ""}
/>
<Handle
  id="left-source"
  type="source"
  position={Position.Left}
  class={!showHandles ? "hidden" : ""}
/>
<div
  class="h-full w-full aspect-square rounded-full flex items-center justify-center overflow-hidden"
  style=" 
    background-color: {effectiveBgColorWithOpacity}; 
    border: {transparentBorder
    ? '0'
    : `${borderWidth}px ${borderStyle} ${effectiveBorderColor}`}; 
    {shadowBlur > 0 ? `box-shadow: 0 0 ${shadowBlur}px ${shadowColor};` : ''}
  "
>
  <textarea
    bind:value={data.label}
    class="bg-transparent w-full h-full focus:outline-none resize-none overflow-hidden mt-36"
    style="
      font-size: {fontSize}px; 
      color: {textColor}; 
      font-weight: {fontWeight};
      text-align: {textAlign};
      opacity: {textOpacity};
    "
  ></textarea>
</div>
<!-- Right Handles -->
<Handle
  id="right-source"
  type="source"
  position={Position.Right}
  class={!showHandles ? "hidden" : ""}
/>
<Handle
  id="right-target"
  type="target"
  position={Position.Right}
  class={!showHandles ? "hidden" : ""}
/>
<!-- Bottom Handles -->
<Handle
  id="bottom-source"
  type="source"
  position={Position.Bottom}
  class={!showHandles ? "hidden" : ""}
/>
<Handle
  id="bottom-target"
  type="target"
  position={Position.Bottom}
  class={!showHandles ? "hidden" : ""}
/>
