// Chat History API Service

import { api, type APIRequestConfig } from "./api-client";
import type { ChatMessage } from "$lib/stores/GlobalSearchStore";

// Chat session interfaces
export interface ChatSession {
  id: string;
  userId: string;
  projectId: string | null;
  title: string | null;
  messages: ChatMessage[];
  metadata: {
    isStarred?: boolean;
    lastActivity?: string;
    messageCount?: number;
    projectName?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  project?: {
    id: string;
    name: string;
  };
}

export interface ChatSessionListResponse {
  sessions: ChatSession[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ChatSessionResponse {
  session: ChatSession;
  message?: string;
}

export interface CreateChatSessionRequest {
  projectId?: string;
  title?: string;
  messages?: ChatMessage[];
  metadata?: any;
}

export interface UpdateChatSessionRequest {
  title?: string;
  messages?: ChatMessage[];
  metadata?: any;
}

export interface ChatSessionFilters {
  projectId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ChatSessionError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// API Error class for better error handling
export class ChatHistoryAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = "ChatHistoryAPIError";
  }
}


// Utility function to build query parameters
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (value instanceof Date) {
        searchParams.append(key, value.toISOString());
      } else if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, item.toString()));
      } else if (typeof value === "boolean") {
        if (value === true) {
          searchParams.append(key, "true");
        }
      } else {
        const stringValue = value.toString().trim();
        if (stringValue !== "") {
          searchParams.append(key, stringValue);
        }
      }
    }
  });

  return searchParams.toString();
}

// Main API service class
export class ChatHistoryAPI {
  /**
   * Get chat sessions for the current user
   */
  static async getChatSessions(
    filters: ChatSessionFilters = {},
    config?: APIRequestConfig
  ): Promise<ChatSessionListResponse> {
    const queryParams = buildQueryParams({
      projectId: filters.projectId,
      search: filters.search,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      includeDeleted: filters.includeDeleted,
      sortBy: filters.sortBy || 'updatedAt',
      sortOrder: filters.sortOrder || 'desc',
    });

    const url = `/chat/sessions?${queryParams}`;
    const response = await api.get<ChatSession[]>(url, config);
    
    // Transform response to expected format
    return {
      sessions: response,
      total: response.length, // Backend should ideally return total count
      page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
      limit: filters.limit || 20,
      hasMore: response.length === (filters.limit || 20)
    };
  }

  /**
   * Get a specific chat session by ID
   */
  static async getChatSession(
    sessionId: string,
    config?: APIRequestConfig
  ): Promise<ChatSession> {
    const url = `/chat/sessions/${sessionId}`;
    return api.get<ChatSession>(url, config);
  }

  /**
   * Create a new chat session
   */
  static async createChatSession(
    sessionData: CreateChatSessionRequest,
    config?: APIRequestConfig
  ): Promise<ChatSession> {
    const url = `/chat/sessions`;
    return api.post<ChatSession>(url, sessionData, config);
  }

  /**
   * Update a chat session
   */
  static async updateChatSession(
    sessionId: string,
    sessionData: UpdateChatSessionRequest,
    config?: APIRequestConfig
  ): Promise<ChatSession> {
    const url = `/chat/sessions/${sessionId}`;
    return api.put<ChatSession>(url, sessionData, config);
  }

  /**
   * Delete a chat session (soft delete)
   */
  static async deleteChatSession(
    sessionId: string,
    config?: APIRequestConfig
  ): Promise<{ message: string }> {
    const url = `/chat/sessions/${sessionId}`;
    return api.delete<{ message: string }>(url, config);
  }

  /**
   * Auto-save current chat session
   */
  static async saveChatSession(
    sessionId: string | null,
    messages: ChatMessage[],
    projectId?: string,
    metadata?: any,
    config?: APIRequestConfig
  ): Promise<ChatSession> {
    if (sessionId) {
      // Update existing session - backend returns session directly
      return await this.updateChatSession(
        sessionId,
        { messages, metadata },
        config
      );
    } else {
      // Create new session
      const title = this.generateSessionTitle(messages);
      return await this.createChatSession(
        {
          projectId,
          title,
          messages,
          metadata,
        },
        config
      );
    }
  }

  /**
   * Search chat sessions
   */
  static async searchChatSessions(
    query: string,
    filters: Omit<ChatSessionFilters, 'search'> = {},
    config?: APIRequestConfig
  ): Promise<ChatSessionListResponse> {
    return this.getChatSessions({ ...filters, search: query }, config);
  }

  /**
   * Star/unstar a chat session
   */
  static async toggleStarSession(
    sessionId: string,
    isStarred: boolean,
    config?: APIRequestConfig
  ): Promise<ChatSession> {
    const session = await this.getChatSession(sessionId, config);
    const metadata = { ...(session.metadata || {}), isStarred };
    
    return this.updateChatSession(sessionId, { metadata }, config);
  }

  /**
   * Generate a title for a chat session based on messages
   */
  static generateSessionTitle(messages: ChatMessage[]): string {
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

  /**
   * Get sessions for a specific project
   */
  static async getProjectSessions(
    projectId: string,
    limit: number = 10,
    config?: APIRequestConfig
  ): Promise<ChatSession[]> {
    const response = await this.getChatSessions(
      { projectId, limit, sortBy: 'updatedAt', sortOrder: 'desc' },
      config
    );
    return response.sessions;
  }

  /**
   * Get recent sessions (last 10)
   */
  static async getRecentSessions(
    limit: number = 10,
    config?: APIRequestConfig
  ): Promise<ChatSession[]> {
    const response = await this.getChatSessions(
      { limit, sortBy: 'updatedAt', sortOrder: 'desc' },
      config
    );
    return response.sessions;
  }

  /**
   * Get starred sessions
   */
  static async getStarredSessions(
    limit: number = 20,
    config?: APIRequestConfig
  ): Promise<ChatSession[]> {
    const response = await this.getChatSessions(
      { limit, sortBy: 'updatedAt', sortOrder: 'desc' },
      config
    );
    
    // Filter starred sessions on the frontend since backend doesn't have this filter
    return response.sessions.filter(session => session.metadata?.isStarred === true);
  }
}

// Helper functions for error handling
export function isChatHistoryAPIError(
  error: any
): error is ChatHistoryAPIError {
  return error instanceof ChatHistoryAPIError;
}

export function getErrorMessage(error: any): string {
  if (isChatHistoryAPIError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

// Request cancellation helper
export function createRequestCancellation() {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
    isCancelled: () => controller.signal.aborted,
  };
}

// Export the main API object for convenience
export const chatHistoryAPI = ChatHistoryAPI;
