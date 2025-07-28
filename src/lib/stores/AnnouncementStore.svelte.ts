import { apiRequest } from '../services/api-client'

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  priority: 'low' | 'medium' | 'high'
  createdByUserId: string
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
  metadata: any
  version: number
  createdAt: string
  updatedAt: string
  userInteractions: UserAnnouncementInteraction[]
  hasViewed?: boolean
  hasDismissed?: boolean
}

export interface UserAnnouncementInteraction {
  id: string
  userId: string
  announcementId: string
  action: 'viewed' | 'dismissed' | 'clicked'
  metadata: any
  createdAt: string
}

let announcements = $state<Announcement[]>([])
let unreadAnnouncements = $state<Announcement[]>([])
let userInteractions = $state<UserAnnouncementInteraction[]>([])
let isLoading = $state(false)
let error = $state<string | null>(null)
let isModalOpen = $state(false)
let currentAnnouncement = $state<Announcement | null>(null)

// Derived values
const hasUnreadAnnouncements = $derived(unreadAnnouncements.length > 0)
const unreadCount = $derived(unreadAnnouncements.length)

export const announcementStore = {
  // Getters
  get announcements() {
    return announcements
  },
  get unreadAnnouncements() {
    return unreadAnnouncements
  },
  get isLoading() {
    return isLoading
  },
  get error() {
    return error
  },
  get isModalOpen() {
    return isModalOpen
  },
  get currentAnnouncement() {
    return currentAnnouncement
  },
  get hasUnreadAnnouncements() {
    return hasUnreadAnnouncements
  },
  get unreadCount() {
    return unreadCount
  },
  get userInteractions() {
    return userInteractions
  },

  // Actions
  async fetchAnnouncements() {
    isLoading = true
    error = null
    
    try {
      const data = await apiRequest('/announcements')
      
      // Extract the actual array from the response
      if (data && data.data) {
        announcements = data.data
      } else if (Array.isArray(data)) {
        announcements = data
      } else {
        announcements = []
      }
    } catch (err) {
      error = 'Network error while fetching announcements'
      console.error('❌ Network error fetching announcements:', err)
    } finally {
      isLoading = false
    }
  },

  async fetchUnreadAnnouncements() {
    isLoading = true
    error = null
    
    try {
      const data = await apiRequest('/announcements/unread')
      unreadAnnouncements = data.data || []
    } catch (err) {
      error = 'Network error while fetching unread announcements'
      console.error('❌ Network error fetching unread announcements:', err)
    } finally {
      isLoading = false
    }
  },

  async trackInteraction(announcementId: string, action: 'viewed' | 'dismissed' | 'clicked', metadata?: any) {
    try {
      await apiRequest('/announcements/track-interaction', {
        method: 'POST',
        body: JSON.stringify({
          announcement_id: announcementId,
          action,
          metadata,
        }),
      })

      // Update local state based on the action
      if (action === 'viewed' || action === 'dismissed') {
        // Remove from unread announcements
        unreadAnnouncements = unreadAnnouncements.filter(
          (announcement) => announcement.id !== announcementId
        )
        
        // Update the announcement in the main list if it exists
        if (Array.isArray(announcements) && announcements.length > 0) {
          announcements = announcements.map((announcement) => {
            if (announcement.id === announcementId) {
              return {
                ...announcement,
                hasViewed: action === 'viewed' || announcement.hasViewed,
                hasDismissed: action === 'dismissed' || announcement.hasDismissed,
              }
            }
            return announcement
          })
        }
      }
    } catch (err) {
      error = 'Network error while tracking interaction'
      console.error('❌ Error tracking interaction:', err)
    }
  },

  async markAsViewed(announcementId: string) {
    return this.trackInteraction(announcementId, 'viewed')
  },

  async markAsDismissed(announcementId: string) {
    return this.trackInteraction(announcementId, 'dismissed')
  },

  async markAsClicked(announcementId: string, metadata?: any) {
    return this.trackInteraction(announcementId, 'clicked', metadata)
  },

  // Modal management
  openModal(announcement?: Announcement) {
    currentAnnouncement = announcement || null
    isModalOpen = true
    
    // If opening with a specific announcement, mark it as viewed immediately
    if (announcement) {
      this.markAsViewed(announcement.id)
    }
  },

  closeModal() {
    isModalOpen = false
    currentAnnouncement = null
  },

  // Check for new announcements and show modal if needed
  async checkAndShowAnnouncements() {
    await this.fetchUnreadAnnouncements()
    
    if (unreadAnnouncements.length > 0) {
      // Show the highest priority unread announcement
      const sortedAnnouncements = [...unreadAnnouncements].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      
      this.openModal(sortedAnnouncements[0])
    }
  },

  // Initialize the store
  async initialize() {
    await Promise.all([
      this.fetchAnnouncements(),
      this.fetchUnreadAnnouncements(),
    ])
  },

  // Load all announcements (for history view)
  async loadAllAnnouncements() {
    return this.fetchAnnouncements()
  },

  // Load unread announcements
  async loadUnreadAnnouncements() {
    return this.fetchUnreadAnnouncements()
  },

  // Show a specific announcement
  showAnnouncement(announcement: Announcement) {
    this.openModal(announcement)
  },

  // Reset store (useful for logout)
  reset() {
    announcements = []
    unreadAnnouncements = []
    userInteractions = []
    isLoading = false
    error = null
    isModalOpen = false
    currentAnnouncement = null
  },
}