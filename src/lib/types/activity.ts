// Activity tracking types shared across stores and services

export interface ActivitySession {
  id: string
  userId: string
  route: string
  startedAt: string
  stoppedAt?: string
  durationMs: number
  clickCount: number
  autostopReason?: string
  lastInteractionAt?: string
  lastHeartbeatAt?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface StartActivitySessionRequest {
  route: string
  startedAt?: string
  metadata?: Record<string, unknown>
}

export interface HeartbeatActivitySessionRequest {
  durationMs?: number
  clickCount?: number
  lastInteractionAt?: string
  metadata?: Record<string, unknown>
}

export interface StopActivitySessionRequest {
  durationMs?: number
  clickCount?: number
  autostopReason?: string
  stoppedAt?: string
  lastInteractionAt?: string
  metadata?: Record<string, unknown>
}

export interface ActivitySummaryRequest {
  route?: string
}

export interface ActivitySummary {
  global: {
    totalDurationMs: number
    totalClicks: number
    sessionCount: number
  }
  perRoute: Array<{
    route: string
    totalDurationMs: number
    totalClicks: number
    sessionCount: number
  }>
  currentRoute: {
    route: string
    totalDurationMs: number
    totalClicks: number
    sessionCount: number
  } | null
}
