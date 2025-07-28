import { apiRequest } from './api-client'
import type { Announcement, UserAnnouncementInteraction } from '../stores/AnnouncementStore.svelte'

export interface CreateAnnouncementRequest {
  title: string
  content: string
  type?: 'info' | 'warning' | 'success' | 'error'
  priority?: 'low' | 'medium' | 'high'
  is_active?: boolean
  starts_at?: string | null
  expires_at?: string | null
  metadata?: any
}

export interface UpdateAnnouncementRequest {
  id: string
  title?: string
  content?: string
  type?: 'info' | 'warning' | 'success' | 'error'
  priority?: 'low' | 'medium' | 'high'
  is_active?: boolean
  starts_at?: string | null
  expires_at?: string | null
  metadata?: any
}

export interface TrackInteractionRequest {
  announcement_id: string
  action: 'viewed' | 'dismissed' | 'clicked'
  metadata?: any
}

export interface AnnouncementResponse {
  data: Announcement[]
  meta?: {
    total: number
    page: number
    perPage: number
    lastPage: number
  }
}

export interface SingleAnnouncementResponse {
  data: Announcement
}

export interface InteractionResponse {
  data: UserAnnouncementInteraction
}

export const announcementApi = {
  /**
   * Get all announcements with pagination
   */
  async getAnnouncements(page = 1, limit = 10): Promise<AnnouncementResponse> {
    const response = await api(`/announcements?page=${page}&limit=${limit}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch announcements')
    }
    
    return await response.json()
  },

  /**
   * Get unread announcements for the current user
   */
  async getUnreadAnnouncements(): Promise<{ data: Announcement[] }> {
    const response = await api('/announcements/unread')
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch unread announcements')
    }
    
    return await response.json()
  },

  /**
   * Get a specific announcement by ID
   */
  async getAnnouncement(id: string): Promise<SingleAnnouncementResponse> {
    const response = await api(`/announcements/${id}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Announcement not found')
      }
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch announcement')
    }
    
    return await response.json()
  },

  /**
   * Create a new announcement (admin only)
   */
  async createAnnouncement(data: CreateAnnouncementRequest): Promise<SingleAnnouncementResponse> {
    const response = await api('/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create announcement')
    }
    
    return await response.json()
  },

  /**
   * Update an existing announcement (admin only)
   */
  async updateAnnouncement(data: UpdateAnnouncementRequest): Promise<SingleAnnouncementResponse> {
    const response = await api(`/announcements/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Announcement not found')
      }
      const error = await response.json()
      throw new Error(error.error || 'Failed to update announcement')
    }
    
    return await response.json()
  },

  /**
   * Delete an announcement (admin only)
   */
  async deleteAnnouncement(id: string): Promise<{ message: string }> {
    const response = await api(`/announcements/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Announcement not found')
      }
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete announcement')
    }
    
    return await response.json()
  },

  /**
   * Track user interaction with an announcement
   */
  async trackInteraction(data: TrackInteractionRequest): Promise<InteractionResponse> {
    const response = await api('/announcements/track-interaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to track interaction')
    }
    
    return await response.json()
  },

  /**
   * Batch track multiple interactions
   */
  async trackMultipleInteractions(interactions: TrackInteractionRequest[]): Promise<InteractionResponse[]> {
    const promises = interactions.map(interaction => this.trackInteraction(interaction))
    return await Promise.all(promises)
  },

  /**
   * Mark announcement as viewed
   */
  async markAsViewed(announcementId: string, metadata?: any): Promise<InteractionResponse> {
    return this.trackInteraction({
      announcement_id: announcementId,
      action: 'viewed',
      metadata,
    })
  },

  /**
   * Mark announcement as dismissed
   */
  async markAsDismissed(announcementId: string, metadata?: any): Promise<InteractionResponse> {
    return this.trackInteraction({
      announcement_id: announcementId,
      action: 'dismissed',
      metadata,
    })
  },

  /**
   * Mark announcement as clicked
   */
  async markAsClicked(announcementId: string, metadata?: any): Promise<InteractionResponse> {
    return this.trackInteraction({
      announcement_id: announcementId,
      action: 'clicked',
      metadata,
    })
  },
}

// Helper functions for common operations
export const announcementHelpers = {
  /**
   * Check if announcement is currently active
   */
  isAnnouncementActive(announcement: Announcement): boolean {
    if (!announcement.isActive) return false
    
    const now = new Date()
    
    // Check start date
    if (announcement.startsAt && new Date(announcement.startsAt) > now) {
      return false
    }
    
    // Check expiry date
    if (announcement.expiresAt && new Date(announcement.expiresAt) <= now) {
      return false
    }
    
    return true
  },

  /**
   * Get user's interaction with announcement
   */
  getUserInteraction(
    announcement: Announcement,
    action: 'viewed' | 'dismissed' | 'clicked'
  ): UserAnnouncementInteraction | null {
    return announcement.userInteractions?.find(interaction => interaction.action === action) || null
  },

  /**
   * Check if user has performed specific action
   */
  hasUserAction(announcement: Announcement, action: 'viewed' | 'dismissed' | 'clicked'): boolean {
    return announcement.userInteractions?.some(interaction => interaction.action === action) || false
  },

  /**
   * Format announcement date for display
   */
  formatAnnouncementDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    const date = new Date(dateString)
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
  },

  /**
   * Get time remaining until expiry
   */
  getTimeUntilExpiry(expiresAt: string | null): string | null {
    if (!expiresAt) return null
    
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`
    return 'Less than a minute remaining'
  },
}

export default announcementApi