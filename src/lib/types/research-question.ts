export type ResearchQuestionStatus = 'open' | 'addressed' | 'blocked'
export type RelevanceType = 'direct_evidence' | 'related_discussion'
export type SourceType = 'literature' | 'note'
export type NoteCategory = 'literature_note' | 'research_note'

export interface CoverageBreakdown {
  direct: number
  related: number
  gap: number
}

export interface ResearchQuestion {
  id: string
  projectId: string
  questionText: string
  description: string | null
  status: ResearchQuestionStatus
  priority: number // 0=low, 1=medium, 2=high
  orderIndex: number
  coveragePct: number
  coverageBreakdown: CoverageBreakdown
  coverageExplanation: string | null
  hasConflicts: boolean
  conflictCount: number
  metadata: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

export interface ResearchQuestionSource {
  id: string
  questionId: string
  sourceId: string
  sourceType: SourceType
  relevanceType: RelevanceType
  relevanceScore: number | null
  excerpt: string | null
  metadata: Record<string, any> | null
  createdAt: string
  updatedAt: string
  // Joined/computed fields
  sourceTitle?: string
  noteCategory?: NoteCategory // Only for notes
}

export interface ResearchQuestionWithSources extends ResearchQuestion {
  sources: ResearchQuestionSource[]
}

export interface ResearchQuestionSummary {
  total: number
  addressed: number
  avgCoverage: number
  goodCoverageCount: number
}

export interface CreateResearchQuestionDTO {
  questionText: string
  description?: string
  priority?: number
}

export interface UpdateResearchQuestionDTO {
  questionText?: string
  description?: string | null
  status?: ResearchQuestionStatus
  priority?: number
  orderIndex?: number
}

export interface CoverageResult {
  totalPct: number
  breakdown: CoverageBreakdown
  sourceCount: number
  sources: Array<{
    sourceId: string
    sourceType: SourceType
    relevanceType: RelevanceType
    relevanceScore: number
    excerpt: string | null
    title: string
    metadata: Record<string, any>
    noteCategory?: NoteCategory // Only for notes
  }>
}

export interface ResearchQuestionsResponse {
  questions: ResearchQuestion[]
  summary: ResearchQuestionSummary
}

// Design Alignment Types
export type QuestionType = 'descriptive' | 'predictive' | 'exploratory' | 'explanatory' | 'evaluative'

export interface DesignScores {
  research: number
  analytic: number
  sampling: number
  measurement: number
}

export interface DesignMismatch {
  designType: 'research' | 'analytic' | 'sampling' | 'measurement'
  designValue: string
  issue: string
  suggestion: string
}

export interface DesignAlignmentResult {
  overallScore: number
  scores: DesignScores
  mismatches: DesignMismatch[]
  questionType: QuestionType
  suggestedRewrites: string[]
  explanation: string
  confidenceScore: number
}

// Language Consistency Types
export interface DetectedTerm {
  term: string
  count: number
  synonyms: string[]
  questionIds: string[]
}

export interface TermInconsistency {
  term1: string
  term2: string
  questionIds: string[]
  recommendation: string
}

export interface LanguageConsistencyResult {
  overallScore: number
  termAnalysis: DetectedTerm[]
  inconsistencies: TermInconsistency[]
  questionTypes: Record<QuestionType, string[]>
  recommendations: string[]
}

// History Types
export type HistoryChangeType =
  | 'created'
  | 'text_updated'
  | 'coverage_recalculated'
  | 'source_added'
  | 'source_removed'
  | 'status_changed'
  | 'analysis_completed'

export interface ChangeMetadata {
  previousText?: string
  previousStatus?: string
  sourceId?: string
  sourceType?: string
  analysisType?: string
  [key: string]: unknown
}

export interface HistoryEntry {
  id: string
  questionId: string
  questionText: string | null
  description: string | null
  coveragePct: number
  coverageBreakdown: CoverageBreakdown
  sourceCount: number
  designAlignmentScore: number | null
  designScores: DesignScores | null
  changeType: HistoryChangeType | null
  changeMetadata: ChangeMetadata | null
  recordedAt: string
}

// Suggested Sources Types
export type SuggestedSourceStatus = 'suggested' | 'accepted' | 'dismissed'

export interface SuggestedSource {
  id: string
  questionId: string
  sourceId: string
  sourceType: SourceType
  sourceTitle: string | null
  similarityScore: number
  matchingTerms: string[]
  excerpt: string | null
  status: SuggestedSourceStatus
  createdAt: string
  noteCategory?: NoteCategory // Only for notes
}

// Extended Research Question with new fields
export interface ResearchQuestionExtended extends ResearchQuestion {
  designAlignmentScore: number | null
  designAlignmentSummary: string | null
  autoMatchStatus: 'pending' | 'matching' | 'complete'
  lastAnalyzedAt: string | null
  lastMatchedAt: string | null
}
