/**
 * SSE stream parser for the Analysis (Research Analyst) endpoint.
 *
 * Connects to POST /analysis/query and dispatches typed callbacks
 * for each event kind emitted by the backend.
 */

import { streamRequest } from './api-client'
import type {
  StreamEvent,
  AnalysisBlock,
  BlockType,
  SuggestionItem,
} from '$lib/types/analysis'

export interface AnalysisStreamCallbacks {
  onSessionStart?: (sessionId: string) => void
  onStepStart?: (data: { stepId: string; description: string; toolName?: string }) => void
  onStepComplete?: (data: {
    stepId: string
    summary: string
    duration: number
    status: 'success' | 'error'
    error?: string
  }) => void
  onBlock?: (data: { blockId: string; blockType: BlockType; block: AnalysisBlock }) => void
  onContentDelta?: (text: string) => void
  onSuggestions?: (items: SuggestionItem[]) => void
  onError?: (message: string, recoverable: boolean) => void
  onDone?: (metadata: {
    sessionId: string
    messageId: string
    content?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    duration: number
    toolCallCount: number
    suggestions?: SuggestionItem[]
  }) => void
}

export interface AnalysisStreamParams {
  projectId: string
  message: string
  sessionId?: string
  literatureIds?: string[]
  researchQuestionIds?: string[]
  noteIds?: string[]
  signal?: AbortSignal
}

/**
 * Opens an SSE connection to the analysis query endpoint and dispatches
 * typed callbacks as events arrive.
 */
export async function streamAnalysis(
  params: AnalysisStreamParams,
  callbacks: AnalysisStreamCallbacks,
): Promise<void> {
  const response = await streamRequest('/analysis/query', {
    method: 'POST',
    body: {
      projectId: params.projectId,
      message: params.message,
      ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      ...(params.literatureIds?.length ? { literatureIds: params.literatureIds } : {}),
      ...(params.researchQuestionIds?.length ? { researchQuestionIds: params.researchQuestionIds } : {}),
      ...(params.noteIds?.length ? { noteIds: params.noteIds } : {}),
    },
    signal: params.signal,
    timeout: 120_000,
  })

  if (!response.body) {
    throw new Error('Response body is null')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep last incomplete line in buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        // Skip keepalive pings and empty lines
        if (!line.startsWith('data: ')) continue

        const content = line.slice(6)
        if (!content) continue

        let event: StreamEvent
        try {
          event = JSON.parse(content)
        } catch {
          // Not valid JSON — skip
          continue
        }

        dispatchEvent(event, callbacks)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function dispatchEvent(event: StreamEvent, cb: AnalysisStreamCallbacks) {
  switch (event.type) {
    case 'session_start':
      cb.onSessionStart?.(event.sessionId)
      break
    case 'step_start':
      cb.onStepStart?.({
        stepId: event.stepId,
        description: event.description,
        toolName: event.toolName,
      })
      break
    case 'step_complete':
      cb.onStepComplete?.({
        stepId: event.stepId,
        summary: event.summary,
        duration: event.duration,
        status: event.status,
        error: event.error,
      })
      break
    case 'block':
      cb.onBlock?.({
        blockId: event.blockId,
        blockType: event.blockType,
        block: event.data,
      })
      break
    case 'content_delta':
      cb.onContentDelta?.(event.text)
      break
    case 'suggestions':
      cb.onSuggestions?.(event.items)
      break
    case 'error':
      cb.onError?.(event.message, event.recoverable)
      break
    case 'done':
      cb.onDone?.(event.metadata)
      break
  }
}
