import { CountdownTimerAPI } from '$lib/services/countdown-timer-api'
import type {
  CountdownTimer,
  CountdownEvent,
  CreateCountdownTimerRequest,
  UpdateCountdownTimerRequest,
  StartCountdownEventRequest,
  CompleteCountdownEventRequest
} from '$lib/types/timer'

interface CountdownTimerState {
  timers: CountdownTimer[]
  events: CountdownEvent[]
  activeEvent: CountdownEvent | null
  isLoading: boolean
  error: string | null
}

function createCountdownTimerStore() {
  let state = $state<CountdownTimerState>({
    timers: [],
    events: [],
    activeEvent: null,
    isLoading: false,
    error: null
  })

  // Reactive getters using $derived
  const defaultTimer = $derived(state.timers.find(timer => timer.isDefault) || null)
  const hasActiveCountdown = $derived(state.activeEvent !== null)
  const isTimerRunning = $derived(state.activeEvent?.status === 'active')

  async function loadTimers() {
    state.isLoading = true
    state.error = null
    try {
      state.timers = await CountdownTimerAPI.getTimers()
    } catch (error) {
      state.error = `Failed to load timers: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error loading timers:', error)

      // Provide default empty timers array if backend is unavailable
      state.timers = []
    } finally {
      state.isLoading = false
    }
  }

  async function loadEvents(limit?: number) {
    state.isLoading = true
    state.error = null
    try {
      state.events = await CountdownTimerAPI.getEvents(limit)
    } catch (error) {
      state.error = `Failed to load events: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error loading events:', error)

      // Provide default empty events array if backend is unavailable
      state.events = []
    } finally {
      state.isLoading = false
    }
  }

  async function createTimer(timer: CreateCountdownTimerRequest) {
    state.isLoading = true
    state.error = null
    try {
      const newTimer = await CountdownTimerAPI.createTimer(timer)
      state.timers = [...state.timers, newTimer]
      return newTimer
    } catch (error) {
      state.error = `Failed to create timer: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error creating timer:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function updateTimer(id: string, updates: UpdateCountdownTimerRequest) {
    state.isLoading = true
    state.error = null
    try {
      const updatedTimer = await CountdownTimerAPI.updateTimer(id, updates)
      state.timers = state.timers.map(timer =>
        timer.id === id ? updatedTimer : timer
      )
      return updatedTimer
    } catch (error) {
      state.error = `Failed to update timer: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error updating timer:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function deleteTimer(id: string) {
    state.isLoading = true
    state.error = null
    try {
      await CountdownTimerAPI.deleteTimer(id)
      state.timers = state.timers.filter(timer => timer.id !== id)
    } catch (error) {
      state.error = `Failed to delete timer: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error deleting timer:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function startCountdown(eventRequest: StartCountdownEventRequest) {
    state.isLoading = true
    state.error = null
    try {
      const event = await CountdownTimerAPI.startCountdown(eventRequest)
      state.activeEvent = event
      state.events = [event, ...state.events]
      return event
    } catch (error) {
      state.error = `Failed to start countdown: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error starting countdown:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function completeCountdown(id: string, completion: CompleteCountdownEventRequest) {
    state.isLoading = true
    state.error = null
    try {
      const completedEvent = await CountdownTimerAPI.completeCountdown(id, completion)

      // Update the event in the events array
      state.events = state.events.map(event =>
        event.id === id ? completedEvent : event
      )

      // Clear active event if it's the one being completed
      if (state.activeEvent?.id === id) {
        state.activeEvent = null
      }

      return completedEvent
    } catch (error) {
      state.error = `Failed to complete countdown: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error completing countdown:', error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  function clearActiveEvent() {
    state.activeEvent = null
  }

  function clearError() {
    state.error = null
  }

  return {
    // State (readonly)
    get timers() { return state.timers },
    get events() { return state.events },
    get activeEvent() { return state.activeEvent },
    get isLoading() { return state.isLoading },
    get error() { return state.error },

    // Derived values
    get defaultTimer() { return defaultTimer },
    get hasActiveCountdown() { return hasActiveCountdown },
    get isTimerRunning() { return isTimerRunning },

    // Actions
    loadTimers,
    loadEvents,
    createTimer,
    updateTimer,
    deleteTimer,
    startCountdown,
    completeCountdown,
    clearActiveEvent,
    clearError
  }
}

export const countdownTimerStore = createCountdownTimerStore()