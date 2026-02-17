import { debounce } from "$lib/utils/debounce";
import { projectStore } from "$lib/stores/ProjectStore";
import { api } from "$lib/services/api-client";
import {
  chatHistoryAPI,
  type ChatSession,
} from "$lib/services/chat-history-api";
import type { ContextSelectionItem } from "$lib/types/context";
import { _ } from "svelte-i18n";
import { get } from "svelte/store";

// Helper function to get translations
const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

export interface SearchResult {
  id: string;
  type:
    | "literature"
    | "note"
    | "project"
    | "outcome"
    | "model"
    | "keyword_analysis"
    | "research_question";
  title: string;
  snippet?: string;
  content?: any; // The actual content object from backend
  similarity: number;
  metadata?: {
    citation?: string;
    authors?: string[];
    year?: number;
    keywords?: string[];
    section_type?: string;
    created_at?: string;
    updated_at?: string;
    status?: string;
    alignmentScore?: number;
  };
  citation?: string;
  projectInfo?: {
    id: string;
    name: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SearchResult[];
  streaming?: boolean;
  metadata?: {
    tools_used?: string[];
    project_context?: boolean;
    context_selection?: ContextSelectionItem[];
    [key: string]: any;
  };
}

export interface SearchFilters {
  content_types: string[];
  projects: string[];
  date_range?: {
    start?: string;
    end?: string;
  };
  section_types: string[];
}

export interface CachedSearchResult {
  query: string;
  results: SearchResult[];
  timestamp: number;
  filters: SearchFilters;
}

export type SearchMode = "search" | "chat";
export type SearchScope = "current" | "all";
export type PaletteMode = "default" | "search" | "actions" | "chat";

export interface AutocompleteResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  keywords?: string[];
}

// Search cache with 5-minute TTL
class SearchCache {
  private cache = new Map<string, CachedSearchResult>();
  private maxSize = 50;

  set(key: string, value: CachedSearchResult) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get(key: string): CachedSearchResult | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 5 minute cache TTL
    if (Date.now() - item.timestamp > 5 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new SearchCache();

// Helper functions for localStorage
function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("globalSearch_recentSearches");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      "globalSearch_recentSearches",
      JSON.stringify(searches.slice(0, 10))
    );
  } catch (error) {
    console.error("Failed to save recent searches:", error);
  }
}

function getSearchLimit(searchQuery: string): number {
  const normalized = searchQuery.trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  // Single-term queries need a wider candidate pool to avoid missing obvious title matches.
  if (words.length <= 1) {
    return 50;
  }

  return Math.min(Math.max(words.length * 4, 12), 30);
}

function getResultRelevanceScore(result: SearchResult, normalizedQuery: string): number {
  const similarity = Number.isFinite(result.similarity) ? result.similarity : 0;

  if (!normalizedQuery) {
    return similarity;
  }

  const title = result.title?.toLowerCase().trim() || "";
  const snippet = result.snippet?.toLowerCase() || "";

  let lexicalBoost = 0;

  if (title === normalizedQuery) {
    lexicalBoost = 1.4;
  } else if (title.startsWith(normalizedQuery)) {
    lexicalBoost = 1.2;
  } else if (title.includes(normalizedQuery)) {
    lexicalBoost = 1.0;
  } else if (snippet.includes(normalizedQuery)) {
    lexicalBoost = 0.6;
  }

  return similarity + lexicalBoost;
}

// Create the store state
let query = $state("");
let mode = $state<SearchMode>("search");
let isOpen = $state(false);
let results = $state<SearchResult[]>([]);
let chatMessages = $state<ChatMessage[]>([]);
let chatContextSelection = $state<ContextSelectionItem[]>([]);
let isLoading = $state(false);
let isStreaming = $state(false);
let error = $state<string | null>(null);
let selectedIndex = $state(0);
let recentSearches = $state<string[]>([]);
let activeFilters = $state<SearchFilters>({
  content_types: [
    "literature",
    "note",
    "project",
    "outcome",
    "model",
    "keyword_analysis",
    "research_question",
  ],
  projects: [],
  section_types: [],
});

// Chat history state
let currentSession = $state<ChatSession | null>(null);
let chatHistorySessions = $state<ChatSession[]>([]);
let isLoadingHistory = $state(false);
let isSavingSession = $state(false);
let showChatHistory = $state(false);
let chatHistoryError = $state<string | null>(null);
let autoSaveEnabled = $state(true);
let lastSaveTime = $state<Date | null>(null);

// Command palette state
let paletteMode = $state<PaletteMode>("default");
let autocompleteResults = $state<AutocompleteResult[]>([]);
let isAutocompleting = $state(false);
let registeredActions = $state<QuickAction[]>([]);
let projectContext = $state<{ projectId: string; projectName: string } | null>(null);

// Derived states
const scope: SearchScope = $derived(projectContext !== null ? "current" : "all");
const hasResults = $derived(results.length > 0);
const hasActiveFilters = $derived(
  activeFilters.content_types.length < 7 ||
    activeFilters.projects.length > 0 ||
    activeFilters.section_types.length > 0 ||
    activeFilters.date_range?.start ||
    activeFilters.date_range?.end
);

// Chat history derived states
const hasCurrentSession = $derived(currentSession !== null);
const hasUnsavedChanges = $derived(
  currentSession &&
    chatMessages.length > 0 &&
    JSON.stringify(chatMessages) !== JSON.stringify(currentSession.messages)
);
const canSaveSession = $derived(chatMessages.length > 0 && !isSavingSession);
const sessionTitle = $derived(
  currentSession?.title || generateSessionTitle(chatMessages)
);

// Initialize recent searches
function initializeRecentSearches() {
  recentSearches = getRecentSearches();
}

// Get current project ID from URL or store
function getCurrentProjectId(): string | null {
  // First try to get from current project store
  if (projectStore.currentProject?.id) {
    return projectStore.currentProject.id;
  }

  // Try to extract from URL path like /project/:projectId
  if (typeof window !== "undefined") {
    const pathMatch = window.location.pathname.match(
      /\/project\/([a-f0-9-]{36})/i
    );
    if (pathMatch) {
      return pathMatch[1];
    }
  }

  return null;
}

function getContextItemProjectId(item: ContextSelectionItem): string | null {
  if (item.projectId) {
    return String(item.projectId);
  }

  const metadata = item.metadata || {};
  const direct = metadata.projectId ?? metadata.project_id;
  if (direct) {
    return String(direct);
  }

  const projectInfo = metadata.projectInfo ?? metadata.project_info ?? metadata.project;
  if (projectInfo?.id) {
    return String(projectInfo.id);
  }

  return null;
}

function isContextItemInProject(item: ContextSelectionItem, projectId: string): boolean {
  if (!projectId) {
    return false;
  }

  if (item.type === "project") {
    return item.id === projectId;
  }

  const itemProjectId = getContextItemProjectId(item);
  if (!itemProjectId) {
    return true;
  }

  return itemProjectId === projectId;
}

function filterContextSelectionForProject(
  items: ContextSelectionItem[],
  projectId: string | null
): ContextSelectionItem[] {
  if (!projectId) {
    return [];
  }

  return items.filter((item) => isContextItemInProject(item, projectId));
}

// Chat history helper functions
function generateSessionTitle(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "New Chat";
  }

  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    // Take first 50 characters of the first user message
    const title = firstUserMessage.content.slice(0, 50);
    return title.length < firstUserMessage.content.length
      ? title + "..."
      : title;
  }

  return "New Chat";
}

// Auto-save functionality with debounced saving
const debouncedAutoSave = debounce(async () => {
  if (!autoSaveEnabled || !canSaveSession || isSavingSession) return;

  try {
    await saveCurrentSession();
  } catch (error) {
    console.error("Auto-save failed:", error);
    chatHistoryError = "Failed to auto-save session";
  }
}, 2000); // Save 2 seconds after last change

// Load chat history from API
async function loadChatHistory(): Promise<void> {
  isLoadingHistory = true;
  chatHistoryError = null;

  try {
    const response = await chatHistoryAPI.getChatSessions({
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });

    chatHistorySessions = response.sessions;
  } catch (error) {
    console.error("Failed to load chat history:", error);
    chatHistoryError = "Failed to load chat history";
  } finally {
    isLoadingHistory = false;
  }
}

// Save current session
async function saveCurrentSession(): Promise<void> {
  if (!canSaveSession) return;

  isSavingSession = true;
  chatHistoryError = null;

  try {
    const projectId = getCurrentProjectId();
    const sessionData = await chatHistoryAPI.saveChatSession(
      currentSession?.id || null,
      chatMessages,
      projectId || undefined,
      {
        lastActivity: new Date().toISOString(),
        messageCount: chatMessages.length,
        projectName: projectStore.currentProject?.name,
      }
    );

    currentSession = sessionData;
    lastSaveTime = new Date();

    // Update the session in the history list
    if (sessionData?.id) {
      const existingIndex = chatHistorySessions.findIndex(
        (s) => s?.id === sessionData.id
      );
      if (existingIndex >= 0) {
        chatHistorySessions[existingIndex] = sessionData;
      } else {
        chatHistorySessions = [sessionData, ...chatHistorySessions];
      }
    }
  } catch (error) {
    console.error("Failed to save session:", error);

    // Handle different types of errors
    if (error instanceof Error) {
      if (
        error.message.includes("401") ||
        error.message.includes("Authentication")
      ) {
        console.warn(
          "Chat session auto-save requires authentication. Sessions will not be saved."
        );
        chatHistoryError = null; // Don't show error for auth issues
      } else {
        chatHistoryError = "Failed to save session";
      }
    } else {
      chatHistoryError = "Failed to save session";
    }
  } finally {
    isSavingSession = false;
  }
}

// Load a specific session
async function loadSession(sessionId: string): Promise<void> {
  chatHistoryError = null;

  try {
    const session = await chatHistoryAPI.getChatSession(sessionId);
    currentSession = session;
    chatMessages = session.messages || [];
    chatContextSelection = extractLatestContextSelection(chatMessages);

    // Update the session in the history list to mark it as recently accessed
    const existingIndex = chatHistorySessions.findIndex(
      (s) => s.id === sessionId
    );
    if (existingIndex >= 0) {
      const updatedSession = {
        ...chatHistorySessions[existingIndex],
        updatedAt: new Date().toISOString(),
      };
      chatHistorySessions.splice(existingIndex, 1);
      chatHistorySessions.unshift(updatedSession);
    }
  } catch (error) {
    console.error("Failed to load session:", error);
    chatHistoryError = "Failed to load session";
  }
}

// Create a new session
async function createNewSession(): Promise<void> {
  chatMessages = [];
  currentSession = null;
  chatHistoryError = null;
  chatContextSelection = [];

  // If there are any unsaved changes, they'll be lost
  // This is intentional for "New Chat" functionality
}

// Delete a session
async function deleteSession(sessionId: string): Promise<void> {
  try {
    await chatHistoryAPI.deleteChatSession(sessionId);

    // Remove from local list
    chatHistorySessions = chatHistorySessions.filter((s) => s.id !== sessionId);

    // If this was the current session, clear it
    if (currentSession?.id === sessionId) {
      currentSession = null;
      chatMessages = [];
    }
  } catch (error) {
    console.error("Failed to delete session:", error);
    chatHistoryError = "Failed to delete session";
  }
}

// Toggle star status of a session
async function toggleStarSession(sessionId: string): Promise<void> {
  try {
    const session = chatHistorySessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newStarStatus = !session.metadata?.isStarred;
    await chatHistoryAPI.toggleStarSession(sessionId, newStarStatus);

    // Update local state
    const index = chatHistorySessions.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      chatHistorySessions[index] = {
        ...chatHistorySessions[index],
        metadata: {
          ...chatHistorySessions[index].metadata,
          isStarred: newStarStatus,
        },
      };
    }
  } catch (error) {
    console.error("Failed to toggle star status:", error);
    chatHistoryError = "Failed to update session";
  }
}

// Search chat history
async function searchChatHistory(searchQuery: string): Promise<void> {
  if (!searchQuery.trim()) {
    await loadChatHistory();
    return;
  }

  isLoadingHistory = true;
  chatHistoryError = null;

  try {
    const response = await chatHistoryAPI.searchChatSessions(searchQuery, {
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });

    chatHistorySessions = response.sessions;
  } catch (error) {
    console.error("Failed to search chat history:", error);
    chatHistoryError = "Failed to search chat history";
  } finally {
    isLoadingHistory = false;
  }
}

// Search function
async function performSearch(searchQuery: string = query): Promise<void> {
  if (!searchQuery.trim()) {
    results = [];
    return;
  }

  // Get project ID from command palette context - only required for current project scope
  const projectId = projectContext?.projectId;
  if (scope === "current" && !projectId) {
    error = "Please set a project context in the command palette to search within current project";
    results = [];
    return;
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const dynamicLimit = getSearchLimit(searchQuery);

  // Check cache first
  const cacheKey = `${searchQuery}:${projectId}:${dynamicLimit}:${scope}:${JSON.stringify(
    activeFilters
  )}`;
  const cached = searchCache.get(cacheKey);

  if (cached) {
    results = cached.results;
    return;
  }

  isLoading = true;
  error = null;

  try {
    const requestBody: Record<string, unknown> = {
      query: searchQuery,
      mode: "search",
      scope,
      contentTypes: activeFilters.content_types,
      filters: {
        authors: activeFilters.projects, // This might need adjustment based on actual filter structure
        types: activeFilters.section_types,
        // Map other filters as needed
      },
      limit: dynamicLimit,
    };

    if (projectId) {
      requestBody.projectId = projectId;
    }

    const response = await api.stream(`/search`, {
      method: "POST",
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const allResults: SearchResult[] = Array.isArray(data.results) ? data.results : [];

    // Deduplicate and keep the strongest candidate per resource.
    const uniqueResults = new Map<string, SearchResult>();
    for (const result of allResults) {
      const key = `${result.type}:${result.id}`;
      const existing = uniqueResults.get(key);
      if (!existing || (result.similarity ?? 0) > (existing.similarity ?? 0)) {
        uniqueResults.set(key, result);
      }
    }

    const rankedResults = Array.from(uniqueResults.values()).sort((a, b) => {
      return getResultRelevanceScore(b, normalizedQuery) - getResultRelevanceScore(a, normalizedQuery);
    });

    results = rankedResults;

    // Cache the results
    searchCache.set(cacheKey, {
      query: searchQuery,
      results,
      timestamp: Date.now(),
      filters: { ...activeFilters },
    });

    // Add to recent searches
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      recentSearches = [searchQuery, ...recentSearches.slice(0, 9)];
      saveRecentSearches(recentSearches);
    }
  } catch (err) {
    console.error("Search error:", err);
    error = err instanceof Error ? err.message : "Search failed";
    results = [];
  } finally {
    isLoading = false;
  }
}

// Debounced search
const debouncedSearch = debounce(performSearch, 300);

// Chat functions
function mergeContextSelections(
  existing?: ContextSelectionItem[],
  incoming?: ContextSelectionItem[]
): ContextSelectionItem[] {
  const merged = new Map<string, ContextSelectionItem>();

  if (Array.isArray(existing)) {
    for (const item of existing) {
      if (!item?.id || !item?.type) continue;
      merged.set(`${item.type}:${item.id}`, { ...item });
    }
  }

  if (Array.isArray(incoming)) {
    for (const item of incoming) {
      if (!item?.id || !item?.type) continue;
      const key = `${item.type}:${item.id}`;
      const current = merged.get(key);
      if (current) {
        merged.set(key, {
          ...current,
          ...item,
          title: item.title || current.title,
          subtitle: item.subtitle || current.subtitle,
        });
      } else {
        merged.set(key, { ...item });
      }
    }
  }

  return Array.from(merged.values());
}

function extractLatestContextSelection(
  messages: ChatMessage[] | undefined | null
): ContextSelectionItem[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const selection = messages[index]?.metadata?.context_selection;
    if (Array.isArray(selection) && selection.length > 0) {
      return selection;
    }
  }

  return [];
}

function addContextSelection(item: ContextSelectionItem): void {
  const projectId = getCurrentProjectId();
  if (!projectId) {
    return;
  }

  if (!isContextItemInProject(item, projectId)) {
    return;
  }

  const exists = chatContextSelection.some(
    (existing) => existing.id === item.id && existing.type === item.type
  );
  if (exists) return;

  chatContextSelection = filterContextSelectionForProject(
    [...chatContextSelection, item],
    projectId
  );
}

function removeContextSelection(item: ContextSelectionItem): void {
  const projectId = getCurrentProjectId();
  chatContextSelection = filterContextSelectionForProject(
    chatContextSelection.filter(
      (existing) => !(existing.id === item.id && existing.type === item.type)
    ),
    projectId
  );
}

function clearContextSelection(): void {
  chatContextSelection = [];
}

async function sendChatMessage(message: string): Promise<void> {
  if (!message.trim() || isStreaming) return;

  // Get current project ID from command palette context
  const projectId = projectContext?.projectId;
  if (!projectId) {
    error = "Please select a project context to use AI chat";
    return;
  }

  chatContextSelection = filterContextSelectionForProject(
    chatContextSelection,
    projectId
  );

  const effectiveSelection = chatContextSelection;
  const userMetadata =
    effectiveSelection.length > 0
      ? { context_selection: effectiveSelection }
      : undefined;

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: "user",
    content: message,
    timestamp: new Date(),
    ...(userMetadata ? { metadata: userMetadata } : {}),
  };

  chatMessages = [...chatMessages, userMessage];
  isStreaming = true;
  error = null;

  try {
    const response = await api.stream(`/search`, {
      method: "POST",
      body: {
        query: message,
        mode: "chat",
        projectId,
        scope: "current",
        provider: "openai", // Default to OpenAI
        context: {
          ...(results.length > 0 ? { searchResults: results } : {}),
          ...(chatMessages.length > 0
            ? { chatHistory: chatMessages.slice(-10) }
            : {}), // Include last 10 messages for context
        },
        contextSelection: effectiveSelection.map(
          ({ id, type, title, subtitle, projectId: itemProjectId }) => ({
            id,
            type,
            ...(title ? { title } : {}),
            ...(subtitle ? { subtitle } : {}),
            ...(itemProjectId ? { projectId: itemProjectId } : {}),
          })
        ),
      },
    });

    if (!response.ok) {
      let errorMessage = `Chat failed: ${response.statusText}`;

      // Try to get more specific error from response body
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // If we can't parse the error response, use the default message
        console.warn("Could not parse error response:", parseError);
      }

      throw new Error(errorMessage);
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      streaming: true, // This shows "AI is thinking..." until content arrives
      metadata: {
        project_context: true,
        ...(effectiveSelection.length > 0
          ? { context_selection: effectiveSelection }
          : {}),
      },
    };

    chatMessages = [...chatMessages, assistantMessage];

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() === "") continue; // Skip empty lines

          if (line.startsWith("data: ")) {
            const sseData = line.slice(6).trim();

            // Skip the [DONE] marker
            if (sseData === "[DONE]") {
              continue;
            }

            try {
              const data = JSON.parse(sseData);
              let shouldSync = false;

              if (data.content) {
                assistantMessage.content += data.content;
                shouldSync = true;
              }

              if (data.sources) {
                assistantMessage.sources = data.sources;
                shouldSync = true;
              }

              if (data.type === "metadata") {
                const existingMeta = assistantMessage.metadata || {};
                const mergedSelection = mergeContextSelections(
                  existingMeta.context_selection,
                  data.context_selection
                );

                assistantMessage.metadata = {
                  ...existingMeta,
                  ...(Array.isArray(data.tools_used)
                    ? { tools_used: data.tools_used }
                    : {}),
                };

                if (data.project_context !== undefined) {
                  assistantMessage.metadata.project_context = data.project_context;
                }

                if (data.context_selection !== undefined) {
                  if (
                    Array.isArray(data.context_selection) &&
                    data.context_selection.length > 0
                  ) {
                    assistantMessage.metadata.context_selection = data.context_selection;
                  } else {
                    delete assistantMessage.metadata.context_selection;
                  }
                } else if (mergedSelection.length > 0) {
                  assistantMessage.metadata.context_selection = mergedSelection;
                }

                shouldSync = true;
              }

              if (shouldSync) {
                const messageIndex = chatMessages.findIndex(
                  (m) => m.id === assistantMessage.id
                );
                if (messageIndex >= 0) {
                  chatMessages[messageIndex] = { ...assistantMessage };
                  chatMessages = [...chatMessages];
                }
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e, "Line:", sseData);
            }
          }
        }
      }
    }
    // Mark streaming as complete and force final update
    assistantMessage.streaming = false;
    const messageIndex = chatMessages.findIndex(
      (m) => m.id === assistantMessage.id
    );
    if (messageIndex >= 0) {
      chatMessages[messageIndex] = { ...assistantMessage };
      chatMessages = [...chatMessages];
    }
    isStreaming = false;

    // Trigger auto-save after successful message exchange
    if (autoSaveEnabled) {
      debouncedAutoSave();
    }
  } catch (err) {
    console.error("Chat error:", err);
    error = err instanceof Error ? err.message : "Chat failed";

    // Remove the streaming message and add error
    chatMessages = chatMessages.slice(0, -1);
    const errorMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "I apologize, but I encountered an error processing your request. Please try again.",
      timestamp: new Date(),
    };
    chatMessages = [...chatMessages, errorMessage];
  } finally {
    isStreaming = false;
  }
}

// Autocomplete function
async function performAutocomplete(q: string): Promise<void> {
  if (!q.trim() || q.trim().length < 2) {
    autocompleteResults = [];
    return;
  }

  const projectId = projectContext?.projectId;

  isAutocompleting = true;

  try {
    const requestBody: Record<string, unknown> = {
      query: q,
      scope,
    };
    if (projectId) {
      requestBody.projectId = projectId;
    }

    const response = await api.stream(`/search/autocomplete`, {
      method: "POST",
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`Autocomplete failed: ${response.statusText}`);
    }

    const data = await response.json();
    autocompleteResults = data.results || [];
  } catch (err) {
    console.error("Autocomplete error:", err);
    autocompleteResults = [];
  } finally {
    isAutocompleting = false;
  }
}

// Debounced autocomplete (150ms)
const debouncedAutocomplete = debounce(performAutocomplete, 150);

// Action registry
function registerActions(actions: QuickAction[]): void {
  registeredActions = actions;
}

function getFilteredActions(q: string): QuickAction[] {
  if (!q.trim()) return registeredActions;
  const lower = q.toLowerCase();
  return registeredActions.filter(
    (a) =>
      a.label.toLowerCase().includes(lower) ||
      a.keywords?.some((k) => k.toLowerCase().includes(lower))
  );
}

function setPaletteMode(newMode: PaletteMode): void {
  paletteMode = newMode;
}

function setProjectContext(projectId: string, projectName: string): void {
  projectContext = { projectId, projectName };
}

function clearProjectContext(): void {
  projectContext = null;
}

// Store interface
export const globalSearchStore = {
  // Getters
  get query() {
    return query;
  },
  get mode() {
    return mode;
  },
  get scope() {
    return scope;
  },
  get isOpen() {
    return isOpen;
  },
  get results() {
    return results;
  },
  get chatMessages() {
    return chatMessages;
  },
  get contextSelection() {
    return chatContextSelection;
  },
  get isLoading() {
    return isLoading;
  },
  get isStreaming() {
    return isStreaming;
  },
  get error() {
    return error;
  },
  get selectedIndex() {
    return selectedIndex;
  },
  get recentSearches() {
    return recentSearches;
  },
  get activeFilters() {
    return activeFilters;
  },
  get hasResults() {
    return hasResults;
  },
  get hasActiveFilters() {
    return hasActiveFilters;
  },

  // Chat history getters
  get currentSession() {
    return currentSession;
  },
  get chatHistorySessions() {
    return chatHistorySessions;
  },
  get isLoadingHistory() {
    return isLoadingHistory;
  },
  get isSavingSession() {
    return isSavingSession;
  },
  get showChatHistory() {
    return showChatHistory;
  },
  get chatHistoryError() {
    return chatHistoryError;
  },
  get autoSaveEnabled() {
    return autoSaveEnabled;
  },
  get lastSaveTime() {
    return lastSaveTime;
  },
  get hasCurrentSession() {
    return hasCurrentSession;
  },
  get hasUnsavedChanges() {
    return hasUnsavedChanges;
  },
  get canSaveSession() {
    return canSaveSession;
  },
  get sessionTitle() {
    return sessionTitle;
  },

  // Command palette getters
  get paletteMode() {
    return paletteMode;
  },
  get autocompleteResults() {
    return autocompleteResults;
  },
  get isAutocompleting() {
    return isAutocompleting;
  },
  get registeredActions() {
    return registeredActions;
  },
  get projectContext() {
    return projectContext;
  },

  // Actions
  open() {
    isOpen = true;
    if (recentSearches.length === 0) {
      initializeRecentSearches();
    }
  },

  close() {
    isOpen = false;
    if (isStreaming) {
      // Cancel any ongoing streams
      isStreaming = false;
    }
  },

  setMode(newMode: SearchMode) {
    mode = newMode;
    error = null;
  },

  setQuery(newQuery: string) {
    query = newQuery;
    if (mode === "search" && newQuery.trim().length >= 2) {
      debouncedSearch();
    } else if (newQuery.trim().length < 2) {
      results = [];
    }
  },

  clearQuery() {
    query = "";
    results = [];
  },

  performSearch: performSearch,

  sendChatMessage: sendChatMessage,

  addContextSelection,
  removeContextSelection,
  clearContextSelection,

  setFilters(newFilters: Partial<SearchFilters>) {
    activeFilters = { ...activeFilters, ...newFilters };
    if (query.trim()) {
      debouncedSearch();
    }
  },

  clearFilters() {
    activeFilters = {
      content_types: [
        "literature",
        "note",
        "project",
        "outcome",
        "model",
        "keyword_analysis",
      ],
      projects: [],
      section_types: [],
    };
    if (query.trim()) {
      debouncedSearch();
    }
  },

  selectNext() {
    if (selectedIndex < results.length - 1) {
      selectedIndex++;
    }
  },

  selectPrevious() {
    if (selectedIndex > 0) {
      selectedIndex--;
    }
  },

  clearCache() {
    searchCache.clear();
  },

  clearChatHistory() {
    chatMessages = [];
    chatContextSelection = [];
  },

  // Chat history methods
  async loadChatHistory() {
    await loadChatHistory();
  },

  async saveCurrentSession() {
    await saveCurrentSession();
  },

  async loadSession(sessionId: string) {
    await loadSession(sessionId);
  },

  async createNewSession() {
    await createNewSession();
  },

  async deleteSession(sessionId: string) {
    await deleteSession(sessionId);
  },

  async toggleStarSession(sessionId: string) {
    await toggleStarSession(sessionId);
  },

  async searchChatHistory(searchQuery: string) {
    await searchChatHistory(searchQuery);
  },

  toggleChatHistory() {
    showChatHistory = !showChatHistory;
    if (showChatHistory && chatHistorySessions.length === 0) {
      loadChatHistory();
    }
  },

  setChatHistoryVisibility(visible: boolean) {
    showChatHistory = visible;
    if (visible && chatHistorySessions.length === 0) {
      loadChatHistory();
    }
  },

  setAutoSave(enabled: boolean) {
    autoSaveEnabled = enabled;
  },

  clearChatHistoryError() {
    chatHistoryError = null;
  },

  // Command palette methods
  performAutocomplete: debouncedAutocomplete,
  setPaletteMode,
  registerActions,
  getFilteredActions,
  setProjectContext,
  clearProjectContext,
};
