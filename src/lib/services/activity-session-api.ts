import { api } from './api-client'
import type {
  ActivitySession,
  ActivitySummary,
  StartActivitySessionRequest,
  HeartbeatActivitySessionRequest,
  StopActivitySessionRequest,
  ActivitySummaryRequest
} from '$lib/types/timer'

// Activity Session API Service
export class ActivitySessionAPI {

  static async startSession(session: StartActivitySessionRequest): Promise<ActivitySession> {
    const response = await api.post('/activity/sessions', session)
    return response.session
  }

  static async sendHeartbeat(id: string, heartbeat: HeartbeatActivitySessionRequest): Promise<ActivitySession> {
    const response = await api.patch(`/activity/sessions/${id}/heartbeat`, heartbeat)
    return response.session
  }

  static async stopSession(id: string, completion: StopActivitySessionRequest): Promise<ActivitySession> {
    const response = await api.patch(`/activity/sessions/${id}/stop`, completion)
    return response.session
  }

  static async getSummary(params?: ActivitySummaryRequest): Promise<ActivitySummary> {
    const queryParams = params?.route ? `?route=${encodeURIComponent(params.route)}` : ''
    const response = await api.get(`/activity/summary${queryParams}`)
    return response
  }
}