import { api } from '$lib/services/api-client';

// Types for artifacts
export type ArtifactType = 'comparison' | 'gap_analysis' | 'theme_cluster' | 'timeline' | 'summary' | 'discussion';

export interface DiscussionMessageContent {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ id: string; title: string; authors?: string }>;
}

export interface ArtifactContent {
  summary: string;
  key_findings?: string[];
  detailed_analysis?: string;
  contradictions?: string[];
  limitations?: string[];
  // For discussion artifacts
  discussionMessages?: DiscussionMessageContent[];
  discussionSessionId?: string;
}

export interface SourceUsed {
  id: string;
  title: string;
  authors: string;
  relevance: number;
}

export interface Artifact {
  id: string;
  projectId: string;
  userId: string;
  type: ArtifactType;
  title: string;
  description: string | null;
  content: ArtifactContent;
  visualizationData: unknown | null;
  sourceQuery: string | null;
  contextSnapshot: { sourceIds: string[]; contentTypes: string[] } | null;
  coverageScore: number | null;
  isPinned: boolean;
  isStale?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommandResponse {
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
  visualizationData: unknown | null;
  sourcesUsed: SourceUsed[];
  coverageScore: number;
  suggestedFollowups: string[];
}

export interface DailyBriefing {
  changesSummary: string;
  detectedPatterns: string[];
  suggestedActions: { action: string; impact: 'high' | 'medium' | 'low' }[];
  lastVisit: string;
}

export interface HistoricalBriefing {
  id: string;
  date: string;
  changesSummary: string;
  detectedPatterns: string[];
  suggestedActions: { action: string; impact: 'high' | 'medium' | 'low' }[];
  createdAt: string;
}

export type SourceCategory = 'literature' | 'notes' | 'outcomes' | 'models' | 'artifacts';

export interface SourceItem {
  id: string;
  name: string;
  subtitle?: string;
}

export interface SourceCounts {
  literature: number;
  notes: number;
  outcomes: number;
  models: number;
  artifacts: number;
  total: number;
}

export interface SourceItems {
  literature: SourceItem[];
  notes: SourceItem[];
  outcomes: SourceItem[];
  models: SourceItem[];
  artifacts: SourceItem[];
}

export interface ContextScope {
  // Category toggles (true = include all from this category)
  categories: Record<SourceCategory, boolean>;
  // Specific item IDs when doing individual selection
  specificIds: Record<SourceCategory, string[]>;
  // Computed totals
  itemCount: number;
  // Source data
  counts: SourceCounts;
  items: SourceItems;
}

export interface CommandHistoryItem {
  id: string;
  projectId: string;
  userId: string;
  query: string;
  intent: string | null;
  contextIds: string[] | null;
  responseType: string | null;
  artifactId: string | null;
  createdAt: string;
}

// Discussion mode types
export type QueryMode = 'artifact' | 'discussion';

export interface DiscussionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourcesUsed?: SourceUsed[];
}

export interface DiscussionSession {
  sessionId: string;
  projectId: string;
  messages: DiscussionMessage[];
}

export interface QueryClassification {
  type: QueryMode;
  artifactIntent?: ArtifactType;
  confidence: number;
}

interface CommandCenterState {
  // Artifacts state
  artifacts: Record<string, Artifact[]>; // projectId -> artifacts
  artifactsLoading: Record<string, boolean>;
  artifactsError: Record<string, string | null>;

  // Current response (before saving as artifact)
  currentResponse: CommandResponse | null;
  currentQuery: string;
  commandLoading: boolean;
  commandError: string | null;

  // Discussion mode state
  currentMode: QueryMode;
  discussionSession: DiscussionSession | null;
  discussionLoading: boolean;
  discussionError: string | null;
  streamingContent: string;
  routingSuggestion: QueryClassification | null;

  // Daily briefing state
  dailyBriefing: Record<string, DailyBriefing | null>; // projectId -> briefing
  briefingLoading: Record<string, boolean>;
  needsBriefing: Record<string, boolean>;

  // Context scope
  contextScope: ContextScope;

  // Command history
  commandHistory: Record<string, CommandHistoryItem[]>; // projectId -> history
}

class CommandCenterStore {
  private state = $state<CommandCenterState>({
    artifacts: {},
    artifactsLoading: {},
    artifactsError: {},
    currentResponse: null,
    currentQuery: '',
    commandLoading: false,
    commandError: null,
    // Discussion state
    currentMode: 'artifact',
    discussionSession: null,
    discussionLoading: false,
    discussionError: null,
    streamingContent: '',
    routingSuggestion: null,
    // Daily briefing state
    dailyBriefing: {},
    briefingLoading: {},
    needsBriefing: {},
    contextScope: {
      categories: {
        literature: true,
        notes: true,
        outcomes: true,
        models: true,
        artifacts: true,
      },
      specificIds: {
        literature: [],
        notes: [],
        outcomes: [],
        models: [],
        artifacts: [],
      },
      itemCount: 0,
      counts: {
        literature: 0,
        notes: 0,
        outcomes: 0,
        models: 0,
        artifacts: 0,
        total: 0,
      },
      items: {
        literature: [],
        notes: [],
        outcomes: [],
        models: [],
        artifacts: [],
      },
    },
    commandHistory: {},
  });

  // =====================================================
  // Getters
  // =====================================================

  getArtifacts(projectId: string): Artifact[] {
    return this.state.artifacts[projectId] || [];
  }

  isArtifactsLoading(projectId: string): boolean {
    return this.state.artifactsLoading[projectId] || false;
  }

  getArtifactsError(projectId: string): string | null {
    return this.state.artifactsError[projectId] || null;
  }

  get currentResponse(): CommandResponse | null {
    return this.state.currentResponse;
  }

  get currentQuery(): string {
    return this.state.currentQuery;
  }

  get commandLoading(): boolean {
    return this.state.commandLoading;
  }

  get commandError(): string | null {
    return this.state.commandError;
  }

  getDailyBriefing(projectId: string): DailyBriefing | null {
    return this.state.dailyBriefing[projectId] || null;
  }

  isBriefingLoading(projectId: string): boolean {
    return this.state.briefingLoading[projectId] || false;
  }

  needsBriefing(projectId: string): boolean {
    return this.state.needsBriefing[projectId] !== false;
  }

  get contextScope(): ContextScope {
    return this.state.contextScope;
  }

  getCommandHistory(projectId: string): CommandHistoryItem[] {
    return this.state.commandHistory[projectId] || [];
  }

  // Discussion mode getters
  get currentMode(): QueryMode {
    return this.state.currentMode;
  }

  get discussionSession(): DiscussionSession | null {
    return this.state.discussionSession;
  }

  get discussionLoading(): boolean {
    return this.state.discussionLoading;
  }

  get discussionError(): string | null {
    return this.state.discussionError;
  }

  get streamingContent(): string {
    return this.state.streamingContent;
  }

  get routingSuggestion(): QueryClassification | null {
    return this.state.routingSuggestion;
  }

  // =====================================================
  // Discussion Mode Actions
  // =====================================================

  setMode(mode: QueryMode): void {
    this.state.currentMode = mode;
    // Clear current response when switching modes
    if (mode === 'discussion') {
      this.state.currentResponse = null;
    } else {
      this.state.discussionSession = null;
      this.state.streamingContent = '';
    }
  }

  toggleMode(): void {
    this.setMode(this.state.currentMode === 'artifact' ? 'discussion' : 'artifact');
  }

  dismissRoutingSuggestion(): void {
    this.state.routingSuggestion = null;
  }

  clearDiscussionSession(): void {
    this.state.discussionSession = null;
    this.state.streamingContent = '';
    this.state.discussionError = null;
  }

  async routeQuery(query: string): Promise<QueryClassification | null> {
    try {
      const result = await api.post<QueryClassification>('/command/route', { query });
      this.state.routingSuggestion = result;
      return result;
    } catch (error) {
      console.error('Error routing query:', error);
      return null;
    }
  }

  async processDiscussion(query: string, projectId: string): Promise<void> {
    this.state.discussionLoading = true;
    this.state.discussionError = null;
    this.state.streamingContent = '';

    // Add user message immediately
    const userMessage: DiscussionMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    if (this.state.discussionSession) {
      // Create new object reference to trigger reactivity
      this.state.discussionSession = {
        ...this.state.discussionSession,
        messages: [...this.state.discussionSession.messages, userMessage],
      };
    } else {
      this.state.discussionSession = {
        sessionId: '',
        projectId,
        messages: [userMessage],
      };
    }

    try {
      const contextForApi = this.getContextForApi();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/command/discuss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query,
          projectId,
          discussionSessionId: this.state.discussionSession?.sessionId || undefined,
          ...contextForApi,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start discussion');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let sessionId = this.state.discussionSession?.sessionId || '';
      let sources: SourceUsed[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('[CommandCenterStore] SSE parsed:', parsed.type, parsed.type === 'content' ? parsed.content?.length : '');

              if (parsed.type === 'metadata') {
                sessionId = parsed.discussionSessionId || sessionId;
                sources = parsed.sources || [];
                console.log('[CommandCenterStore] Metadata received, sessionId:', sessionId, 'sources:', sources.length);
                if (this.state.discussionSession) {
                  // Create new object reference to trigger reactivity
                  this.state.discussionSession = {
                    ...this.state.discussionSession,
                    sessionId,
                  };
                }
              } else if (parsed.type === 'content') {
                assistantContent += parsed.content;
                this.state.streamingContent = assistantContent;
              }
            } catch (e) {
              console.warn('[CommandCenterStore] SSE parse error for:', data, e);
            }
          }
        }
      }

      // Add assistant message to discussion
      console.log('[CommandCenterStore] Final assistant content length:', assistantContent.length);
      console.log('[CommandCenterStore] Final sessionId:', sessionId);

      const assistantMessage: DiscussionMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        sourcesUsed: sources,
      };

      if (this.state.discussionSession) {
        // Create new object reference to trigger reactivity
        this.state.discussionSession = {
          ...this.state.discussionSession,
          messages: [...this.state.discussionSession.messages, assistantMessage],
        };
        console.log('[CommandCenterStore] Added assistant message, total messages:', this.state.discussionSession.messages.length);
      }

      this.state.streamingContent = '';
    } catch (error) {
      console.error('Error processing discussion:', error);
      this.state.discussionError = error instanceof Error ? error.message : 'Discussion failed';
    } finally {
      this.state.discussionLoading = false;
    }
  }

  async extractArtifactFromDiscussion(projectId: string): Promise<Artifact | null> {
    console.log('[CommandCenterStore] extractArtifactFromDiscussion called');
    console.log('[CommandCenterStore] sessionId:', this.state.discussionSession?.sessionId);
    console.log('[CommandCenterStore] projectId:', projectId);

    // Check for valid sessionId - must exist and not be empty string
    const sessionId = this.state.discussionSession?.sessionId;
    if (!sessionId || sessionId === '') {
      console.error('No discussion session to extract from - sessionId is empty or missing');
      return null;
    }

    try {
      // This endpoint now auto-saves the artifact and returns the saved artifact
      const artifact = await api.post<Artifact>('/command/extract-artifact', {
        discussionSessionId: sessionId,
        projectId,
      });

      // Add the new artifact to the local state
      if (!this.state.artifacts[projectId]) {
        this.state.artifacts[projectId] = [];
      }
      this.state.artifacts[projectId] = [artifact, ...this.state.artifacts[projectId]];

      // Clear discussion session after successful extraction
      this.clearDiscussionSession();

      return artifact;
    } catch (error) {
      console.error('Error extracting artifact:', error);
      throw error; // Re-throw so caller can handle
    }
  }

  // =====================================================
  // Artifact Actions
  // =====================================================

  async loadArtifacts(projectId: string): Promise<void> {
    this.state.artifactsLoading[projectId] = true;
    this.state.artifactsError[projectId] = null;

    try {
      const response = await api.get(`/artifacts?projectId=${projectId}`);
      // API returns data directly or {data: [...]} for paginated results
      this.state.artifacts[projectId] = response.data || response || [];
    } catch (error) {
      console.error('Load artifacts error:', error);
      this.state.artifactsError[projectId] =
        error instanceof Error ? error.message : 'Failed to load artifacts';
      // Initialize empty array on error so UI doesn't break
      if (!this.state.artifacts[projectId]) {
        this.state.artifacts[projectId] = [];
      }
    } finally {
      this.state.artifactsLoading[projectId] = false;
    }
  }

  async processCommand(query: string, projectId: string): Promise<CommandResponse | null> {
    this.state.commandLoading = true;
    this.state.commandError = null;
    this.state.currentQuery = query;

    try {
      const contextForApi = this.getContextForApi();
      const response = await api.post('/command', {
        query,
        projectId,
        ...contextForApi,
      });

      this.state.currentResponse = response;
      return response;
    } catch (error) {
      console.error('Command processing error:', error);
      this.state.commandError =
        error instanceof Error ? error.message : 'Failed to process command';
      return null;
    } finally {
      this.state.commandLoading = false;
    }
  }

  async saveArtifact(projectId: string): Promise<Artifact | null> {
    if (!this.state.currentResponse) {
      console.error('No current response to save');
      return null;
    }

    try {
      const contextForApi = this.getContextForApi();
      const artifact = await api.post('/artifacts', {
        commandResponse: this.state.currentResponse,
        query: this.state.currentQuery,
        projectId,
        ...contextForApi,
      });

      // Add to local state
      if (!this.state.artifacts[projectId]) {
        this.state.artifacts[projectId] = [];
      }
      this.state.artifacts[projectId] = [artifact, ...this.state.artifacts[projectId]];

      // Clear current response
      this.state.currentResponse = null;
      this.state.currentQuery = '';

      return artifact;
    } catch (error) {
      console.error('Save artifact error:', error);
      return null;
    }
  }

  async getArtifact(artifactId: string): Promise<Artifact | null> {
    try {
      return await api.get(`/artifacts/${artifactId}`);
    } catch (error) {
      console.error('Get artifact error:', error);
      return null;
    }
  }

  async updateArtifact(
    artifactId: string,
    updates: { title?: string; isPinned?: boolean }
  ): Promise<Artifact | null> {
    try {
      const artifact = await api.put(`/artifacts/${artifactId}`, updates);

      // Update local state
      Object.keys(this.state.artifacts).forEach((projectId) => {
        this.state.artifacts[projectId] = this.state.artifacts[projectId].map((a) =>
          a.id === artifactId ? artifact : a
        );
      });

      return artifact;
    } catch (error) {
      console.error('Update artifact error:', error);
      return null;
    }
  }

  async deleteArtifact(artifactId: string): Promise<boolean> {
    try {
      await api.delete(`/artifacts/${artifactId}`);

      // Remove from local state
      Object.keys(this.state.artifacts).forEach((projectId) => {
        this.state.artifacts[projectId] = this.state.artifacts[projectId].filter(
          (a) => a.id !== artifactId
        );
      });

      // Update context scope counts
      if (this.state.contextScope.counts.artifacts > 0) {
        this.state.contextScope.counts.artifacts--;
        this.state.contextScope.counts.total--;
      }

      return true;
    } catch (error) {
      console.error('Delete artifact error:', error);
      return false;
    }
  }

  async regenerateArtifact(artifactId: string): Promise<Artifact | null> {
    try {
      const artifact = await api.post(`/artifacts/${artifactId}/regenerate`);

      // Update local state
      Object.keys(this.state.artifacts).forEach((projectId) => {
        this.state.artifacts[projectId] = this.state.artifacts[projectId].map((a) =>
          a.id === artifactId ? artifact : a
        );
      });

      return artifact;
    } catch (error) {
      console.error('Regenerate artifact error:', error);
      return null;
    }
  }

  dismissCurrentResponse(): void {
    this.state.currentResponse = null;
    this.state.currentQuery = '';
  }

  // =====================================================
  // Daily Briefing Actions
  // =====================================================

  async checkBriefing(projectId: string): Promise<{ needsBriefing: boolean; cachedBriefing: DailyBriefing | null }> {
    try {
      const response = await api.get(`/command-center/check-briefing?projectId=${projectId}`);

      this.state.needsBriefing[projectId] = response.needsBriefing;
      if (response.cachedBriefing) {
        this.state.dailyBriefing[projectId] = response.cachedBriefing;
      }
      return response;
    } catch (error) {
      console.error('Check briefing error:', error);
      return { needsBriefing: true, cachedBriefing: null };
    }
  }

  async generateBriefing(projectId: string): Promise<DailyBriefing | null> {
    this.state.briefingLoading[projectId] = true;

    try {
      const response = await api.post('/command-center/generate-briefing', { projectId });

      this.state.dailyBriefing[projectId] = response;
      this.state.needsBriefing[projectId] = false;
      return response;
    } catch (error) {
      console.error('Generate briefing error:', error);
      return null;
    } finally {
      this.state.briefingLoading[projectId] = false;
    }
  }

  dismissBriefing(projectId: string): void {
    this.state.dailyBriefing[projectId] = null;
    this.state.needsBriefing[projectId] = false;
  }

  async getBriefingHistory(projectId: string, limit: number = 30): Promise<HistoricalBriefing[]> {
    try {
      const response = await api.get(`/command-center/briefing-history?projectId=${projectId}&limit=${limit}`);
      return response.briefings || [];
    } catch (error) {
      console.error('Get briefing history error:', error);
      return [];
    }
  }

  // =====================================================
  // Context Scope Actions
  // =====================================================

  async loadContextSources(projectId: string): Promise<void> {
    try {
      const response = await api.get(`/projects/${projectId}/context-sources`);

      this.state.contextScope.counts = response.counts;
      this.state.contextScope.items = response.items;
      this.updateItemCount();
    } catch (error) {
      console.error('Load context sources error:', error);
    }
  }

  setCategoryEnabled(category: SourceCategory, enabled: boolean): void {
    this.state.contextScope.categories[category] = enabled;
    this.updateItemCount();
  }

  setSpecificIds(category: SourceCategory, ids: string[]): void {
    this.state.contextScope.specificIds[category] = ids;
    this.updateItemCount();
  }

  toggleAllSources(): void {
    const allEnabled = Object.values(this.state.contextScope.categories).every(v => v);

    // Clear all specific selections
    this.state.contextScope.specificIds = {
      literature: [],
      notes: [],
      outcomes: [],
      models: [],
      artifacts: [],
    };

    // Toggle all categories
    const newValue = !allEnabled;
    this.state.contextScope.categories = {
      literature: newValue,
      notes: newValue,
      outcomes: newValue,
      models: newValue,
      artifacts: newValue,
    };

    this.updateItemCount();
  }

  private updateItemCount(): void {
    let count = 0;
    const { categories, specificIds, counts } = this.state.contextScope;

    for (const cat of Object.keys(categories) as SourceCategory[]) {
      if (specificIds[cat].length > 0) {
        count += specificIds[cat].length;
      } else if (categories[cat]) {
        count += counts[cat];
      }
    }

    this.state.contextScope.itemCount = count;
  }

  // Map frontend category names to backend content type names
  private categoryToContentType: Record<SourceCategory, string> = {
    literature: 'literature',
    notes: 'note',
    outcomes: 'outcome',
    models: 'model',
    artifacts: 'artifact',
  };

  // Get content types and source selections for API calls
  getContextForApi(): { contentTypes: string[]; sourceSelections?: { id: string; type: string }[] } {
    const { categories, specificIds } = this.state.contextScope;
    const contentTypes: string[] = [];
    const sourceSelections: { id: string; type: string }[] = [];

    for (const cat of Object.keys(categories) as SourceCategory[]) {
      const backendType = this.categoryToContentType[cat];
      if (specificIds[cat].length > 0) {
        // Add typed selections for each specific ID
        specificIds[cat].forEach((id) => sourceSelections.push({ id, type: backendType }));
        contentTypes.push(backendType);
      } else if (categories[cat]) {
        contentTypes.push(backendType);
      }
    }

    return {
      contentTypes,
      sourceSelections: sourceSelections.length > 0 ? sourceSelections : undefined,
    };
  }

  setContextScope(scope: Partial<ContextScope>): void {
    this.state.contextScope = { ...this.state.contextScope, ...scope };
  }

  updateContextItemCount(count: number): void {
    this.state.contextScope.itemCount = count;
  }

  // =====================================================
  // Command History Actions
  // =====================================================

  async loadCommandHistory(projectId: string): Promise<void> {
    try {
      const response = await api.get(`/command-history?projectId=${projectId}`);
      // API returns data directly or {data: [...]} for paginated results
      this.state.commandHistory[projectId] = response.data || response || [];
    } catch (error) {
      console.error('Load command history error:', error);
      // Initialize empty array on error
      if (!this.state.commandHistory[projectId]) {
        this.state.commandHistory[projectId] = [];
      }
    }
  }

  // =====================================================
  // Session Actions
  // =====================================================

  async updateSession(projectId: string): Promise<void> {
    try {
      await api.post('/command-center/update-session', { projectId });
    } catch (error) {
      console.error('Update session error:', error);
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  clearProjectState(projectId: string): void {
    delete this.state.artifacts[projectId];
    delete this.state.artifactsLoading[projectId];
    delete this.state.artifactsError[projectId];
    delete this.state.dailyBriefing[projectId];
    delete this.state.briefingLoading[projectId];
    delete this.state.needsBriefing[projectId];
    delete this.state.commandHistory[projectId];
  }

  clearAll(): void {
    this.state.artifacts = {};
    this.state.artifactsLoading = {};
    this.state.artifactsError = {};
    this.state.currentResponse = null;
    this.state.currentQuery = '';
    this.state.commandLoading = false;
    this.state.commandError = null;
    this.state.dailyBriefing = {};
    this.state.briefingLoading = {};
    this.state.needsBriefing = {};
    this.state.contextScope = {
      categories: {
        literature: true,
        notes: true,
        outcomes: true,
        models: true,
        artifacts: true,
      },
      specificIds: {
        literature: [],
        notes: [],
        outcomes: [],
        models: [],
        artifacts: [],
      },
      itemCount: 0,
      counts: {
        literature: 0,
        notes: 0,
        outcomes: 0,
        models: 0,
        artifacts: 0,
        total: 0,
      },
      items: {
        literature: [],
        notes: [],
        outcomes: [],
        models: [],
        artifacts: [],
      },
    };
    this.state.commandHistory = {};
  }
}

// Export singleton instance
export const commandCenterStore = new CommandCenterStore();
