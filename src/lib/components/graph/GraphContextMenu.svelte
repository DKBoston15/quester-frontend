<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { ExternalLink, Filter, RotateCcw } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { getTypeLabel } from "./data";

  interface GraphNode {
    id: string;
    icon: string;
    literatureId?: string;
    [key: string]: any;
  }

  interface MenuPosition {
    x: number;
    y: number;
  }

  const dispatch = createEventDispatcher<{
    close: void;
    navigate: { nodeId: string };
    filter: { nodeId: string };
    reset: void;
  }>();

  // Props
  let {
    open = false,
    node = null,
    position = { x: 0, y: 0 },
    onClose = () => {},
    isFiltered = false,
  } = $props<{
    open?: boolean;
    node?: GraphNode | null;
    position?: MenuPosition;
    onClose?: () => void;
    isFiltered?: boolean;
  }>();

  // Local state
  let menuElement: HTMLDivElement;
  let focusedIndex = $state(0);

  let shouldShowMenu = $derived(
    open && node
  );

  let canNavigate = $derived(
    node && node.icon === "literature" && node.literatureId
  );

  let menuStyle = $derived(() => {
    if (!shouldShowMenu) return { left: "0px", top: "0px" };

    // Basic positioning
    let style = {
      left: `${position.x}px`,
      top: `${position.y}px`,
    };

    // Check if menu would go off-screen and adjust
    if (typeof window !== "undefined" && menuElement) {
      const rect = menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        style.left = `${viewportWidth - rect.width - 10}px`;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        style.top = `${position.y - rect.height}px`;
      }
    }

    return style;
  });

  // Event handlers
  function handleNavigate() {
    if (node) {
      dispatch("navigate", { nodeId: node.id });
    }
    handleClose();
  }

  function handleFilter() {
    if (node) {
      dispatch("filter", { nodeId: node.id });
    }
    handleClose();
  }

  function handleReset() {
    dispatch("reset");
    handleClose();
  }

  function handleClose() {
    dispatch("close");
    onClose();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(keyboardEvent: KeyboardEvent) {
    if (!shouldShowMenu) return;

    switch (keyboardEvent.key) {
      case "Escape":
        keyboardEvent.preventDefault();
        handleClose();
        break;

    }
  }

  // Focus management
  onMount(() => {
    if (shouldShowMenu && menuElement) {
      menuElement.focus();
    }
  });

  // Global event listeners
  onMount(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (shouldShowMenu) {
        handleKeydown(event);
      }
    };

    const handleGlobalClick = (event: MouseEvent) => {
      if (shouldShowMenu && menuElement && !menuElement.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleGlobalKeydown);
    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeydown);
      document.removeEventListener("click", handleGlobalClick);
    };
  });
</script>

<!-- Context Menu -->
{#if shouldShowMenu}
  <div
    class="context-menu-backdrop"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
  >
    <div
      bind:this={menuElement}
      class="context-menu"
      style="left: {menuStyle().left}; top: {menuStyle().top};"
      transition:scale={{ duration: 200, easing: quintOut, start: 0.95 }}
      tabindex="-1"
      role="menu"
      aria-labelledby="graph-context-menu"
    >
      <!-- Menu header -->
      <div class="menu-header">
        <div class="node-info">
          <div class="node-title">{node?.id || 'Node'}</div>
          <div class="node-meta">
            <span class="node-type">{node?.icon ? getTypeLabel(node.icon) : 'Node'}</span>
          </div>
        </div>
      </div>

      <Separator />

      <!-- Menu options -->
      <div class="menu-options">
        {#if canNavigate}
          <button
            type="button"
            class="menu-option"
            onclick={handleNavigate}
            role="menuitem"
            aria-label={$_('connections.navigateToLiterature')}
          >
            <div class="option-icon">
              <ExternalLink class="w-4 h-4" />
            </div>
            <span class="option-label">{$_('connections.navigateToLiterature')}</span>
          </button>
        {/if}

        {#if !isFiltered}
          <button
            type="button"
            class="menu-option"
            onclick={handleFilter}
            role="menuitem"
            aria-label={$_('connections.filterConnectedNodes')}
          >
            <div class="option-icon">
              <Filter class="w-4 h-4" />
            </div>
            <span class="option-label">{$_('connections.filterConnectedNodes')}</span>
          </button>
        {:else}
          <button
            type="button"
            class="menu-option"
            onclick={handleReset}
            role="menuitem"
            aria-label={$_('connections.resetFilter')}
          >
            <div class="option-icon">
              <RotateCcw class="w-4 h-4" />
            </div>
            <span class="option-label">{$_('connections.resetFilter')}</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .context-menu-backdrop {
    @apply fixed inset-0 z-[60] bg-transparent;
  }

  .context-menu {
    @apply absolute z-[61] min-w-[200px] max-w-[300px]
           bg-popover border rounded-lg shadow-lg
           focus:outline-none;
  }

  .menu-header {
    @apply p-3 pb-2;
  }

  .node-info {
    @apply space-y-1;
  }

  .node-title {
    @apply text-sm font-medium text-foreground line-clamp-2;
  }

  .node-meta {
    @apply flex items-center gap-2 text-xs text-muted-foreground;
  }

  .node-type {
    @apply px-1.5 py-0.5 bg-muted rounded text-xs;
  }

  .menu-options {
    @apply py-1;
  }

  .menu-option {
    @apply w-full flex items-center gap-3 px-3 py-2 text-left
           text-sm text-foreground hover:bg-accent hover:text-accent-foreground
           focus:bg-accent focus:text-accent-foreground focus:outline-none
           transition-colors;
  }

  .option-icon {
    @apply flex-shrink-0 w-4 h-4 flex items-center justify-center;
  }

  .option-label {
    @apply flex-1 min-w-0;
  }

  /* Animation improvements */
  .context-menu {
    transform-origin: top left;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .context-menu {
      @apply min-w-[180px] max-w-[250px];
    }

    .menu-option {
      @apply py-3;
    }
  }
</style>
