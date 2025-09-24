import { api } from './api-client'
import type {
  CountdownTimer,
  CountdownEvent,
  CreateCountdownTimerRequest,
  UpdateCountdownTimerRequest,
  StartCountdownEventRequest,
  CompleteCountdownEventRequest
} from '$lib/types/timer'

// Countdown Timer API Service
export class CountdownTimerAPI {

  // Timer management
  static async getTimers(): Promise<CountdownTimer[]> {
    const response = await api.get('/countdown/timers')
    return response.timers
  }

  static async createTimer(timer: CreateCountdownTimerRequest): Promise<CountdownTimer> {
    const response = await api.post('/countdown/timers', timer)
    return response.timer
  }

  static async updateTimer(id: string, timer: UpdateCountdownTimerRequest): Promise<CountdownTimer> {
    const response = await api.put(`/countdown/timers/${id}`, timer)
    return response.timer
  }

  static async deleteTimer(id: string): Promise<void> {
    await api.delete(`/countdown/timers/${id}`)
  }

  // Event management
  static async getEvents(limit?: number): Promise<CountdownEvent[]> {
    const params = limit ? `?limit=${limit}` : ''
    const response = await api.get(`/countdown/events${params}`)
    return response.events
  }

  static async startCountdown(event: StartCountdownEventRequest): Promise<CountdownEvent> {
    const response = await api.post('/countdown/events', event)
    return response.event
  }

  static async completeCountdown(id: string, completion: CompleteCountdownEventRequest): Promise<CountdownEvent> {
    const response = await api.patch(`/countdown/events/${id}/complete`, completion)
    return response.event
  }
}