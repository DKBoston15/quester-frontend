<script lang="ts">
  import { announcementStore } from "$lib/stores/AnnouncementStore";
  import type { Announcement } from "$lib/stores/AnnouncementStore";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-svelte";
  import { _ } from "svelte-i18n";

  // Component registry for different announcement types
  import AnnouncementOne from "./AnnouncementOne.svelte";
  import AnnouncementTwo from "./AnnouncementTwo.svelte";
  import AnnouncementLaunch from "./AnnouncementLaunch.svelte";

  const announcementComponents: Record<string, any> = {
    "announcement-one": AnnouncementOne,
    "announcement-two": AnnouncementTwo,
    "announcement-launch": AnnouncementLaunch,
  };

  // Reactive values from store
  const { isModalOpen, currentAnnouncement } = $derived.by(() => ({
    isModalOpen: announcementStore.isModalOpen,
    currentAnnouncement: announcementStore.currentAnnouncement,
  }));

  // Icon mapping for announcement types
  const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: AlertCircle,
  };

  // Color mapping for announcement type icons
  const typeColors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };

  function handleOpenChange(open: boolean) {
    if (!open) {
      // When modal is closed via the X button, mark as dismissed
      if (currentAnnouncement) {
        announcementStore.markAsDismissed(currentAnnouncement.id);
      }
      announcementStore.closeModal();
    }
  }

  function handleDismiss() {
    if (currentAnnouncement) {
      announcementStore.markAsDismissed(currentAnnouncement.id);
    }
    announcementStore.closeModal();
  }

  function handleCustomAction(action: string, metadata?: any) {
    if (currentAnnouncement) {
      announcementStore.markAsClicked(currentAnnouncement.id, {
        action,
        ...metadata,
      });
    }
    // Close modal after tracking the action
    announcementStore.closeModal();
  }

  // Determine which component to render based on announcement metadata
  function getAnnouncementComponent(announcement: Announcement) {
    const componentType = announcement.metadata?.componentType;
    return componentType ? announcementComponents[componentType] || null : null;
  }

  // Get modal size based on announcement type
  function getModalSize(announcement: Announcement) {
    const componentType = announcement.metadata?.componentType;
    if (componentType === "announcement-launch") {
      return "max-w-4xl";
    }
    return "max-w-2xl";
  }
</script>

<Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
  <DialogContent
    class="{currentAnnouncement
      ? getModalSize(currentAnnouncement)
      : 'max-w-2xl'} max-h-[85vh] overflow-hidden flex flex-col"
  >
    {#if currentAnnouncement}
      <DialogHeader class="flex-shrink-0">
        <div class="flex items-center gap-3">
          <div
            class={`p-2 rounded-full ${typeColors[currentAnnouncement.type]}`}
          >
            {#if typeIcons[currentAnnouncement.type]}
              {@const IconComponent = typeIcons[currentAnnouncement.type]}
              <IconComponent class="h-5 w-5" />
            {/if}
          </div>
          <div class="flex-1">
            <DialogTitle class="text-xl font-semibold text-left">
              {currentAnnouncement.title}
            </DialogTitle>
          </div>
        </div>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto py-4">
        {#if getAnnouncementComponent(currentAnnouncement)}
          <!-- Render custom announcement component -->
          {@const AnnouncementComponent = getAnnouncementComponent(currentAnnouncement)}
          <AnnouncementComponent
            announcement={currentAnnouncement}
            onAction={handleCustomAction}
          />
        {:else}
          <!-- Default announcement display -->
          <div class="space-y-4">
            <DialogDescription class="text-base leading-relaxed">
              {currentAnnouncement.content}
            </DialogDescription>

            {#if currentAnnouncement.metadata?.additionalContent}
              <div
                class="prose prose-sm max-w-none prose-gray dark:prose-invert"
              >
                {@html currentAnnouncement.metadata.additionalContent}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <DialogFooter class="flex-shrink-0 pt-4 border-t">
        <div class="flex justify-end items-center w-full">
          <div class="flex gap-2">
            {#if currentAnnouncement.metadata?.primaryAction}
              <Button
                onclick={() =>
                  handleCustomAction(
                    "primary",
                    currentAnnouncement.metadata?.primaryAction
                  )}
                class="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {currentAnnouncement.metadata.primaryAction.label || $_('common.continue')}
              </Button>
            {/if}
            {#if currentAnnouncement.metadata?.dismissLabel}
              <Button variant="outline" onclick={handleDismiss}>
                {currentAnnouncement.metadata.dismissLabel}
              </Button>
            {/if}
          </div>
        </div>
      </DialogFooter>
    {/if}
  </DialogContent>
</Dialog>

<style>
  /* Custom scrollbar styling for the content area */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgb(203 213 225) transparent;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgb(203 213 225);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgb(148 163 184);
  }

  /* Enhanced contrast for announcement content */
  .prose :global(p) {
    color: rgb(31 41 55);
  }
  
  :global(.dark) .prose :global(p) {
    color: rgb(229 231 235);
  }

  .prose :global(ul li) {
    color: rgb(55 65 81);
  }
  
  :global(.dark) .prose :global(ul li) {
    color: rgb(209 213 219);
  }

  .prose :global(ol li) {
    color: rgb(55 65 81);
  }
  
  :global(.dark) .prose :global(ol li) {
    color: rgb(209 213 219);
  }

  .prose :global(strong) {
    color: rgb(17 24 39);
    font-weight: 600;
  }
  
  :global(.dark) .prose :global(strong) {
    color: rgb(243 244 246);
    font-weight: 600;
  }
</style>
