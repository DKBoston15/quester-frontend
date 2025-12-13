import { api } from '$lib/services/api-client';
import type {
  ResearchQuestion,
  ResearchQuestionWithSources,
  ResearchQuestionSummary,
  CreateResearchQuestionDTO,
  UpdateResearchQuestionDTO,
  CoverageResult,
  ResearchQuestionsResponse,
  DesignAlignmentResult,
  LanguageConsistencyResult,
  HistoryEntry,
  SuggestedSource,
} from '$lib/types/research-question';

interface ResearchQuestionsState {
  questions: ResearchQuestion[];
  loadedProjectId: string | null;
  summary: ResearchQuestionSummary | null;
  activeQuestionId: string | null;
  activeQuestionWithSources: ResearchQuestionWithSources | null;
  isLoading: boolean;
  error: string | null;
  isRecalculating: Record<string, boolean>;
  isLoadingDetails: boolean;
  // New state for analysis features
  designAnalysis: Record<string, DesignAlignmentResult>;
  languageConsistency: LanguageConsistencyResult | null;
  suggestedSources: Record<string, SuggestedSource[]>;
  questionHistory: Record<string, HistoryEntry[]>;
  isAnalyzing: Record<string, boolean>;
  isLoadingHistory: Record<string, boolean>;
  isLoadingSuggestions: Record<string, boolean>;
}

class ResearchQuestionsStore {
  private state = $state<ResearchQuestionsState>({
    questions: [],
    loadedProjectId: null,
    summary: null,
    activeQuestionId: null,
    activeQuestionWithSources: null,
    isLoading: false,
    error: null,
    isRecalculating: {},
    isLoadingDetails: false,
    // New state for analysis features
    designAnalysis: {},
    languageConsistency: null,
    suggestedSources: {},
    questionHistory: {},
    isAnalyzing: {},
    isLoadingHistory: {},
    isLoadingSuggestions: {},
  });

  // Getters
  get questions(): ResearchQuestion[] {
    return this.state.questions;
  }

  get openQuestions(): ResearchQuestion[] {
    return this.state.questions.filter((q) => q.status === 'open');
  }

  get addressedQuestions(): ResearchQuestion[] {
    return this.state.questions.filter((q) => q.status === 'addressed');
  }

  get blockedQuestions(): ResearchQuestion[] {
    return this.state.questions.filter((q) => q.status === 'blocked');
  }

  get summary(): ResearchQuestionSummary | null {
    return this.state.summary;
  }

  get activeQuestionId(): string | null {
    return this.state.activeQuestionId;
  }

  get activeQuestionWithSources(): ResearchQuestionWithSources | null {
    return this.state.activeQuestionWithSources;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  get isLoadingDetails(): boolean {
    return this.state.isLoadingDetails;
  }

  isRecalculating(questionId: string): boolean {
    return this.state.isRecalculating[questionId] || false;
  }

  // New getters for analysis features
  get languageConsistency(): LanguageConsistencyResult | null {
    return this.state.languageConsistency;
  }

  getDesignAnalysis(questionId: string): DesignAlignmentResult | undefined {
    return this.state.designAnalysis[questionId];
  }

  getSuggestedSources(questionId: string): SuggestedSource[] {
    return this.state.suggestedSources[questionId] || [];
  }

  getHistory(questionId: string): HistoryEntry[] {
    return this.state.questionHistory[questionId] || [];
  }

  isAnalyzing(questionId: string): boolean {
    return this.state.isAnalyzing[questionId] || false;
  }

  isLoadingHistory(questionId: string): boolean {
    return this.state.isLoadingHistory[questionId] || false;
  }

  isLoadingSuggestions(questionId: string): boolean {
    return this.state.isLoadingSuggestions[questionId] || false;
  }

  // Get a question by ID from local state
  getQuestion(questionId: string): ResearchQuestion | undefined {
    return this.state.questions.find((q) => q.id === questionId);
  }

  // Load questions for a project
  async loadQuestions(projectId: string, forceReload = false): Promise<void> {
    // Skip if already loaded for this project (unless forced)
    if (!forceReload && this.state.loadedProjectId === projectId && this.state.questions.length > 0) {
      return;
    }

    this.state.isLoading = true;
    this.state.error = null;

    try {
      const response = await api.get<ResearchQuestionsResponse>(
        `/projects/${projectId}/research-questions`
      );

      this.state.questions = response.questions || [];
      this.state.summary = response.summary || null;
      this.state.loadedProjectId = projectId;
    } catch (error) {
      console.error('Error loading research questions:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to load research questions';
    } finally {
      this.state.isLoading = false;
    }
  }

  // Create a new question
  async createQuestion(
    projectId: string,
    data: CreateResearchQuestionDTO
  ): Promise<ResearchQuestion | null> {
    try {
      const question = await api.post<ResearchQuestion>(
        `/projects/${projectId}/research-questions`,
        data
      );

      // Add to local state
      this.state.questions = [...this.state.questions, question];

      // Update summary
      if (this.state.summary) {
        this.state.summary = {
          ...this.state.summary,
          total: this.state.summary.total + 1,
        };
      }

      return question;
    } catch (error) {
      console.error('Error creating research question:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to create research question';
      return null;
    }
  }

  // Update a question
  async updateQuestion(id: string, data: UpdateResearchQuestionDTO): Promise<boolean> {
    try {
      const response = await api.put<{ question: ResearchQuestion }>(`/research-questions/${id}`, data);

      // Update local state
      this.state.questions = this.state.questions.map((q) =>
        q.id === id ? response.question : q
      );

      // Update active question if it's the same
      if (this.state.activeQuestionWithSources?.id === id) {
        this.state.activeQuestionWithSources = {
          ...this.state.activeQuestionWithSources,
          ...response.question,
        };
      }

      return true;
    } catch (error) {
      console.error('Error updating research question:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to update research question';
      return false;
    }
  }

  // Delete a question
  async deleteQuestion(id: string): Promise<boolean> {
    try {
      await api.delete(`/research-questions/${id}`);

      // Remove from local state
      this.state.questions = this.state.questions.filter((q) => q.id !== id);

      // Update summary
      if (this.state.summary) {
        this.state.summary = {
          ...this.state.summary,
          total: this.state.summary.total - 1,
        };
      }

      // Clear active if it was deleted
      if (this.state.activeQuestionId === id) {
        this.state.activeQuestionId = null;
        this.state.activeQuestionWithSources = null;
      }

      return true;
    } catch (error) {
      console.error('Error deleting research question:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to delete research question';
      return false;
    }
  }

  // Recalculate coverage for a question
  async recalculateCoverage(id: string): Promise<CoverageResult | null> {
    this.state.isRecalculating[id] = true;

    try {
      const response = await api.post<{ coverage: CoverageResult; durationMs: number }>(
        `/research-questions/${id}/recalculate`
      );

      // Update local state with new coverage
      this.state.questions = this.state.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              coveragePct: response.coverage.totalPct,
              coverageBreakdown: response.coverage.breakdown,
            }
          : q
      );

      // Reload full question if it's the active one
      if (this.state.activeQuestionId === id) {
        await this.loadQuestionWithSources(id);
      }

      // Recalculate summary
      this.recalculateSummary();

      return response.coverage;
    } catch (error) {
      console.error('Error recalculating coverage:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to recalculate coverage';
      return null;
    } finally {
      this.state.isRecalculating[id] = false;
    }
  }

  // Reorder questions
  async reorderQuestions(projectId: string, orderedIds: string[]): Promise<boolean> {
    try {
      await api.put(`/projects/${projectId}/research-questions/reorder`, {
        orderedIds,
      });

      // Update local order
      const orderedQuestions = orderedIds
        .map((id, index) => {
          const question = this.state.questions.find((q) => q.id === id);
          return question ? { ...question, orderIndex: index } : null;
        })
        .filter((q): q is ResearchQuestion => q !== null);

      this.state.questions = orderedQuestions;

      return true;
    } catch (error) {
      console.error('Error reordering questions:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to reorder questions';
      return false;
    }
  }

  // Load a single question with its sources
  async loadQuestionWithSources(id: string): Promise<ResearchQuestionWithSources | null> {
    this.state.isLoadingDetails = true;
    this.state.activeQuestionId = id;

    try {
      const question = await api.get<ResearchQuestionWithSources>(`/research-questions/${id}`);

      this.state.activeQuestionWithSources = question;
      return question;
    } catch (error) {
      console.error('Error loading question with sources:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to load question details';
      return null;
    } finally {
      this.state.isLoadingDetails = false;
    }
  }

  // Set active question (for opening detail drawer)
  setActiveQuestion(id: string | null): void {
    this.state.activeQuestionId = id;
    if (!id) {
      this.state.activeQuestionWithSources = null;
    }
  }

  // Clear error
  clearError(): void {
    this.state.error = null;
  }

  // Recalculate summary from local state
  private recalculateSummary(): void {
    const questions = this.state.questions;
    const total = questions.length;
    const addressed = questions.filter((q) => q.status === 'addressed').length;
    const avgCoverage =
      total > 0
        ? Math.round(questions.reduce((sum, q) => sum + q.coveragePct, 0) / total)
        : 0;
    const goodCoverageCount = questions.filter((q) => q.coveragePct >= 70).length;

    this.state.summary = {
      total,
      addressed,
      avgCoverage,
      goodCoverageCount,
    };
  }

  // =====================================================
  // Design Alignment Analysis Methods
  // =====================================================

  // Analyze design alignment for a question
  async analyzeDesignAlignment(questionId: string): Promise<DesignAlignmentResult | null> {
    this.state.isAnalyzing[questionId] = true;

    try {
      const response = await api.post<{ analysis: DesignAlignmentResult }>(
        `/research-questions/${questionId}/analyze-alignment`
      );

      this.state.designAnalysis[questionId] = response.analysis;

      // Update the question's alignment score in local state
      this.state.questions = this.state.questions.map((q) =>
        q.id === questionId
          ? { ...q, designAlignmentScore: response.analysis.overallScore }
          : q
      );

      return response.analysis;
    } catch (error) {
      console.error('Error analyzing design alignment:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to analyze design alignment';
      return null;
    } finally {
      this.state.isAnalyzing[questionId] = false;
    }
  }

  // Analyze language consistency across project questions
  async analyzeLanguageConsistency(projectId: string): Promise<LanguageConsistencyResult | null> {
    try {
      const response = await api.post<{ analysis: LanguageConsistencyResult }>(
        `/projects/${projectId}/research-questions/analyze-consistency`
      );

      this.state.languageConsistency = response.analysis;
      return response.analysis;
    } catch (error) {
      console.error('Error analyzing language consistency:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to analyze language consistency';
      return null;
    }
  }

  // =====================================================
  // History Methods
  // =====================================================

  // Load history for a question
  async loadHistory(questionId: string): Promise<HistoryEntry[]> {
    this.state.isLoadingHistory[questionId] = true;

    try {
      const response = await api.get<{ history: HistoryEntry[] }>(
        `/research-questions/${questionId}/history`
      );

      this.state.questionHistory[questionId] = response.history;
      return response.history;
    } catch (error) {
      console.error('Error loading question history:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to load question history';
      return [];
    } finally {
      this.state.isLoadingHistory[questionId] = false;
    }
  }

  // =====================================================
  // Suggested Sources Methods
  // =====================================================

  // Load suggested sources for a question
  async loadSuggestedSources(questionId: string): Promise<SuggestedSource[]> {
    this.state.isLoadingSuggestions[questionId] = true;

    try {
      const response = await api.get<{ suggestions: SuggestedSource[] }>(
        `/research-questions/${questionId}/suggested-sources`
      );

      this.state.suggestedSources[questionId] = response.suggestions;
      return response.suggestions;
    } catch (error) {
      console.error('Error loading suggested sources:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to load suggested sources';
      return [];
    } finally {
      this.state.isLoadingSuggestions[questionId] = false;
    }
  }

  // Accept a suggested source
  async acceptSuggestion(questionId: string, suggestionId: string): Promise<boolean> {
    try {
      await api.post(`/research-questions/${questionId}/suggested-sources/${suggestionId}/accept`);

      // Update local state - mark as accepted
      this.state.suggestedSources[questionId] = (this.state.suggestedSources[questionId] || []).map(
        (s) => (s.id === suggestionId ? { ...s, status: 'accepted' as const } : s)
      );

      // Reload the question with sources to get the new link
      if (this.state.activeQuestionId === questionId) {
        await this.loadQuestionWithSources(questionId);
      }

      return true;
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to accept suggestion';
      return false;
    }
  }

  // Dismiss a suggested source
  async dismissSuggestion(questionId: string, suggestionId: string): Promise<boolean> {
    try {
      await api.post(`/research-questions/${questionId}/suggested-sources/${suggestionId}/dismiss`);

      // Update local state - mark as dismissed
      this.state.suggestedSources[questionId] = (this.state.suggestedSources[questionId] || []).map(
        (s) => (s.id === suggestionId ? { ...s, status: 'dismissed' as const } : s)
      );

      return true;
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to dismiss suggestion';
      return false;
    }
  }

  // Regenerate suggested sources (deletes pending and re-matches)
  async regenerateSuggestions(questionId: string): Promise<SuggestedSource[]> {
    this.state.isLoadingSuggestions[questionId] = true;

    try {
      const response = await api.post<{ suggestions: SuggestedSource[] }>(
        `/research-questions/${questionId}/suggested-sources/regenerate`
      );

      this.state.suggestedSources[questionId] = response.suggestions;
      return response.suggestions;
    } catch (error) {
      console.error('Error regenerating suggestions:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Failed to regenerate suggestions';
      return [];
    } finally {
      this.state.isLoadingSuggestions[questionId] = false;
    }
  }

  // Get pending (suggested) sources only
  getPendingSuggestions(questionId: string): SuggestedSource[] {
    return (this.state.suggestedSources[questionId] || []).filter(
      (s) => s.status === 'suggested'
    );
  }

  // Clear all data
  clearAll(): void {
    this.state.questions = [];
    this.state.loadedProjectId = null;
    this.state.summary = null;
    this.state.activeQuestionId = null;
    this.state.activeQuestionWithSources = null;
    this.state.isLoading = false;
    this.state.error = null;
    this.state.isRecalculating = {};
    this.state.isLoadingDetails = false;
    // Clear new state
    this.state.designAnalysis = {};
    this.state.languageConsistency = null;
    this.state.suggestedSources = {};
    this.state.questionHistory = {};
    this.state.isAnalyzing = {};
    this.state.isLoadingHistory = {};
    this.state.isLoadingSuggestions = {};
  }
}

// Export singleton instance
export const researchQuestionsStore = new ResearchQuestionsStore();
