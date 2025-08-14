import { api, type APIRequestConfig } from "./api-client";
import type {
  CustomTimelineEvent,
  CreateCustomEventForm,
  UpdateCustomEventForm,
  CustomEventListResponse,
  CustomEventResponse,
  CustomEventFilters,
  CustomEventSearchParams,
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
    config?: APIRequestConfig
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

    const url = `/projects/${projectId}/custom-events?${queryParams}`;
    return api.get<CustomEventListResponse>(url, config);
  }

  /**
   * Create a new custom event
   */
  static async createCustomEvent(
    projectId: string,
    eventData: CreateCustomEventForm,
    config?: APIRequestConfig
  ): Promise<CustomEventResponse> {
    const url = `/projects/${projectId}/custom-events`;

    const requestPayload = {
      ...eventData,
      eventTimestamp: eventData.eventTimestamp.toISOString(),
    };

    return api.post<CustomEventResponse>(url, requestPayload, config);
  }

  /**
   * Get a specific custom event by ID
   */
  static async getCustomEvent(
    eventId: number,
    config?: APIRequestConfig
  ): Promise<CustomTimelineEvent> {
    const url = `/custom-events/${eventId}`;
    return api.get<CustomTimelineEvent>(url, config);
  }

  /**
   * Update a custom event
   */
  static async updateCustomEvent(
    eventId: number,
    eventData: UpdateCustomEventForm,
    config?: APIRequestConfig
  ): Promise<CustomEventResponse> {
    const url = `/custom-events/${eventId}`;

    const requestPayload = {
      ...eventData,
      eventTimestamp: eventData.eventTimestamp?.toISOString(),
    };

    return api.put<CustomEventResponse>(url, requestPayload, config);
  }

  /**
   * Delete a custom event (soft delete)
   */
  static async deleteCustomEvent(
    eventId: number,
    config?: APIRequestConfig
  ): Promise<CustomEventResponse> {
    const url = `/custom-events/${eventId}`;
    return api.delete<CustomEventResponse>(url, config);
  }

  /**
   * Restore a deleted custom event
   */
  static async restoreCustomEvent(
    eventId: number,
    config?: APIRequestConfig
  ): Promise<CustomEventResponse> {
    const url = `/custom-events/${eventId}/restore`;
    return api.post<CustomEventResponse>(url, undefined, config);
  }

  /**
   * Search custom events across projects
   */
  static async searchCustomEvents(
    searchParams: CustomEventSearchParams,
    config?: APIRequestConfig
  ): Promise<CustomEventListResponse> {
    const queryParams = buildQueryParams(searchParams);
    const url = `/custom-events/search?${queryParams}`;
    return api.get<CustomEventListResponse>(url, config);
  }

  /**
   * Get current user's custom events
   */
  static async getUserCustomEvents(
    page: number = 1,
    limit: number = 20,
    config?: APIRequestConfig
  ): Promise<CustomEventListResponse> {
    const queryParams = buildQueryParams({ page, limit });
    const url = `/custom-events/user/my-events?${queryParams}`;
    return api.get<CustomEventListResponse>(url, config);
  }

  /**
   * Bulk operations on custom events
   */
  static async bulkDeleteCustomEvents(
    eventIds: number[],
    config?: APIRequestConfig
  ): Promise<{ message: string; deletedCount: number }> {
    const url = `/custom-events/bulk`;
    return api.post(
      url,
      {
        eventIds,
        action: "delete",
      },
      config
    );
  }

  /**
   * Bulk restore custom events
   */
  static async bulkRestoreCustomEvents(
    eventIds: number[],
    config?: APIRequestConfig
  ): Promise<{ message: string; restoredCount: number }> {
    const url = `/custom-events/bulk`;
    return api.post(
      url,
      {
        eventIds,
        action: "restore",
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
