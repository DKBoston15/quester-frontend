<script lang="ts">
  import { announcementStore } from '$lib/stores/AnnouncementStore'
  import { Button } from '$lib/components/ui/button'
  import { Card } from '$lib/components/ui/card'
  import { Sparkles, ChevronRight, History } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import AnnouncementHistory from './AnnouncementHistory.svelte'
  
  let showBar = $state(true)
  let isInitialized = $state(false)
  let dismissedAnnouncementIds = $state<string[]>([])
  let showHistoryModal = $state(false)

  // Load dismissed announcements from localStorage
  function loadDismissedAnnouncements() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dismissedAnnouncements')
      dismissedAnnouncementIds = stored ? JSON.parse(stored) : []
    }
  }

  // Save dismissed announcements to localStorage
  function saveDismissedAnnouncements() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedAnnouncementIds))
    }
  }
  
  // Get latest announcement directly from store values
  let latestAnnouncement = $state<any>(null)
  
  // Update latest announcement when store changes
  $effect(() => {
    const announcements = announcementStore.announcements
    
    // Ensure we're working with arrays
    const allAnnouncementsArray = Array.isArray(announcements) ? announcements : []
    
    // Always show the most recent announcement, regardless of viewed/dismissed status
    // The bar should never hide as long as there are active announcements
    let sourceList = allAnnouncementsArray
    
    // Sort by priority and date to show the most important one
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    sourceList.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    // Always show the top announcement (never hide the bar)
    latestAnnouncement = sourceList.length > 0 ? sourceList[0] : null
  })

  // Check if the current latest announcement is unread
  const hasUnreadAnnouncements = $derived(() => {
    if (!latestAnnouncement) return false
    
    // Check if this specific announcement has been viewed OR dismissed
    const interactions = latestAnnouncement.userInteractions || []
    const hasViewedInteraction = interactions.some((interaction: any) => interaction.action === 'viewed')
    const hasDismissedInteraction = interactions.some((interaction: any) => interaction.action === 'dismissed')
    
    // Show blue dot only if NOT viewed AND NOT dismissed
    return !hasViewedInteraction && !hasDismissedInteraction
  })

  onMount(() => {
    void (async () => {
      // Load dismissed announcements first
      loadDismissedAnnouncements()
      
      // Load both unread and all announcements
      await Promise.all([
        announcementStore.loadUnreadAnnouncements(),
        announcementStore.loadAllAnnouncements()
      ])
      isInitialized = true
    })()
  })

  function openLatestAnnouncement() {
    if (latestAnnouncement) {
      announcementStore.showAnnouncement(latestAnnouncement)
    }
  }

  async function openAnnouncementHistory() {
    // Load all announcements first
    await announcementStore.loadAllAnnouncements()
    // Show the history modal
    showHistoryModal = true
  }

  function dismissBar() {
    if (latestAnnouncement) {
      dismissedAnnouncementIds = [...dismissedAnnouncementIds, latestAnnouncement.id]
      saveDismissedAnnouncements()
    }
    showBar = false
  }
</script>

{#if showBar && isInitialized && latestAnnouncement}
  <Card class="mb-6 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 dark:border-l-blue-400">
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center gap-3 flex-1">
        <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <Sparkles class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
              {latestAnnouncement?.title || 'Platform Update Available'}
            </h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
            {latestAnnouncement?.content || 'Click to view the latest platform updates and improvements.'}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onclick={openLatestAnnouncement}
          class="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          <span class="hidden sm:inline">View Update</span>
          <span class="sm:hidden">View</span>
          <ChevronRight class="w-4 h-4 ml-1" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onclick={openAnnouncementHistory}
          class="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <History class="w-4 h-4" />
          <span class="hidden md:inline ml-1">History</span>
        </Button>
      </div>
    </div>
  </Card>
{/if}

<!-- Announcement History Modal -->
<AnnouncementHistory bind:open={showHistoryModal} onOpenChange={(open) => showHistoryModal = open} />

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
