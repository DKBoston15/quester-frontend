<script lang="ts">
  import {
    Handle,
    NodeResizer,
    NodeToolbar,
    Position,
    type NodeProps,
  } from "@xyflow/svelte";
  import { onMount, afterUpdate } from "svelte";

  type $$Props = NodeProps;

  export let data: $$Props["data"] = {};
  export let selected: $$Props["selected"] = false;

  // Local state
  let bgColor: string;
  let borderColor: string;
  let textColor: string;
  let fontSize: number;
  let borderWidth: number;
  let borderStyle: string;
  let fontWeight: string;
  let bgOpacity: number;
  let textOpacity: number;
  let shape: string;
  let textAlign: string;
  let shadowColor: string;
  let shadowBlur: number;
  let activeTab: "style" | "text" | "effects" = "style";
  let transparentBg: boolean;
  let transparentBorder: boolean;
  let showHandles: boolean;

  // Initialize values from data
  $: {
    bgColor = (data.bgColor as string) || "#ffffff";
    borderColor = (data.borderColor as string) || "#374151";
    textColor = (data.textColor as string) || "#000000";
    fontSize = (data.fontSize as number) || 16;
    borderWidth = (data.borderWidth as number) || 2;
    borderStyle = (data.borderStyle as string) || "solid";
    fontWeight = (data.fontWeight as string) || "normal";
    bgOpacity = (data.bgOpacity as number) || 1;
    textOpacity = (data.textOpacity as number) || 1;
    shape = (data.shape as string) || "square";
    textAlign = (data.textAlign as string) || "center";
    shadowColor = (data.shadowColor as string) || "#000000";
    shadowBlur = (data.shadowBlur as number) || 0;
    transparentBg = (data.transparentBg as boolean) || false;
    transparentBorder = (data.transparentBorder as boolean) || false;
    showHandles = (data.showHandles as boolean) ?? true;
  }

  // Update data when local state changes
  $: data.bgColor = bgColor;
  $: data.borderColor = borderColor;
  $: data.textColor = textColor;
  $: data.fontSize = fontSize;
  $: data.borderWidth = borderWidth;
  $: data.borderStyle = borderStyle;
  $: data.fontWeight = fontWeight;
  $: data.bgOpacity = bgOpacity;
  $: data.textOpacity = textOpacity;
  $: data.shape = shape;
  $: data.textAlign = textAlign;
  $: data.shadowColor = shadowColor;
  $: data.shadowBlur = shadowBlur;
  $: data.transparentBg = transparentBg;
  $: data.transparentBorder = transparentBorder;
  $: data.showHandles = showHandles;

  // Derived values based on transparent options
  $: effectiveBgColor = transparentBg ? "transparent" : bgColor;
  $: effectiveBorderColor = transparentBorder ? "transparent" : borderColor;

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
  $: effectiveBgColorWithOpacity = transparentBg
    ? "transparent"
    : hexToRgba(bgColor, bgOpacity);

  // Determine border radius based on shape
  $: borderRadius = shape === "square" ? "0px" : "12px";

  // Set tab
  function setTab(tab: "style" | "text" | "effects") {
    activeTab = tab;
  }
</script>

<NodeToolbar isVisible={selected} position={Position.Top}>
  <div
    class="inline-block p-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all"
  >
    <!-- Main panel tabs -->
    <div
      class="flex gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2"
    >
      <button
        class="px-3 py-1 text-xs font-medium rounded-md {activeTab === 'style'
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => setTab("style")}>Style</button
      >
      <button
        class="px-3 py-1 text-xs font-medium rounded-md {activeTab === 'text'
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => setTab("text")}>Text</button
      >
      <button
        class="px-3 py-1 text-xs font-medium rounded-md {activeTab === 'effects'
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        on:click={() => setTab("effects")}>Effects</button
      >
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

        <!-- Shape and Handles section -->
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-gray-700 dark:text-gray-300">Shape</span>
            <select
              bind:value={shape}
              class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded w-24"
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
            </select>
          </div>
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
      <div class="flex flex-wrap gap-3">
        <div class="flex flex-col items-center">
          <span class="text-xs text-gray-700 dark:text-gray-300 mb-1"
            >Color</span
          >
          <input
            type="color"
            bind:value={textColor}
            class="w-8 h-8 rounded cursor-pointer"
          />
        </div>
        <div class="flex flex-col">
          <span class="text-xs text-gray-700 dark:text-gray-300 mb-1"
            >Opacity</span
          >
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            bind:value={textOpacity}
            class="w-24 h-6 accent-indigo-600"
          />
        </div>
        <div class="flex flex-col">
          <span class="text-xs text-gray-700 dark:text-gray-300 mb-1">Size</span
          >
          <select
            bind:value={fontSize}
            class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded"
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
        </div>
        <div class="flex flex-col">
          <span class="text-xs text-gray-700 dark:text-gray-300 mb-1"
            >Weight</span
          >
          <select
            bind:value={fontWeight}
            class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div class="flex flex-col">
          <span class="text-xs text-gray-700 dark:text-gray-300 mb-1"
            >Align</span
          >
          <select
            bind:value={textAlign}
            class="text-xs p-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded"
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
      <div class="flex flex-wrap gap-3">
        <div class="flex flex-col">
          <span class="text-xs text-gray-700 dark:text-gray-300 mb-1"
            >Shadow</span
          >
          <div class="flex gap-1 items-center">
            <input
              type="color"
              bind:value={shadowColor}
              class="w-6 h-6 rounded cursor-pointer"
            />
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              bind:value={shadowBlur}
              class="w-20 h-6 accent-indigo-600"
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</NodeToolbar>
<NodeResizer minWidth={5} minHeight={5} isVisible={selected} />

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

<div
  class="h-full w-full flex items-center justify-center"
  style="
    border-radius: {borderRadius}; 
    background-color: {effectiveBgColorWithOpacity}; 
    border: {transparentBorder
    ? '0'
    : `${borderWidth}px ${borderStyle} ${effectiveBorderColor}`}; 
    {shadowBlur > 0 ? `box-shadow: 0 0 ${shadowBlur}px ${shadowColor};` : ''}
  "
>
  <input
    type="text"
    bind:value={data.label}
    class="bg-transparent w-full focus:outline-none"
    style="
      font-size: {fontSize}px; 
      color: {textColor}; 
      font-weight: {fontWeight};
      text-align: {textAlign};
      opacity: {textOpacity};
    "
  />
</div>
