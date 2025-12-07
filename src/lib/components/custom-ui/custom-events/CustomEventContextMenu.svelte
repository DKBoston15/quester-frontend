<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { toast } from "svelte-sonner";
  import { _ } from "svelte-i18n";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import {
    Edit,
    Trash2,
    Copy,
    ExternalLink,
    Calendar,
    Tag,
    MoreHorizontal,
    Eye,
    EyeOff,
    Archive,
    ArchiveRestore,
  } from "lucide-svelte";

  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";

  import type {
    CustomTimelineEvent,
    CustomEventMenuOption,
    CustomEventPermissions,
  } from "$lib/types/custom-events";
  import { getEventTypeConfig } from "$lib/config/custom-event-types";
  import { customEventsStore } from "$lib/stores/CustomEventsStore";

  const dispatch = createEventDispatcher<{
    close: void;
    action: { action: string; event: CustomTimelineEvent };
  }>();

  // Props
  let {
    open = false,
    event = null,
    position = { x: 0, y: 0 },
    permissions = {},
    onClose = () => {},
  } = $props<{
    open?: boolean;
    event?: CustomTimelineEvent | null;
    position?: { x: number; y: number };
    permissions?: CustomEventPermissions;
    onClose?: () => void;
  }>();

  // Local state
  let menuElement: HTMLDivElement | null = $state(null);
  let focusedIndex = $state(0);
  let menuOptions = $state<CustomEventMenuOption[]>([]);
  let showDeleteDialog = $state(false);
  let eventToDelete = $state<CustomTimelineEvent | null>(null);

  // Derived values
  let eventTypeConfig = $derived(
    event ? getEventTypeConfig(event.eventType) : null
  );

  let interactiveOptions = $derived(
    Array.isArray(menuOptions)
      ? menuOptions.filter((opt) => !opt.separator)
      : []
  );

  let menuStyle = $derived(() => {
    if (!open) return { left: "0px", top: "0px" };

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

  // Generate menu options based on permissions and event state
  $effect(() => {
    if (!event) {
      menuOptions = [];
      return;
    }

    const options: CustomEventMenuOption[] = [];

    // Edit event
    if (permissions.edit !== false) {
      options.push({
        id: "edit",
        label: $_('customEventContextMenu.editEvent'),
        icon: "Edit",
        action: (evt: CustomTimelineEvent) => {
          handleEditEvent(evt);
        },
        disabled: false,
      });
    }

    // Copy event details
    options.push({
      id: "copy",
      label: $_('customEventContextMenu.copyDetails'),
      icon: "Copy",
      action: (evt: CustomTimelineEvent) => {
        handleCopyDetails(evt);
        handleClose();
      },
      disabled: false,
    });

    // Delete permanently
    if (permissions.delete !== false) {
      // Add separator if there are other options
      if (options.length > 0) {
        options.push({
          id: "separator-1",
          label: "",
          icon: "",
          action: () => {},
          separator: true,
        });
      }

      options.push({
        id: "delete",
        label: $_('customEventContextMenu.deletePermanently'),
        icon: "Trash2",
        action: (evt: CustomTimelineEvent) => {
          handleDeleteEvent(evt);
          handleClose();
        },
        disabled: false,
        destructive: true,
      });
    }

    menuOptions = options;
  });

  // Icon mapping
  const iconMap = {
    Edit,
    Trash2,
    Copy,
    ExternalLink,
    Calendar,
    Tag,
    MoreHorizontal,
    Eye,
    EyeOff,
    Archive,
    ArchiveRestore,
  } as const;

  // Event handlers
  function handleAction(actionType: string, targetEvent: CustomTimelineEvent) {
    dispatch("action", { action: actionType, event: targetEvent });
    handleClose();
  }

  function handleClose() {
    dispatch("close");
  }

  function handleKeydown(keyboardEvent: KeyboardEvent) {
    if (!open) return;

    switch (keyboardEvent.key) {
      case "Escape":
        keyboardEvent.preventDefault();
        handleClose();
        break;

      case "ArrowDown":
        keyboardEvent.preventDefault();
        focusedIndex = Math.min(
          focusedIndex + 1,
          interactiveOptions.length - 1
        );
        break;

      case "ArrowUp":
        keyboardEvent.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, 0);
        break;

      case "Enter":
      case " ":
        keyboardEvent.preventDefault();
        const focusedOption = interactiveOptions[focusedIndex];
        if (focusedOption && !focusedOption.disabled && event) {
          focusedOption.action(event);
        }
        break;
    }
  }

  function handleMouseEnter(index: number) {
    const currentOption = menuOptions[index];
    if (currentOption && !currentOption.separator) {
      const realIndex = interactiveOptions.findIndex(
        (opt) => opt.id === currentOption.id
      );
      if (realIndex !== -1) {
        focusedIndex = realIndex;
      }
    }
  }

  // Copy to clipboard utility
  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand("copy");
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  }

  // Handle specific actions
  function handleEditEvent(event: CustomTimelineEvent) {
    // Close the context menu first
    handleClose();

    // Then open the form with a delay to prevent interference
    setTimeout(() => {
      customEventsStore.openEditForm(event.id);
    }, 100);
  }

  async function handleCopyDetails(event: CustomTimelineEvent) {
    const details = [
      $_('customEventContextMenu.titleLabel', { values: { title: event.title } }),
      event.description ? $_('customEventContextMenu.descriptionLabel', { values: { description: event.description } }) : "",
      $_('customEventContextMenu.typeLabel', { values: { type: eventTypeConfig?.label || event.eventType } }),
      $_('customEventContextMenu.dateLabel', { values: { date: new Date(event.eventTimestamp).toLocaleString() } }),
      event.tags?.length ? $_('customEventContextMenu.tagsLabel', { values: { tags: event.tags.join(", ") } }) : "",
      event.details?.length
        ? `${$_('customEventContextMenu.detailsLabel')}:\n${event.details.map((d) => `• ${d}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const success = await copyToClipboard(details);
    if (success) {
      toast.success($_('toasts.eventDetailsCopied'));
    } else {
      toast.error($_('toasts.failedToCopyDetails'));
    }
  }

  async function handleDeleteEvent(event: CustomTimelineEvent) {
    eventToDelete = event;
    showDeleteDialog = true;
  }

  async function confirmDeleteEvent() {
    if (!eventToDelete) return;

    try {
      await customEventsStore.deleteEvent(eventToDelete.id);
      toast.success($_('toasts.eventDeletedPermanently'));
      dispatch("action", { action: "delete", event: eventToDelete });
      showDeleteDialog = false;
      eventToDelete = null;
      handleClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error($_('toasts.failedToDeleteEvent'));
      showDeleteDialog = false;
      eventToDelete = null;
    }
  }

  // Focus management
  onMount(() => {
    if (open && menuElement) {
      menuElement.focus();
    }
  });

  // Global event listeners
  onMount(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (open) {
        handleKeydown(event);
      }
    };

    const handleGlobalClick = (event: MouseEvent) => {
      if (open && menuElement && !menuElement.contains(event.target as Node)) {
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
{#if open && event}
  <div class="context-menu-backdrop" transition:fade={{ duration: 150 }}>
    <div
      bind:this={menuElement}
      class="context-menu"
      style="left: {menuStyle().left}; top: {menuStyle().top};"
      transition:scale={{ duration: 200, easing: quintOut, start: 0.95 }}
      tabindex="-1"
      role="menu"
      aria-labelledby="context-menu-title"
    >
      <!-- Menu header -->
      <div class="menu-header">
        <div class="event-info">
          <div class="event-title">{event.title}</div>
          <div class="event-meta">
            {#if eventTypeConfig}
              <span class="event-type">{eventTypeConfig.label}</span>
              <span class="event-date">
                {new Date(event.eventTimestamp).toLocaleDateString()}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <Separator />

      <!-- Menu options -->
      <div class="menu-options">
        {#each menuOptions as option, index}
          {#if option.separator}
            <Separator />
          {:else}
            {@const IconComponent =
              iconMap[option.icon as keyof typeof iconMap]}
            {@const isFocused =
              interactiveOptions.findIndex((opt) => opt.id === option.id) ===
              focusedIndex}
            <button
              type="button"
              class="menu-option {option.destructive
                ? 'destructive'
                : ''} {isFocused ? 'focused' : ''}"
              disabled={option.disabled}
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                option.action(event);
              }}
              onmouseenter={() => handleMouseEnter(index)}
              role="menuitem"
              aria-label={option.label}
            >
              <div class="option-icon">
                {#if IconComponent}
                  <IconComponent class="w-4 h-4" />
                {/if}
              </div>
              <span class="option-label">{option.label}</span>
            </button>
          {/if}
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$_('customEvents.deleteTitle')}</AlertDialog.Title>
      <AlertDialog.Description>
        {$_('customEventContextMenu.deleteConfirmation', { values: { title: eventToDelete?.title } })}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <div class="flex justify-end gap-2">
        <Button
          variant="outline"
          onclick={() => {
            showDeleteDialog = false;
            eventToDelete = null;
          }}
          class="border-2 dark:border-dark-border"
        >
          {$_('common.cancel')}
        </Button>
        <Button
          variant="destructive"
          onclick={confirmDeleteEvent}
          class="border-2 border-destructive dark:border-destructive"
        >
          {$_('customEventContextMenu.deleteEvent')}
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style lang="postcss">
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

  .event-info {
    @apply space-y-1;
  }

  .event-title {
    @apply text-sm font-medium text-foreground line-clamp-2;
  }

  .event-meta {
    @apply flex items-center gap-2 text-xs text-muted-foreground;
  }

  .event-type {
    @apply px-1.5 py-0.5 bg-muted rounded text-xs;
  }

  .event-date {
    @apply text-xs;
  }

  .menu-options {
    @apply py-1;
  }

  .menu-option {
    @apply w-full flex items-center gap-3 px-3 py-2 text-left
           text-sm text-foreground hover:bg-accent hover:text-accent-foreground
           focus:bg-accent focus:text-accent-foreground focus:outline-none
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors;
  }

  .menu-option.focused {
    @apply bg-accent text-accent-foreground;
  }

  .menu-option.destructive {
    @apply text-red-600 hover:bg-red-50 hover:text-red-700
           focus:bg-red-50 focus:text-red-700;
  }

  .menu-option.destructive.focused {
    @apply bg-red-50 text-red-700;
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
