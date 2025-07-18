import { debounce } from '$lib/utils/debounce';
import { API_BASE_URL } from '$lib/config';
import { projectStore } from '$lib/stores/ProjectStore.svelte';
import { chatHistoryAPI, type ChatSession, type ChatHistoryAPIError } from '$lib/services/chat-history-api';

export interface SearchResult {
  id: string;
  type: 'literature' | 'note' | 'project' | 'outcome' | 'model';
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
  };
  citation?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SearchResult[];
  streaming?: boolean;
  metadata?: {
    tools_used?: string[];
    project_context?: boolean;
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
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('globalSearch_recentSearches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('globalSearch_recentSearches', JSON.stringify(searches.slice(0, 10)));
  } catch (error) {
    console.error('Failed to save recent searches:', error);
  }
}

// Helper functions for search scope localStorage
function getSearchScope(): SearchScope {
  if (typeof window === 'undefined') return 'current';
  try {
    const stored = localStorage.getItem('searchScope');
    return stored === 'all' ? 'all' : 'current';
  } catch {
    return 'current';
  }
}

function saveSearchScope(scope: SearchScope) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('searchScope', scope);
  } catch (error) {
    console.error('Failed to save search scope:', error);
  }
}

// Create the store state
let query = $state('');
let mode = $state<SearchMode>('search');
let scope = $state<SearchScope>('current');
let isOpen = $state(false);
let results = $state<SearchResult[]>([]);
let chatMessages = $state<ChatMessage[]>([]);
let isLoading = $state(false);
let isStreaming = $state(false);
let error = $state<string | null>(null);
let selectedIndex = $state(0);
let recentSearches = $state<string[]>([]);
let activeFilters = $state<SearchFilters>({
  content_types: ['literature', 'note', 'project', 'outcome', 'model'],
  projects: [],
  section_types: []
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

// Derived states
const hasResults = $derived(results.length > 0);
const hasActiveFilters = $derived(
  activeFilters.content_types.length < 5 ||
  activeFilters.projects.length > 0 ||
  activeFilters.section_types.length > 0 ||
  activeFilters.date_range?.start ||
  activeFilters.date_range?.end
);

// Chat history derived states
const hasCurrentSession = $derived(currentSession !== null);
const hasUnsavedChanges = $derived(
  currentSession && chatMessages.length > 0 && 
  JSON.stringify(chatMessages) !== JSON.stringify(currentSession.messages)
);
const canSaveSession = $derived(chatMessages.length > 0 && !isSavingSession);
const sessionTitle = $derived(currentSession?.title || generateSessionTitle(chatMessages));

// Initialize recent searches and scope
function initializeRecentSearches() {
  recentSearches = getRecentSearches();
  scope = getSearchScope();
}

// Get current project ID from URL or store
function getCurrentProjectId(): string | null {
  // First try to get from current project store
  if (projectStore.currentProject?.id) {
    return projectStore.currentProject.id;
  }
  
  // Try to extract from URL path like /project/:projectId
  if (typeof window !== 'undefined') {
    const pathMatch = window.location.pathname.match(/\/project\/([a-f0-9-]{36})/i);
    if (pathMatch) {
      return pathMatch[1];
    }
  }
  
  return null;
}

// Chat history helper functions
function generateSessionTitle(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "New Chat";
  }

  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    // Take first 50 characters of the first user message
    const title = firstUserMessage.content.slice(0, 50);
    return title.length < firstUserMessage.content.length ? title + "..." : title;
  }

  return "New Chat";
}

// Auto-save functionality with debounced saving
const debouncedAutoSave = debounce(async () => {
  if (!autoSaveEnabled || !canSaveSession || isSavingSession) return;
  
  try {
    await saveCurrentSession();
  } catch (error) {
    console.error('Auto-save failed:', error);
    chatHistoryError = 'Failed to auto-save session';
  }
}, 2000); // Save 2 seconds after last change

// Load chat history from API
async function loadChatHistory(): Promise<void> {
  isLoadingHistory = true;
  chatHistoryError = null;
  
  try {
    const response = await chatHistoryAPI.getChatSessions({
      limit: 50,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
    
    chatHistorySessions = response.sessions;
  } catch (error) {
    console.error('Failed to load chat history:', error);
    chatHistoryError = 'Failed to load chat history';
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
        projectName: projectStore.currentProject?.name
      }
    );
    
    currentSession = sessionData;
    lastSaveTime = new Date();
    
    // Update the session in the history list
    if (sessionData?.id) {
      const existingIndex = chatHistorySessions.findIndex(s => s?.id === sessionData.id);
      if (existingIndex >= 0) {
        chatHistorySessions[existingIndex] = sessionData;
      } else {
        chatHistorySessions = [sessionData, ...chatHistorySessions];
      }
    }
    
  } catch (error) {
    console.error('Failed to save session:', error);
    
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        console.warn('Chat session auto-save requires authentication. Sessions will not be saved.');
        chatHistoryError = null; // Don't show error for auth issues
      } else {
        chatHistoryError = 'Failed to save session';
      }
    } else {
      chatHistoryError = 'Failed to save session';
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
    
    // Update the session in the history list to mark it as recently accessed
    const existingIndex = chatHistorySessions.findIndex(s => s.id === sessionId);
    if (existingIndex >= 0) {
      const updatedSession = { ...chatHistorySessions[existingIndex], updatedAt: new Date().toISOString() };
      chatHistorySessions.splice(existingIndex, 1);
      chatHistorySessions.unshift(updatedSession);
    }
    
  } catch (error) {
    console.error('Failed to load session:', error);
    chatHistoryError = 'Failed to load session';
  }
}

// Create a new session
async function createNewSession(): Promise<void> {
  chatMessages = [];
  currentSession = null;
  chatHistoryError = null;
  
  // If there are any unsaved changes, they'll be lost
  // This is intentional for "New Chat" functionality
}

// Delete a session
async function deleteSession(sessionId: string): Promise<void> {
  try {
    await chatHistoryAPI.deleteChatSession(sessionId);
    
    // Remove from local list
    chatHistorySessions = chatHistorySessions.filter(s => s.id !== sessionId);
    
    // If this was the current session, clear it
    if (currentSession?.id === sessionId) {
      currentSession = null;
      chatMessages = [];
    }
    
  } catch (error) {
    console.error('Failed to delete session:', error);
    chatHistoryError = 'Failed to delete session';
  }
}

// Toggle star status of a session
async function toggleStarSession(sessionId: string): Promise<void> {
  try {
    const session = chatHistorySessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const newStarStatus = !session.metadata?.isStarred;
    await chatHistoryAPI.toggleStarSession(sessionId, newStarStatus);
    
    // Update local state
    const index = chatHistorySessions.findIndex(s => s.id === sessionId);
    if (index >= 0) {
      chatHistorySessions[index] = {
        ...chatHistorySessions[index],
        metadata: {
          ...chatHistorySessions[index].metadata,
          isStarred: newStarStatus
        }
      };
    }
    
  } catch (error) {
    console.error('Failed to toggle star status:', error);
    chatHistoryError = 'Failed to update session';
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
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
    
    chatHistorySessions = response.sessions;
  } catch (error) {
    console.error('Failed to search chat history:', error);
    chatHistoryError = 'Failed to search chat history';
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

  // Get current project ID - required by the API
  const projectId = getCurrentProjectId();
  if (!projectId) {
    error = 'Please navigate to a project to use global search';
    results = [];
    return;
  }

  // Dynamic limit based on query complexity
  const queryWords = searchQuery.trim().split(/\s+/).length;
  const dynamicLimit = Math.min(Math.max(queryWords * 2, 5), 15);

  // Check cache first
  const cacheKey = `${searchQuery}:${projectId}:${dynamicLimit}:${scope}:${JSON.stringify(activeFilters)}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached) {
    results = cached.results;
    return;
  }

  isLoading = true;
  error = null;

  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: searchQuery,
        mode: 'search',
        projectId: projectId,
        scope: scope,
        contentTypes: activeFilters.content_types,
        filters: {
          authors: activeFilters.projects, // This might need adjustment based on actual filter structure
          types: activeFilters.section_types,
          // Map other filters as needed
        },
        limit: dynamicLimit
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    // Filter results by similarity threshold (only show results with >30% similarity)
    const allResults = data.results || [];
    results = allResults.filter((result: SearchResult) => result.similarity > 0.3);
    
    // Optional: Log filtering info for debugging
    if (allResults.length > results.length) {
      console.log(`Filtered ${allResults.length - results.length} low-relevance results (similarity < 30%)`);
    }

    // Cache the results
    searchCache.set(cacheKey, {
      query: searchQuery,
      results: results,
      timestamp: Date.now(),
      filters: { ...activeFilters }
    });

    // Add to recent searches
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      recentSearches = [searchQuery, ...recentSearches.slice(0, 9)];
      saveRecentSearches(recentSearches);
    }

  } catch (err) {
    console.error('Search error:', err);
    error = err instanceof Error ? err.message : 'Search failed';
    results = [];
  } finally {
    isLoading = false;
  }
}

// Debounced search
const debouncedSearch = debounce(performSearch, 300);

// Chat functions
async function sendChatMessage(message: string): Promise<void> {
  if (!message.trim() || isStreaming) return;

  // Get current project ID - required by the API
  const projectId = getCurrentProjectId();
  if (!projectId) {
    error = 'Please navigate to a project to use AI chat';
    return;
  }

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: message,
    timestamp: new Date()
  };

  chatMessages = [...chatMessages, userMessage];
  isStreaming = true;
  error = null;

  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: message,
        mode: 'chat',
        projectId: projectId,
        scope: scope,
        provider: 'openai', // Default to OpenAI
        context: results.length > 0 ? { searchResults: results } : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true  // This shows "AI is thinking..." until content arrives
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
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue; // Skip empty lines
          
          if (line.startsWith('data: ')) {
            const sseData = line.slice(6).trim();
            
            // Skip the [DONE] marker
            if (sseData === '[DONE]') {
              continue;
            }
            
            try {
              const data = JSON.parse(sseData);
              if (data.content) {
                assistantMessage.content += data.content;
                // Find the message in the array and update it
                const messageIndex = chatMessages.findIndex(m => m.id === assistantMessage.id);
                if (messageIndex >= 0) {
                  chatMessages[messageIndex] = { ...assistantMessage };
                  chatMessages = [...chatMessages];
                }
              }
              if (data.sources) {
                assistantMessage.sources = data.sources;
              }
              if (data.type === 'metadata') {
                if (data.sources) {
                  assistantMessage.sources = data.sources;
                }
                if (data.tools_used) {
                  assistantMessage.metadata = { 
                    ...assistantMessage.metadata, 
                    tools_used: data.tools_used,
                    project_context: data.project_context
                  };
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, 'Line:', sseData);
            }
          }
        }
      }
    }
    // Mark streaming as complete and force final update
    assistantMessage.streaming = false;
    const messageIndex = chatMessages.findIndex(m => m.id === assistantMessage.id);
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
    console.error('Chat error:', err);
    error = err instanceof Error ? err.message : 'Chat failed';
    
    // Remove the streaming message and add error
    chatMessages = chatMessages.slice(0, -1);
    const errorMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'I apologize, but I encountered an error processing your request. Please try again.',
      timestamp: new Date()
    };
    chatMessages = [...chatMessages, errorMessage];
  } finally {
    isStreaming = false;
  }
}

// Store interface
export const globalSearchStore = {
  // Getters
  get query() { return query; },
  get mode() { return mode; },
  get scope() { return scope; },
  get isOpen() { return isOpen; },
  get results() { return results; },
  get chatMessages() { return chatMessages; },
  get isLoading() { return isLoading; },
  get isStreaming() { return isStreaming; },
  get error() { return error; },
  get selectedIndex() { return selectedIndex; },
  get recentSearches() { return recentSearches; },
  get activeFilters() { return activeFilters; },
  get hasResults() { return hasResults; },
  get hasActiveFilters() { return hasActiveFilters; },

  // Chat history getters
  get currentSession() { return currentSession; },
  get chatHistorySessions() { return chatHistorySessions; },
  get isLoadingHistory() { return isLoadingHistory; },
  get isSavingSession() { return isSavingSession; },
  get showChatHistory() { return showChatHistory; },
  get chatHistoryError() { return chatHistoryError; },
  get autoSaveEnabled() { return autoSaveEnabled; },
  get lastSaveTime() { return lastSaveTime; },
  get hasCurrentSession() { return hasCurrentSession; },
  get hasUnsavedChanges() { return hasUnsavedChanges; },
  get canSaveSession() { return canSaveSession; },
  get sessionTitle() { return sessionTitle; },

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

  setScope(newScope: SearchScope) {
    scope = newScope;
    saveSearchScope(newScope);
    error = null;
    // Clear cache when scope changes
    searchCache.clear();
    // Re-run search if there's a query
    if (query.trim()) {
      debouncedSearch();
    }
  },

  setQuery(newQuery: string) {
    query = newQuery;
    if (mode === 'search' && newQuery.trim().length >= 2) {
      debouncedSearch();
    } else if (newQuery.trim().length < 2) {
      results = [];
    }
  },

  clearQuery() {
    query = '';
    results = [];
  },

  performSearch: performSearch,

  sendChatMessage: sendChatMessage,

  setFilters(newFilters: Partial<SearchFilters>) {
    activeFilters = { ...activeFilters, ...newFilters };
    if (query.trim()) {
      debouncedSearch();
    }
  },

  clearFilters() {
    activeFilters = {
      content_types: ['literature', 'note', 'project', 'outcome', 'model'],
      projects: [],
      section_types: []
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
  }
};