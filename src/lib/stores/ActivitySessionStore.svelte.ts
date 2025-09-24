import { ActivitySessionAPI } from '$lib/services/activity-session-api'
import type {
  ActivitySession,
  ActivitySummary,
  StartActivitySessionRequest,
  HeartbeatActivitySessionRequest,
  StopActivitySessionRequest
} from '$lib/types/timer'

interface ActivitySessionState {
  currentSession: ActivitySession | null
  summary: ActivitySummary | null
  isLoading: boolean
  error: string | null
  sessionStartTime: Date | null
  currentRoute: string | null
  heartbeatInterval: number | null
  clickCount: number
  lastInteractionTime: Date | null
}

function createActivitySessionStore() {
  let state = $state<ActivitySessionState>({
    currentSession: null,
    summary: null,
    isLoading: false,
    error: null,
    sessionStartTime: null,
    currentRoute: null,
    heartbeatInterval: null,
    clickCount: 0,
    lastInteractionTime: null
  })

  // Reactive getters using $derived
  const isSessionActive = $derived(state.currentSession !== null)
  const currentSessionDuration = $derived(() => {
    if (!state.sessionStartTime) return 0
    return Date.now() - state.sessionStartTime.getTime()
  })

  const currentPageSummary = $derived(() => {
    if (!state.summary || !state.currentRoute) return null
    return state.summary.perRoute.find(route => route.route === state.currentRoute) || null
  })

  const totalProjectTime = $derived(() => {
    return state.summary?.global.totalDurationMs || 0
  })

  async function startSession(route: string, metadata?: Record<string, unknown>) {
    if (state.currentSession) {
      console.warn('Session already active, stopping current session first')
      await stopCurrentSession()
    }

    state.isLoading = true
    state.error = null
    state.currentRoute = route
    state.sessionStartTime = new Date()
    state.clickCount = 0
    state.lastInteractionTime = new Date()

    try {
      const sessionRequest: StartActivitySessionRequest = {
        route,
        startedAt: state.sessionStartTime.toISOString(),
        metadata
      }

      state.currentSession = await ActivitySessionAPI.startSession(sessionRequest)

      // Start heartbeat interval (every 30 seconds)
      state.heartbeatInterval = window.setInterval(() => {
        sendHeartbeat()
      }, 30000)

      // Set up click tracking
      setupClickTracking()

      return state.currentSession
    } catch (error) {
      state.error = `Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error starting session:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function sendHeartbeat(metadata?: Record<string, unknown>) {
    if (!state.currentSession || !state.sessionStartTime) return

    try {
      const heartbeatRequest: HeartbeatActivitySessionRequest = {
        durationMs: Date.now() - state.sessionStartTime.getTime(),
        clickCount: state.clickCount,
        lastInteractionAt: state.lastInteractionTime?.toISOString(),
        metadata
      }

      state.currentSession = await ActivitySessionAPI.sendHeartbeat(
        state.currentSession.id,
        heartbeatRequest
      )
    } catch (error) {
      console.error('Error sending heartbeat:', error)
      // Don't set error state for heartbeat failures as they're background operations
    }
  }

  async function stopCurrentSession(autostopReason?: string) {
    if (!state.currentSession || !state.sessionStartTime) return

    state.isLoading = true
    state.error = null

    try {
      const stopRequest: StopActivitySessionRequest = {
        durationMs: Date.now() - state.sessionStartTime.getTime(),
        clickCount: state.clickCount,
        autostopReason,
        stoppedAt: new Date().toISOString(),
        lastInteractionAt: state.lastInteractionTime?.toISOString()
      }

      await ActivitySessionAPI.stopSession(state.currentSession.id, stopRequest)

      // Clean up
      if (state.heartbeatInterval) {
        clearInterval(state.heartbeatInterval)
        state.heartbeatInterval = null
      }

      cleanupClickTracking()

      state.currentSession = null
      state.sessionStartTime = null
      state.clickCount = 0
      state.lastInteractionTime = null

      // Refresh summary after stopping session
      await loadSummary(state.currentRoute)
    } catch (error) {
      state.error = `Failed to stop session: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error stopping session:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function loadSummary(route?: string) {
    state.isLoading = true
    state.error = null
    try {
      state.summary = await ActivitySessionAPI.getSummary(route ? { route } : undefined)
    } catch (error) {
      state.error = `Failed to load summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error loading summary:', error)
    } finally {
      state.isLoading = false
    }
  }

  function handleInteraction() {
    state.lastInteractionTime = new Date()
    state.clickCount++
  }

  function setupClickTracking() {
    if (typeof window !== 'undefined') {
      document.addEventListener('click', handleInteraction)
      document.addEventListener('keydown', handleInteraction)
      document.addEventListener('scroll', handleInteraction)
    }
  }

  function cleanupClickTracking() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('scroll', handleInteraction)
    }
  }

  function handleVisibilityChange() {
    if (typeof document !== 'undefined') {
      if (document.hidden && state.currentSession) {
        // Tab became hidden, send heartbeat
        sendHeartbeat({ visibilityChange: 'hidden' })
      } else if (!document.hidden && state.currentSession) {
        // Tab became visible, send heartbeat
        sendHeartbeat({ visibilityChange: 'visible' })
        state.lastInteractionTime = new Date()
      }
    }
  }

  // Set up visibility change tracking
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  function clearError() {
    state.error = null
  }

  return {
    // State (readonly)
    get currentSession() { return state.currentSession },
    get summary() { return state.summary },
    get isLoading() { return state.isLoading },
    get error() { return state.error },
    get currentRoute() { return state.currentRoute },
    get clickCount() { return state.clickCount },

    // Derived values
    isSessionActive,
    currentSessionDuration,
    currentPageSummary,
    totalProjectTime,

    // Actions
    startSession,
    sendHeartbeat,
    stopCurrentSession,
    loadSummary,
    clearError
  }
}

export const activitySessionStore = createActivitySessionStore()