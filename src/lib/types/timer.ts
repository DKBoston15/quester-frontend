// Timer-related TypeScript types based on backend models

export interface CountdownTimer {
  id: string
  userId: string
  label: string
  durationMs: number
  soundAsset?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CountdownEvent {
  id: string
  countdownTimerId?: string
  userId: string
  startedAt: string
  completedAt?: string
  targetDurationMs: number
  elapsedMs: number
  status: 'active' | 'completed' | 'cancelled' | 'expired'
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  countdownTimer?: CountdownTimer
}

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

// API request/response types
export interface CreateCountdownTimerRequest {
  label: string
  durationMs: number
  soundAsset?: string
  isDefault?: boolean
}

export interface UpdateCountdownTimerRequest {
  label?: string
  durationMs?: number
  soundAsset?: string
  isDefault?: boolean
}

export interface StartCountdownEventRequest {
  countdownTimerId?: string
  targetDurationMs: number
  metadata?: Record<string, unknown>
}

export interface CompleteCountdownEventRequest {
  elapsedMs: number
  completedAt?: string
  status?: 'completed' | 'cancelled' | 'expired'
  metadata?: Record<string, unknown>
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

// Activity summary response types
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

// Timer widget state types
export interface TimerState {
  isRunning: boolean
  currentSessionTime: number
  pageStartTime?: Date
  activeCountdown?: {
    event: CountdownEvent
    remainingMs: number
    isRunning: boolean
  }
}

// Sound asset options
export interface SoundAsset {
  name: string
  url: string
  duration: number
}