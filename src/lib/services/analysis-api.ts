/**
 * REST client for Analysis (Research Analyst) endpoints.
 *
 * Uses the centralized api-client for cookie auth and error handling.
 */

import { api } from './api-client'
import type {
  SessionSummary,
  MessagesResponse,
  AnalysisArtifact,
  ArtifactListResponse,
} from '$lib/types/analysis'

export interface GetSessionsParams {
  limit?: number
  offset?: number
}

export interface GetMessagesParams {
  limit?: number
  offset?: number
}

/**
 * Fetch analysis sessions for a project (filtered to current user by backend).
 */
export async function getSessions(
  projectId: string,
  params?: GetSessionsParams,
): Promise<{ sessions: SessionSummary[] }> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return api.get(`/analysis/sessions/${projectId}${query ? `?${query}` : ''}`)
}

/**
 * Fetch messages for a session with pagination.
 * If offset is omitted, backend returns the latest page.
 */
export async function getMessages(
  sessionId: string,
  params?: GetMessagesParams,
): Promise<MessagesResponse> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset !== undefined) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return api.get(`/analysis/messages/${sessionId}${query ? `?${query}` : ''}`)
}

/**
 * Soft-delete an analysis session.
 */
export async function deleteSession(
  sessionId: string,
): Promise<{ success: boolean }> {
  return api.delete(`/analysis/sessions/${sessionId}`)
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export interface CreateArtifactParams {
  projectId: string
  sessionId?: string
  messageId?: string
  title: string
  description?: string
  blockType: string
  blockData: Record<string, any>
  queryContext?: Record<string, any>
  tags?: string[]
}

export async function createArtifact(
  params: CreateArtifactParams,
): Promise<AnalysisArtifact> {
  return api.post('/analysis/artifacts', params)
}

export interface ListArtifactsParams {
  blockType?: string
  isPinned?: boolean
  page?: number
  limit?: number
}

export async function listArtifacts(
  projectId: string,
  params?: ListArtifactsParams,
): Promise<ArtifactListResponse> {
  const qs = new URLSearchParams()
  if (params?.blockType) qs.set('blockType', params.blockType)
  if (params?.isPinned !== undefined) qs.set('isPinned', String(params.isPinned))
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return api.get(`/analysis/artifacts/${projectId}${query ? `?${query}` : ''}`)
}

export async function getArtifact(
  artifactId: string,
): Promise<AnalysisArtifact> {
  return api.get(`/analysis/artifacts/detail/${artifactId}`)
}

export async function updateArtifact(
  artifactId: string,
  data: { title?: string; description?: string; tags?: string[]; isPinned?: boolean },
): Promise<AnalysisArtifact> {
  return api.put(`/analysis/artifacts/${artifactId}`, data)
}

export async function deleteArtifact(
  artifactId: string,
): Promise<{ success: boolean }> {
  return api.delete(`/analysis/artifacts/${artifactId}`)
}
