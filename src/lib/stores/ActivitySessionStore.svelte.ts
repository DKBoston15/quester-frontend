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
  currentTime: Date
  lastHeartbeatTime: Date | null
  isPaused: boolean
  pauseStartTime: Date | null
  totalPausedTime: number
}

const INACTIVITY_TIMEOUT_MS = 15000 // 15 seconds

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
    lastInteractionTime: null,
    currentTime: new Date(),
    lastHeartbeatTime: null,
    isPaused: false,
    pauseStartTime: null,
    totalPausedTime: 0
  })

  // Reactive getters using $derived
  const isSessionActive = $derived(state.sessionStartTime !== null)
  const isSessionPaused = $derived(state.isPaused && state.sessionStartTime !== null)
  const currentSessionDuration = $derived(() => {
    if (!state.sessionStartTime) return 0

    if (state.isPaused && state.pauseStartTime) {
      // When paused: freeze at the moment pause started
      return Math.max(0, state.pauseStartTime.getTime() - state.sessionStartTime.getTime() - state.totalPausedTime)
    } else {
      // When live: current time minus session start minus total paused time
      return Math.max(0, state.currentTime.getTime() - state.sessionStartTime.getTime() - state.totalPausedTime)
    }
  })

  const currentPageSummary = $derived(() => {
    if (!state.summary || !state.currentRoute) return null
    return state.summary.perRoute.find(route => route.route === state.currentRoute) || null
  })

  const totalProjectTime = $derived(() => {
    return state.summary?.global.totalDurationMs || 0
  })

  // Live calculations that include current session
  const liveCurrentPageTotal = $derived(() => {
    const historical = state.summary?.currentRoute?.totalDurationMs || 0
    // Only add current session time if we're on the same route as the summary
    const isCurrentRoute = state.currentRoute && state.summary?.currentRoute?.route === state.currentRoute
    const currentSessionTime = isCurrentRoute ? currentSessionDuration() : 0
    return historical + currentSessionTime
  })

  const liveProjectTotal = $derived(() => {
    const historical = state.summary?.global.totalDurationMs || 0
    const currentSessionTime = currentSessionDuration()
    return historical + currentSessionTime
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

    console.log('Session started for route:', route)

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

      // Don't throw error, just log it and continue with local tracking
      // This allows the timer widget to still show session time even if backend is unavailable
      return null
    } finally {
      state.isLoading = false
    }
  }

  async function sendHeartbeat(metadata?: Record<string, unknown>) {
    if (!state.sessionStartTime) return

    // Only send heartbeat to backend if we have a valid session
    if (!state.currentSession) {
      console.debug('Heartbeat skipped - no active backend session')
      return
    }

    // Skip heartbeat if no user activity since last heartbeat (saves API calls)
    const now = new Date()
    if (state.lastHeartbeatTime && state.lastInteractionTime &&
        state.lastInteractionTime <= state.lastHeartbeatTime) {
      console.debug('Heartbeat skipped - no new activity since last heartbeat')
      return
    }

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

      state.lastHeartbeatTime = now
      console.debug('Heartbeat sent successfully')
    } catch (error) {
      console.error('Error sending heartbeat:', error)
      // Don't set error state for heartbeat failures as they're background operations
    }
  }

  async function stopCurrentSession(autostopReason?: string) {
    if (!state.sessionStartTime) return

    state.isLoading = true
    state.error = null

    try {
      if (state.currentSession) {
        const stopRequest: StopActivitySessionRequest = {
          durationMs: Date.now() - state.sessionStartTime.getTime(),
          clickCount: state.clickCount,
          autostopReason,
          stoppedAt: new Date().toISOString(),
          lastInteractionAt: state.lastInteractionTime?.toISOString()
        }

        await ActivitySessionAPI.stopSession(state.currentSession.id, stopRequest)

        // Refresh summary after stopping session
        await loadSummary(state.currentRoute)
      }

      // Clean up regardless of API success/failure
      if (state.heartbeatInterval) {
        clearInterval(state.heartbeatInterval)
        state.heartbeatInterval = null
      }

      cleanupClickTracking()

      state.currentSession = null
      state.sessionStartTime = null
      state.clickCount = 0
      state.lastInteractionTime = null
      state.lastHeartbeatTime = null
      state.isPaused = false
      state.pauseStartTime = null
      state.totalPausedTime = 0

    } catch (error) {
      state.error = `Failed to stop session: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error stopping session:', error)

      // Clean up local state even if API call failed
      if (state.heartbeatInterval) {
        clearInterval(state.heartbeatInterval)
        state.heartbeatInterval = null
      }

      cleanupClickTracking()

      state.currentSession = null
      state.sessionStartTime = null
      state.clickCount = 0
      state.lastInteractionTime = null
      state.lastHeartbeatTime = null
      state.isPaused = false
      state.pauseStartTime = null
      state.totalPausedTime = 0

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

      // Provide default empty summary if backend is unavailable
      state.summary = {
        global: {
          totalDurationMs: 0,
          totalClicks: 0,
          sessionCount: 0
        },
        perRoute: [],
        currentRoute: route ? {
          route,
          totalDurationMs: 0,
          totalClicks: 0,
          sessionCount: 0
        } : null
      }
    } finally {
      state.isLoading = false
    }
  }

  function pauseSession() {
    if (!state.sessionStartTime || state.isPaused) return

    state.isPaused = true
    state.pauseStartTime = new Date()
    console.log('Session paused due to inactivity')
  }

  function resumeSession() {
    if (!state.sessionStartTime || !state.isPaused || !state.pauseStartTime) return

    // Add this pause duration to total paused time
    const pauseDuration = new Date().getTime() - state.pauseStartTime.getTime()
    state.totalPausedTime += pauseDuration

    state.isPaused = false
    state.pauseStartTime = null
    console.log(`Session resumed (was paused for ${pauseDuration}ms)`)
  }

  function handleInteraction(eventType = 'unknown') {
    const now = new Date()
    state.lastInteractionTime = now
    state.clickCount++

    // Auto-resume if currently paused
    if (state.isPaused) {
      console.log(`Resuming session due to ${eventType} event`)
      resumeSession()
    }
  }

  // Create specific event handlers to track event types
  const handleClick = () => handleInteraction('click')
  const handleKeydown = () => handleInteraction('keydown')
  const handleScroll = () => handleInteraction('scroll')
  const handleFocus = () => handleInteraction('focus')

  // Throttle mousemove to avoid excessive events
  let mouseMoveThrottle = false
  const handleMouseMove = () => {
    if (!mouseMoveThrottle) {
      handleInteraction('mousemove')
      mouseMoveThrottle = true
      setTimeout(() => mouseMoveThrottle = false, 1000) // Throttle to once per second
    }
  }

  function setupClickTracking() {
    if (typeof window !== 'undefined') {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('scroll', handleScroll, { passive: false })
      document.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('focus', handleFocus)

      console.log('Activity tracking events set up')
    }
  }

  function cleanupClickTracking() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('scroll', handleScroll)
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('focus', handleFocus)

      console.log('Activity tracking events cleaned up')
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

  // Start time update interval for reactive duration calculation and inactivity detection
  let timeUpdateInterval: number | null = null
  if (typeof window !== 'undefined') {
    timeUpdateInterval = window.setInterval(() => {
      state.currentTime = new Date()

      // Check for inactivity timeout - pause instead of stop
      if (state.sessionStartTime && state.lastInteractionTime && !state.isPaused) {
        const timeSinceLastInteraction = state.currentTime.getTime() - state.lastInteractionTime.getTime()

        if (timeSinceLastInteraction >= INACTIVITY_TIMEOUT_MS) {
          pauseSession()
        }
      }
    }, 1000)
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
    get isSessionActive() { return isSessionActive },
    get isSessionPaused() { return isSessionPaused },
    get currentSessionDuration() { return currentSessionDuration() },
    get currentPageSummary() { return currentPageSummary() },
    get totalProjectTime() { return totalProjectTime() },
    get liveCurrentPageTotal() { return liveCurrentPageTotal() },
    get liveProjectTotal() { return liveProjectTotal() },

    // Actions
    startSession,
    sendHeartbeat,
    stopCurrentSession,
    loadSummary,
    clearError
  }
}

export const activitySessionStore = createActivitySessionStore()