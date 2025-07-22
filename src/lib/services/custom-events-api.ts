// Custom Events API Service

import { API_BASE_URL } from "../config";
import type {
  CustomTimelineEvent,
  CreateCustomEventForm,
  UpdateCustomEventForm,
  CustomEventListResponse,
  CustomEventResponse,
  CustomEventFilters,
  CustomEventSearchParams,
  CustomEventError,
  CustomEventValidationErrors,
} from "../types/custom-events";

// API Error class for better error handling
export class CustomEventAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public errors?: CustomEventValidationErrors
  ) {
    super(message);
    this.name = "CustomEventAPIError";
  }
}

// Request configuration interface
interface RequestConfig {
  retries?: number;
  timeout?: number;
  signal?: AbortSignal;
}

// Default request configuration
const DEFAULT_CONFIG: RequestConfig = {
  retries: 3,
  timeout: 30000, // 30 seconds
};

// Utility function to create fetch requests with retry logic
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  config: RequestConfig = {}
): Promise<T> {
  const {
    retries = DEFAULT_CONFIG.retries!,
    timeout = DEFAULT_CONFIG.timeout!,
    signal,
  } = config;

  // Create abort controller for timeout if no signal provided
  const controller = new AbortController();
  const timeoutId = signal
    ? null
    : setTimeout(() => controller.abort(), timeout);

  const requestSignal = signal || controller.signal;

  const requestOptions: RequestInit = {
    ...options,
    signal: requestSignal,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, requestOptions);

      // Clear timeout if we got a response
      if (timeoutId) clearTimeout(timeoutId);

      // Handle non-ok responses
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new CustomEventAPIError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData.code,
          errorData.errors
        );
      }

      // Handle empty responses
      const responseText = await response.text();
      if (!responseText) {
        return {} as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        throw new CustomEventAPIError(
          "Invalid JSON response from server",
          response.status
        );
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof CustomEventAPIError) {
        if (
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404
        ) {
          throw error;
        }
      }

      // Don't retry on abort
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
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
        // Only append boolean values if they are true
        // This avoids sending "includeDeleted=false" which might confuse the backend
        if (value === true) {
          searchParams.append(key, "true");
        }
      } else {
        // Convert to string and validate it's not empty after conversion
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
export class CustomEventsAPI {
  /**
   * Get custom events for a specific project
   */
  static async getCustomEvents(
    projectId: string,
    filters: CustomEventFilters = {},
    config?: RequestConfig
  ): Promise<CustomEventListResponse> {
    const queryParams = buildQueryParams({
      page: filters.page || 1,
      limit: filters.limit || 20,
      eventType: filters.eventType,
      userId: filters.userId,
      search: filters.search,
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeDeleted: filters.includeDeleted,
      sortBy: filters.sortBy || "eventTimestamp",
      sortOrder: filters.sortOrder || "desc",
    });

    const url = `${API_BASE_URL}/projects/${projectId}/custom-events?${queryParams}`;
    return apiRequest<CustomEventListResponse>(url, { method: "GET" }, config);
  }

  /**
   * Create a new custom event
   */
  static async createCustomEvent(
    projectId: string,
    eventData: CreateCustomEventForm,
    config?: RequestConfig
  ): Promise<CustomEventResponse> {
    const url = `${API_BASE_URL}/projects/${projectId}/custom-events`;

    const requestPayload = {
      body: {
        ...eventData,
        eventTimestamp: eventData.eventTimestamp.toISOString(),
      }
    };

    return apiRequest<CustomEventResponse>(
      url,
      {
        method: "POST",
        body: JSON.stringify(requestPayload),
      },
      config
    );
  }

  /**
   * Get a specific custom event by ID
   */
  static async getCustomEvent(
    eventId: number,
    config?: RequestConfig
  ): Promise<CustomTimelineEvent> {
    const url = `${API_BASE_URL}/custom-events/${eventId}`;
    return apiRequest<CustomTimelineEvent>(url, { method: "GET" }, config);
  }

  /**
   * Update a custom event
   */
  static async updateCustomEvent(
    eventId: number,
    eventData: UpdateCustomEventForm,
    config?: RequestConfig
  ): Promise<CustomEventResponse> {
    const url = `${API_BASE_URL}/custom-events/${eventId}`;

    const requestPayload = {
      body: {
        ...eventData,
        eventTimestamp: eventData.eventTimestamp?.toISOString(),
      }
    };

    return apiRequest<CustomEventResponse>(
      url,
      {
        method: "PUT",
        body: JSON.stringify(requestPayload),
      },
      config
    );
  }

  /**
   * Delete a custom event (soft delete)
   */
  static async deleteCustomEvent(
    eventId: number,
    config?: RequestConfig
  ): Promise<CustomEventResponse> {
    const url = `${API_BASE_URL}/custom-events/${eventId}`;
    return apiRequest<CustomEventResponse>(url, { method: "DELETE" }, config);
  }

  /**
   * Restore a deleted custom event
   */
  static async restoreCustomEvent(
    eventId: number,
    config?: RequestConfig
  ): Promise<CustomEventResponse> {
    const url = `${API_BASE_URL}/custom-events/${eventId}/restore`;
    return apiRequest<CustomEventResponse>(url, { method: "POST" }, config);
  }

  /**
   * Search custom events across projects
   */
  static async searchCustomEvents(
    searchParams: CustomEventSearchParams,
    config?: RequestConfig
  ): Promise<CustomEventListResponse> {
    const queryParams = buildQueryParams(searchParams);
    const url = `${API_BASE_URL}/custom-events/search?${queryParams}`;
    return apiRequest<CustomEventListResponse>(url, { method: "GET" }, config);
  }

  /**
   * Get current user's custom events
   */
  static async getUserCustomEvents(
    page: number = 1,
    limit: number = 20,
    config?: RequestConfig
  ): Promise<CustomEventListResponse> {
    const queryParams = buildQueryParams({ page, limit });
    const url = `${API_BASE_URL}/custom-events/user/my-events?${queryParams}`;
    return apiRequest<CustomEventListResponse>(url, { method: "GET" }, config);
  }

  /**
   * Bulk operations on custom events
   */
  static async bulkDeleteCustomEvents(
    eventIds: number[],
    config?: RequestConfig
  ): Promise<{ message: string; deletedCount: number }> {
    const url = `${API_BASE_URL}/custom-events/bulk`;
    return apiRequest(
      url,
      {
        method: "POST",
        body: JSON.stringify({
          eventIds,
          action: "delete",
        }),
      },
      config
    );
  }

  /**
   * Bulk restore custom events
   */
  static async bulkRestoreCustomEvents(
    eventIds: number[],
    config?: RequestConfig
  ): Promise<{ message: string; restoredCount: number }> {
    const url = `${API_BASE_URL}/custom-events/bulk`;
    return apiRequest(
      url,
      {
        method: "POST",
        body: JSON.stringify({
          eventIds,
          action: "restore",
        }),
      },
      config
    );
  }
}

// Helper functions for error handling
export function isCustomEventAPIError(
  error: any
): error is CustomEventAPIError {
  return error instanceof CustomEventAPIError;
}

export function getErrorMessage(error: any): string {
  if (isCustomEventAPIError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

export function getValidationErrors(
  error: any
): CustomEventValidationErrors | null {
  if (isCustomEventAPIError(error) && error.errors) {
    return error.errors;
  }

  return null;
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

// Retry helper for specific operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry certain errors
      if (isCustomEventAPIError(error)) {
        if (
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404
        ) {
          throw error;
        }
      }

      const delay = backoffMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Export the main API object for convenience
export const customEventsAPI = CustomEventsAPI;
