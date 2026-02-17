/**
 * Analysis Types — Frontend
 *
 * SYNC: Shared types must match quester-backend/app/services/analysis_tools/types.ts
 *
 * Shared types: AnalysisBlock, all block types, StreamEvent, PersistedStepInfo,
 *   ToolCallSummary, MessageMetadata, SuggestionItem
 * Frontend-only types: LiveStepInfo, StepInfo, AnalystMessage, SessionSummary
 */

// ---------------------------------------------------------------------------
// Block Types (SHARED)
// ---------------------------------------------------------------------------

export type BlockType = 'table' | 'chart' | 'metric' | 'citation' | 'comparison'

interface BaseBlock {
  id: string
  type: BlockType
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  type?: 'string' | 'number' | 'date'
}

export interface TableBlock extends BaseBlock {
  type: 'table'
  title: string
  columns: TableColumn[]
  rows: Record<string, any>[]
  caption?: string
}

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'network' | 'treemap'

interface BaseChartBlock extends BaseBlock {
  type: 'chart'
  title: string
  chartType: ChartType
}

export interface LabelIndexedChartBlock extends BaseChartBlock {
  chartType: 'bar' | 'line' | 'pie'
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      backgroundColor?: string | string[]
      borderColor?: string | string[]
    }>
  }
  xLabel?: string
  yLabel?: string
}

export interface ScatterChartBlock extends BaseChartBlock {
  chartType: 'scatter'
  data: {
    datasets: Array<{
      label: string
      points: Array<{ x: number; y: number; label?: string }>
      backgroundColor?: string
      borderColor?: string
    }>
  }
  xLabel?: string
  yLabel?: string
}

export interface HeatmapChartBlock extends BaseChartBlock {
  chartType: 'heatmap'
  data: {
    xLabels: string[]
    yLabels: string[]
    cells: number[][]
  }
  colorScale?: { min: string; max: string }
}

export interface NetworkChartBlock extends BaseChartBlock {
  chartType: 'network'
  data: {
    nodes: Array<{ id: string; label: string; size?: number; group?: string }>
    edges: Array<{ source: string; target: string; weight?: number; label?: string }>
  }
}

export interface TreemapChartBlock extends BaseChartBlock {
  chartType: 'treemap'
  data: {
    children: TreemapNode[]
  }
}

export interface TreemapNode {
  name: string
  value: number
  children?: TreemapNode[]
}

export type ChartBlock =
  | LabelIndexedChartBlock
  | ScatterChartBlock
  | HeatmapChartBlock
  | NetworkChartBlock
  | TreemapChartBlock

export interface MetricItem {
  label: string
  value: string | number
  unit?: string
  change?: string | number
  description?: string
}

export interface MetricBlock extends BaseBlock {
  type: 'metric'
  metrics: MetricItem[]
}

export interface CitationItem {
  literatureId: string | null
  formatted: string
  style: string
  authors: string
  year: string | number
  title: string
}

export interface CitationBlock extends BaseBlock {
  type: 'citation'
  citations: CitationItem[]
}

export interface ComparisonBlock extends BaseBlock {
  type: 'comparison'
  title: string
  items: Array<{ label: string; dimensions: Record<string, string | number> }>
  sharedDimensions: string[]
  highlightDifferences?: boolean
}

export type AnalysisBlock =
  | TableBlock
  | ChartBlock
  | MetricBlock
  | CitationBlock
  | ComparisonBlock

// ---------------------------------------------------------------------------
// Steps (SHARED: PersistedStepInfo | FRONTEND-ONLY: LiveStepInfo, StepInfo)
// ---------------------------------------------------------------------------

export interface PersistedStepInfo {
  id: string
  description: string
  toolName?: string
  status: 'success' | 'error'
  duration: number
  summary?: string
  error?: string
}

/** Frontend-only — includes 'running' state for live streaming */
export interface LiveStepInfo {
  id: string
  description: string
  toolName?: string
  status: 'running' | 'success' | 'error'
  duration?: number
  summary?: string
  error?: string
}

/** Union used by StepsBlock.svelte to accept either live or persisted steps */
export type StepInfo = LiveStepInfo | PersistedStepInfo

// ---------------------------------------------------------------------------
// Tool Call Summaries (SHARED)
// ---------------------------------------------------------------------------

export interface ToolCallSummary {
  name: string
  paramsSummary: string
  resultRowCount: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Suggestions (SHARED)
// ---------------------------------------------------------------------------

export interface SuggestionItem {
  text: string
  category?: string
}

// ---------------------------------------------------------------------------
// Message Metadata (SHARED)
// ---------------------------------------------------------------------------

export interface LiteratureScopeItem {
  id: string
  name?: string
  publishYear?: string
  type?: string
  authors?: string[]
}

export interface ResearchQuestionScopeItem {
  id: string
  question: string
  status: string
}

export interface MessageMetadata {
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  timing?: {
    startMs: number
    endMs: number
    totalMs: number
  }
  model?: string
  steps?: PersistedStepInfo[]
  suggestions?: SuggestionItem[]
  literatureScope?: LiteratureScopeItem[]
  researchQuestionScope?: ResearchQuestionScopeItem[]
}

// ---------------------------------------------------------------------------
// Streaming Events (SHARED)
// ---------------------------------------------------------------------------

export type StreamEvent =
  | { type: 'session_start'; sessionId: string }
  | { type: 'step_start'; stepId: string; description: string; toolName?: string }
  | {
      type: 'step_complete'
      stepId: string
      summary: string
      duration: number
      status: 'success' | 'error'
      error?: string
    }
  | { type: 'block'; blockId: string; blockType: BlockType; data: AnalysisBlock }
  | { type: 'content_delta'; text: string }
  | { type: 'suggestions'; items: SuggestionItem[] }
  | { type: 'error'; message: string; recoverable: boolean }
  | {
      type: 'done'
      metadata: {
        sessionId: string
        messageId: string
        content?: string
        usage: MessageMetadata['usage']
        duration: number
        toolCallCount: number
        suggestions?: SuggestionItem[]
      }
    }

// ---------------------------------------------------------------------------
// Frontend-Only Types
// ---------------------------------------------------------------------------

export interface AnalystMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  blocks: AnalysisBlock[]
  toolCalls: ToolCallSummary[]
  metadata: MessageMetadata
  provider: string
  toolCallCount: number
  createdAt: string
}

export interface SessionSummary {
  id: string
  title: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface MessagesResponse {
  messages: AnalystMessage[]
  totalCount: number
  offset: number
  limit: number
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export interface AnalysisArtifact {
  id: string
  projectId: string
  userId: string
  sessionId: string | null
  messageId: string | null
  title: string
  description: string | null
  blockType: string
  blockData: Record<string, any>
  queryContext: Record<string, any>
  tags: string[]
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface ArtifactListResponse {
  artifacts: AnalysisArtifact[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}
