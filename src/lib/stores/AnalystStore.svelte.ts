import { streamAnalysis } from '$lib/services/analysis-stream';
import { getSessions, getMessages, deleteSession as apiDeleteSession } from '$lib/services/analysis-api';
import type {
  AnalystMessage,
  AnalysisBlock,
  LiveStepInfo,
  SessionSummary,
  SuggestionItem,
  LiteratureScopeItem,
} from '$lib/types/analysis';
import type { ResearchQuestion } from '$lib/stores/ResearchQuestionsStore.svelte';

function deduplicateNarrative(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 20) {
    return trimmed;
  }

  const center = Math.floor(trimmed.length / 2);
  for (const offset of [-2, -1, 0, 1, 2]) {
    const split = center + offset;
    if (split <= 0 || split >= trimmed.length) continue;

    const firstHalf = trimmed.slice(0, split).trim();
    const secondHalf = trimmed.slice(split).trim();
    if (firstHalf.length >= 10 && firstHalf === secondHalf) {
      return firstHalf;
    }
  }

  return trimmed;
}

function inferSuggestionsFromNarrative(text: string): SuggestionItem[] {
  if (!text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const collected: string[] = [];
  let inSuggestionSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("follow-up suggestion") ||
      lower.includes("follow up suggestion") ||
      lower.includes("next step") ||
      lower.includes("you might also ask")
    ) {
      inSuggestionSection = true;
      continue;
    }

    if (!inSuggestionSection) continue;

    const bulletMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (!bulletMatch) {
      if (line.endsWith(":")) continue;
      break;
    }

    const suggestion = bulletMatch[1].trim();
    if (suggestion.length >= 8) {
      collected.push(suggestion);
    }
  }

  if (collected.length === 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const candidate = lines[i];
      if (candidate.length >= 8 && candidate.endsWith("?")) {
        collected.push(candidate);
      }
      if (collected.length >= 5) break;
    }
  }

  const unique = Array.from(
    new Map(
      collected.map((item) => [item.toLowerCase(), item.replace(/\s+/g, " ").trim()]),
    ).values(),
  )
    .filter((item) => item.length >= 8 && item.length <= 180)
    .slice(0, 5);

  return unique.map((text) => ({ text }));
}

export interface ResearchQuestionScopeItem {
  id: string;
  question: string;
  status: string;
  isParent: boolean;
}

interface AnalystState {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  messages: AnalystMessage[];
  messagesTotalCount: number;
  messagesOffset: number;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isStreaming: boolean;
  currentSteps: LiveStepInfo[];
  streamingNarrative: string;
  streamingBlocks: AnalysisBlock[];
  suggestions: SuggestionItem[];
  artifactSaveCount: number;
  error: string | null;
  selectedLiteratureIds: string[];
  selectedLiteratureItems: LiteratureScopeItem[];
  selectedResearchQuestionIds: string[];
  selectedResearchQuestionItems: ResearchQuestionScopeItem[];
  availableResearchQuestions: ResearchQuestionScopeItem[];
}

class AnalystStore {
  private state = $state<AnalystState>({
    sessions: [],
    currentSessionId: null,
    messages: [],
    messagesTotalCount: 0,
    messagesOffset: 0,
    hasMoreMessages: false,
    isLoadingMore: false,
    isStreaming: false,
    currentSteps: [],
    streamingNarrative: '',
    streamingBlocks: [],
    suggestions: [],
    artifactSaveCount: 0,
    error: null,
    selectedLiteratureIds: [],
    selectedLiteratureItems: [],
    selectedResearchQuestionIds: [],
    selectedResearchQuestionItems: [],
    availableResearchQuestions: [],
  });

  private abortController: AbortController | null = null;

  // Getters
  get sessions() { return this.state.sessions; }
  get currentSessionId() { return this.state.currentSessionId; }
  get messages() { return this.state.messages; }
  get messagesTotalCount() { return this.state.messagesTotalCount; }
  get hasMoreMessages() { return this.state.hasMoreMessages; }
  get isLoadingMore() { return this.state.isLoadingMore; }
  get isStreaming() { return this.state.isStreaming; }
  get currentSteps() { return this.state.currentSteps; }
  get streamingNarrative() { return this.state.streamingNarrative; }
  get streamingBlocks() { return this.state.streamingBlocks; }
  get suggestions() { return this.state.suggestions; }
  get artifactSaveCount() { return this.state.artifactSaveCount; }
  get error() { return this.state.error; }
  get selectedLiteratureIds() { return this.state.selectedLiteratureIds; }
  get selectedLiteratureItems() { return this.state.selectedLiteratureItems; }
  get selectedResearchQuestionIds() { return this.state.selectedResearchQuestionIds; }
  get selectedResearchQuestionItems() { return this.state.selectedResearchQuestionItems; }
  get availableResearchQuestions() { return this.state.availableResearchQuestions; }

  /**
   * Send a query and stream the response.
   */
  async sendQuery(projectId: string, message: string) {
    if (this.state.isStreaming) return;

    this.state.error = null;
    this.state.isStreaming = true;
    this.state.currentSteps = [];
    this.state.streamingNarrative = '';
    this.state.streamingBlocks = [];
    this.state.suggestions = [];

    // Snapshot scope at send time
    const scopeIds = [...this.state.selectedLiteratureIds];
    const scopeItems = [...this.state.selectedLiteratureItems];
    const questionIds = [...this.state.selectedResearchQuestionIds];
    const questionItems = [...this.state.selectedResearchQuestionItems];

    // Add optimistic user message
    const metadata: any = {};
    if (scopeItems.length > 0) metadata.literatureScope = scopeItems;
    if (questionItems.length > 0) metadata.researchQuestionScope = questionItems;

    const userMsg: AnalystMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      blocks: [],
      toolCalls: [],
      metadata,
      provider: 'gemini',
      toolCallCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.messages = [...this.state.messages, userMsg];

    this.abortController = new AbortController();

    try {
      await streamAnalysis(
        {
          projectId,
          message,
          sessionId: this.state.currentSessionId ?? undefined,
          ...(scopeIds.length > 0 ? { literatureIds: scopeIds } : {}),
          ...(questionIds.length > 0 ? { researchQuestionIds: questionIds } : {}),
          signal: this.abortController.signal,
        },
        {
          onSessionStart: (sessionId) => {
            this.state.currentSessionId = sessionId;
          },

          onStepStart: (data) => {
            const step: LiveStepInfo = {
              id: data.stepId,
              description: data.description,
              toolName: data.toolName,
              status: 'running',
            };
            this.state.currentSteps = [...this.state.currentSteps, step];
          },

          onStepComplete: (data) => {
            this.state.currentSteps = this.state.currentSteps.map((s) =>
              s.id === data.stepId
                ? {
                    ...s,
                    status: data.status as 'success' | 'error',
                    summary: data.summary,
                    duration: data.duration,
                    error: data.error,
                  }
                : s,
            );
          },

          onBlock: (data) => {
            this.state.streamingBlocks = [...this.state.streamingBlocks, data.block];
          },

          onContentDelta: (text) => {
            this.state.streamingNarrative += text;
          },

          onSuggestions: (items) => {
            this.state.suggestions = items;
          },

          onError: (msg, _recoverable) => {
            this.state.error = msg;
          },

          onDone: (metadata) => {
            // Finalize assistant message from streaming state
            const deduplicatedContent =
              metadata.content ?? deduplicateNarrative(this.state.streamingNarrative);
            const resolvedSuggestions =
              this.state.suggestions.length > 0
                ? this.state.suggestions
                : metadata.suggestions && metadata.suggestions.length > 0
                  ? metadata.suggestions
                  : inferSuggestionsFromNarrative(deduplicatedContent);

            this.state.suggestions = resolvedSuggestions;

            const assistantMsg: AnalystMessage = {
              id: metadata.messageId,
              role: 'assistant',
              content: deduplicatedContent,
              blocks: this.state.streamingBlocks,
              toolCalls: [],
              metadata: {
                usage: metadata.usage,
                timing: { startMs: 0, endMs: 0, totalMs: metadata.duration },
                steps: this.state.currentSteps.map((s) => ({
                  id: s.id,
                  description: s.description,
                  toolName: s.toolName,
                  status: s.status === 'running' ? 'success' : s.status,
                  duration: s.duration ?? 0,
                  summary: s.summary,
                  error: s.error,
                })),
                suggestions: resolvedSuggestions,
              },
              provider: 'gemini',
              toolCallCount: metadata.toolCallCount,
              createdAt: new Date().toISOString(),
            };
            this.state.messages = [...this.state.messages, assistantMsg];

            // Mark streaming as done so finally block doesn't create a duplicate partial message
            this.state.isStreaming = false;
          },
        },
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — just stop streaming
      } else {
        this.state.error = err.message ?? 'Stream failed';
      }
    } finally {
      // If onDone was never called but we have partial content, preserve it as a message
      if (this.state.isStreaming && (this.state.streamingNarrative || this.state.streamingBlocks.length > 0)) {
        const deduplicatedContent = deduplicateNarrative(this.state.streamingNarrative);
        const partialMsg: AnalystMessage = {
          id: `partial-${Date.now()}`,
          role: 'assistant',
          content: deduplicatedContent,
          blocks: this.state.streamingBlocks,
          toolCalls: [],
          metadata: {
            steps: this.state.currentSteps.map((s) => ({
              id: s.id,
              description: s.description,
              toolName: s.toolName,
              status: s.status === 'running' ? 'success' : s.status,
              duration: s.duration ?? 0,
              summary: s.summary,
              error: s.error,
            })),
            suggestions: this.state.suggestions,
          },
          provider: 'gemini',
          toolCallCount: 0,
          createdAt: new Date().toISOString(),
        };
        this.state.messages = [...this.state.messages, partialMsg];
      }

      // Always reset streaming state
      this.state.streamingNarrative = '';
      this.state.streamingBlocks = [];
      this.state.currentSteps = [];
      this.state.isStreaming = false;
      this.abortController = null;
    }
  }

  /**
   * Abort the current streaming request.
   */
  abort() {
    this.abortController?.abort();
    this.state.isStreaming = false;
  }

  /**
   * Load sessions for a project.
   */
  async loadSessions(projectId: string) {
    try {
      const { sessions } = await getSessions(projectId);
      this.state.sessions = sessions;
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    }
  }

  /**
   * Load a session's messages (latest page).
   */
  async loadSession(sessionId: string) {
    this.state.currentSessionId = sessionId;
    this.state.error = null;

    try {
      const res = await getMessages(sessionId);
      this.state.messages = res.messages;
      this.state.messagesTotalCount = res.totalCount;
      this.state.messagesOffset = res.offset;
      this.state.hasMoreMessages = res.offset > 0;

      // Rehydrate suggestions from last assistant message
      const lastAssistant = [...res.messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant?.metadata?.suggestions) {
        this.state.suggestions = lastAssistant.metadata.suggestions;
      } else if (lastAssistant?.content) {
        this.state.suggestions = inferSuggestionsFromNarrative(lastAssistant.content);
      } else {
        this.state.suggestions = [];
      }
    } catch (err: any) {
      this.state.error = err.message ?? 'Failed to load session';
    }
  }

  /**
   * Load older messages (previous page).
   */
  async loadMoreMessages() {
    if (this.state.isLoadingMore || !this.state.hasMoreMessages || !this.state.currentSessionId) {
      return;
    }

    this.state.isLoadingMore = true;

    try {
      const pageSize = 50;
      const newOffset = Math.max(this.state.messagesOffset - pageSize, 0);
      const res = await getMessages(this.state.currentSessionId, {
        limit: pageSize,
        offset: newOffset,
      });

      // Prepend older messages
      this.state.messages = [...res.messages, ...this.state.messages];
      this.state.messagesOffset = newOffset;
      this.state.hasMoreMessages = newOffset > 0;
    } catch (err: any) {
      console.error('Failed to load more messages:', err);
    } finally {
      this.state.isLoadingMore = false;
    }
  }

  /**
   * Delete a session and remove it from the list.
   */
  async deleteSession(sessionId: string) {
    try {
      await apiDeleteSession(sessionId);
      this.state.sessions = this.state.sessions.filter((s) => s.id !== sessionId);
      if (this.state.currentSessionId === sessionId) {
        this.startNewSession();
      }
    } catch (err: any) {
      console.error('Failed to delete session:', err);
    }
  }

  /**
   * Start a new session (clears messages and session ID).
   */
  startNewSession() {
    this.state.currentSessionId = null;
    this.state.messages = [];
    this.state.messagesTotalCount = 0;
    this.state.messagesOffset = 0;
    this.state.hasMoreMessages = false;
    this.state.streamingNarrative = '';
    this.state.streamingBlocks = [];
    this.state.currentSteps = [];
    this.state.suggestions = [];
    this.state.error = null;
    this.state.selectedLiteratureIds = [];
    this.state.selectedLiteratureItems = [];
    this.state.selectedResearchQuestionIds = [];
    this.state.selectedResearchQuestionItems = [];
  }

  setLiteratureScope(items: LiteratureScopeItem[]) {
    this.state.selectedLiteratureItems = items;
    this.state.selectedLiteratureIds = items.map((i) => i.id);
  }

  clearLiteratureScope() {
    this.state.selectedLiteratureItems = [];
    this.state.selectedLiteratureIds = [];
  }

  toggleLiteratureItem(item: LiteratureScopeItem) {
    const idx = this.state.selectedLiteratureIds.indexOf(item.id);
    if (idx >= 0) {
      this.state.selectedLiteratureItems = this.state.selectedLiteratureItems.filter((i) => i.id !== item.id);
      this.state.selectedLiteratureIds = this.state.selectedLiteratureIds.filter((id) => id !== item.id);
    } else {
      this.state.selectedLiteratureItems = [...this.state.selectedLiteratureItems, item];
      this.state.selectedLiteratureIds = [...this.state.selectedLiteratureIds, item.id];
    }
  }

  /**
   * Load available research questions for use in scope filtering.
   */
  setAvailableResearchQuestions(questions: ResearchQuestion[]) {
    this.state.availableResearchQuestions = questions
      .filter((q) => q.status !== 'archived')
      .map((q) => ({
        id: q.id,
        question: q.question,
        status: q.status,
        isParent: !q.parentQuestionId && (q.subQuestions?.length ?? 0) > 0,
      }));
  }

  setResearchQuestionScope(items: ResearchQuestionScopeItem[]) {
    this.state.selectedResearchQuestionItems = items;
    this.state.selectedResearchQuestionIds = items.map((i) => i.id);
  }

  clearResearchQuestionScope() {
    this.state.selectedResearchQuestionItems = [];
    this.state.selectedResearchQuestionIds = [];
  }

  toggleResearchQuestionItem(item: ResearchQuestionScopeItem) {
    const idx = this.state.selectedResearchQuestionIds.indexOf(item.id);
    if (idx >= 0) {
      this.state.selectedResearchQuestionItems = this.state.selectedResearchQuestionItems.filter((i) => i.id !== item.id);
      this.state.selectedResearchQuestionIds = this.state.selectedResearchQuestionIds.filter((id) => id !== item.id);
    } else {
      this.state.selectedResearchQuestionItems = [...this.state.selectedResearchQuestionItems, item];
      this.state.selectedResearchQuestionIds = [...this.state.selectedResearchQuestionIds, item.id];
    }
  }

  notifyArtifactSaved() {
    this.state.artifactSaveCount += 1;
  }
}

export const analystStore = new AnalystStore();
