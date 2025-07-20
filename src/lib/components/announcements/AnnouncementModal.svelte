<script lang="ts">
  import { announcementStore } from '$lib/stores/AnnouncementStore.svelte'
  import type { Announcement } from '$lib/stores/AnnouncementStore.svelte'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-svelte'

  // Component registry for different announcement types
  import AnnouncementOne from './AnnouncementOne.svelte'
  import AnnouncementTwo from './AnnouncementTwo.svelte'

  const announcementComponents = {
    'announcement-one': AnnouncementOne,
    'announcement-two': AnnouncementTwo,
  }

  // Reactive values from store
  const { isModalOpen, currentAnnouncement } = $derived.by(() => ({
    isModalOpen: announcementStore.isModalOpen,
    currentAnnouncement: announcementStore.currentAnnouncement,
  }))

  // Icon mapping for announcement types
  const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: AlertCircle,
  }

  // Color mapping for announcement type icons
  const typeColors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      // When modal is closed via the X button, mark as dismissed
      if (currentAnnouncement) {
        console.log('❌ Modal closed via X button, marking as dismissed:', currentAnnouncement.title)
        announcementStore.markAsDismissed(currentAnnouncement.id)
      }
      announcementStore.closeModal()
    }
  }

  function handleDismiss() {
    if (currentAnnouncement) {
      console.log('🚫 User explicitly dismissed announcement:', currentAnnouncement.title)
      announcementStore.markAsDismissed(currentAnnouncement.id)
    }
    announcementStore.closeModal()
  }

  function handleCustomAction(action: string, metadata?: any) {
    if (currentAnnouncement) {
      announcementStore.markAsClicked(currentAnnouncement.id, { action, ...metadata })
    }
  }

  // Determine which component to render based on announcement metadata
  function getAnnouncementComponent(announcement: Announcement) {
    const componentType = announcement.metadata?.componentType
    return announcementComponents[componentType] || null
  }
</script>

<Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
  <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
    {#if currentAnnouncement}
      <DialogHeader class="flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class={`p-2 rounded-full ${typeColors[currentAnnouncement.type]}`}>
            <svelte:component this={typeIcons[currentAnnouncement.type]} class="h-5 w-5" />
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
          <svelte:component 
            this={getAnnouncementComponent(currentAnnouncement)} 
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
              <div class="prose prose-sm max-w-none">
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
                onclick={() => handleCustomAction('primary', currentAnnouncement.metadata?.primaryAction)}
                class="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {currentAnnouncement.metadata.primaryAction.label || 'Continue'}
              </Button>
            {/if}
            <Button variant="outline" onclick={handleDismiss}>
              {currentAnnouncement.metadata?.dismissLabel || 'Dismiss'}
            </Button>
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
</style>