export type FeedbackType = 'processing_issue' | 'metadata_incorrect' | 'extraction_error' | 'other'
export type FeedbackStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

export interface FeedbackMetadata {
  documentFilename?: string
  literatureTitle?: string
  originalValues?: Record<string, any>
  suggestedValues?: Record<string, any>
  userAgent?: string
  [key: string]: any
}

export interface Feedback {
  id: number
  userId: string
  projectId: string
  subjectType: string
  subjectId: string
  feedbackType: FeedbackType
  status: FeedbackStatus
  title: string
  description?: string
  metadata?: FeedbackMetadata
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateFeedbackForm {
  projectId: string
  subjectType: string
  subjectId: string
  feedbackType: FeedbackType
  title: string
  description?: string
  metadata?: FeedbackMetadata
}

export interface UpdateFeedbackForm {
  status: FeedbackStatus
}

export interface FeedbackFilters {
  status?: FeedbackStatus
  feedbackType?: FeedbackType
  subjectType?: string
  userId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FeedbackListResponse {
  success: boolean
  data: Feedback[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl?: string
    previousPageUrl?: string
  }
}

export interface FeedbackResponse {
  success: boolean
  data: Feedback
  message?: string
}

export interface FeedbackStats {
  total: number
  pending: number
  reviewing: number
  resolved: number
  dismissed: number
  byType: Record<FeedbackType, number>
}

export interface FeedbackStatsResponse {
  success: boolean
  data: FeedbackStats
}

// Validation error types
export interface FeedbackValidationErrors {
  [field: string]: string[]
}

// API Error class for better error handling
export class FeedbackAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public errors?: FeedbackValidationErrors
  ) {
    super(message)
    this.name = 'FeedbackAPIError'
  }
}

// Helper functions
export function isFeedbackAPIError(error: any): error is FeedbackAPIError {
  return error instanceof FeedbackAPIError
}

export function getErrorMessage(error: any): string {
  if (isFeedbackAPIError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// Status display helpers
export function getFeedbackStatusColor(status: FeedbackStatus): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'reviewing':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'resolved':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'dismissed':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

export function getFeedbackStatusLabel(status: FeedbackStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'reviewing':
      return 'Under Review'
    case 'resolved':
      return 'Resolved'
    case 'dismissed':
      return 'Dismissed'
    default:
      return 'Unknown'
  }
}

export function getFeedbackTypeLabel(type: FeedbackType): string {
  switch (type) {
    case 'processing_issue':
      return 'Processing Issue'
    case 'metadata_incorrect':
      return 'Metadata Incorrect'
    case 'extraction_error':
      return 'Extraction Error'
    case 'other':
      return 'Other'
    default:
      return 'Unknown'
  }
}