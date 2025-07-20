<script lang="ts">
  import { announcementStore } from '$lib/stores/AnnouncementStore.svelte'
  import type { Announcement } from '$lib/stores/AnnouncementStore.svelte'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Card } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  // import { ScrollArea } from '$lib/components/ui/scroll-area' // Not available
  import { Info, AlertTriangle, CheckCircle, AlertCircle, Calendar, Eye, EyeOff } from 'lucide-svelte'
  import { formatDistanceToNow } from 'date-fns'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
  }

  let { open = $bindable(), onOpenChange }: Props = $props()

  // Get all announcements from store
  const announcements = $derived(announcementStore.announcements || [])

  // Icon mapping for announcement types
  const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: AlertCircle,
  }

  // Color mapping for announcement types
  const typeColors = {
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  // Priority badge colors
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  function hasUserViewed(announcement: any): boolean {
    return announcement.userInteractions?.some(
      (interaction: any) => interaction.action === 'viewed'
    ) || false
  }

  function hasUserDismissed(announcement: any): boolean {
    return announcement.userInteractions?.some(
      (interaction: any) => interaction.action === 'dismissed'
    ) || false
  }

  function openAnnouncement(announcement: Announcement) {
    announcementStore.showAnnouncement(announcement)
    open = false // Close history modal when opening an announcement
  }

  function handleOpenChange(newOpen: boolean) {
    open = newOpen
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  // Sort announcements by priority and date
  const sortedAnnouncements = $derived(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const sorted = [...announcements].sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by created date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    return sorted
  })
</script>

<Dialog {open} onOpenChange={handleOpenChange}>
  <DialogContent class="max-w-3xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle>Announcement History</DialogTitle>
      <DialogDescription>
        Browse through all platform announcements and updates
      </DialogDescription>
    </DialogHeader>

    <div class="h-[500px] overflow-y-auto pr-4">
      <div class="space-y-4">
        {#if sortedAnnouncements().length === 0}
          <div class="text-center py-8 text-muted-foreground">
            No announcements available
          </div>
        {:else}
          {#each sortedAnnouncements() as announcement}
            <Card 
              class="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onclick={() => openAnnouncement(announcement)}
            >
              <div class="flex items-start gap-3">
                <!-- Type Icon -->
                <div class={`p-2 rounded-lg ${typeColors[announcement.type]}`}>
                  <svelte:component this={typeIcons[announcement.type]} class="w-4 h-4" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex-1">
                      <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {announcement.title}
                        {#if hasUserViewed(announcement)}
                          <Eye class="w-4 h-4 text-gray-400" />
                        {:else}
                          <div class="w-2 h-2 bg-blue-500 rounded-full" title="Unread"></div>
                        {/if}
                      </h3>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar class="w-3 h-3" />
                          {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                        </span>
                        {#if announcement.expiresAt}
                          <span class="text-xs text-muted-foreground">
                            • Expires {formatDistanceToNow(new Date(announcement.expiresAt), { addSuffix: true })}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>
                  
                  <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {announcement.content}
                  </p>

                  {#if hasUserDismissed(announcement)}
                    <div class="mt-2">
                      <Badge variant="outline" class="text-xs">
                        <EyeOff class="w-3 h-3 mr-1" />
                        Dismissed
                      </Badge>
                    </div>
                  {/if}
                </div>

                <!-- Action -->
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </Card>
          {/each}
        {/if}
      </div>
    </div>

    <div class="flex justify-between items-center pt-4 border-t">
      <p class="text-sm text-muted-foreground">
        Showing {sortedAnnouncements().length} announcement{sortedAnnouncements().length !== 1 ? 's' : ''}
      </p>
      <Button variant="outline" onclick={() => handleOpenChange(false)}>
        Close
      </Button>
    </div>
  </DialogContent>
</Dialog>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>