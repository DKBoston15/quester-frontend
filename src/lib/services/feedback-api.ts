import { API_BASE_URL } from "$lib/config";
import type {
  CreateFeedbackForm,
  UpdateFeedbackForm,
  FeedbackFilters,
  FeedbackListResponse,
  FeedbackResponse,
  FeedbackStatsResponse,
  FeedbackAPIError,
  FeedbackValidationErrors,
} from "$lib/types/feedback";

// API Error class for better error handling
export class FeedbackAPIErrorImpl extends Error implements FeedbackAPIError {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public errors?: FeedbackValidationErrors
  ) {
    super(message);
    this.name = "FeedbackAPIError";
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

// Handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  let data: any;

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new FeedbackAPIErrorImpl(
      text || "Invalid response format",
      response.status
    );
  }

  if (!response.ok) {
    throw new FeedbackAPIErrorImpl(
      data.message || "Request failed",
      response.status,
      data.code,
      data.errors
    );
  }

  return data;
}

export class FeedbackAPI {
  /**
   * Create a new feedback entry
   */
  static async createFeedback(
    feedbackData: CreateFeedbackForm,
    signal?: AbortSignal
  ): Promise<FeedbackResponse> {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(feedbackData),
      signal,
    });

    return handleResponse<FeedbackResponse>(response);
  }

  /**
   * Get feedback for a specific project
   */
  static async getFeedback(
    projectId: string,
    filters: FeedbackFilters = {},
    signal?: AbortSignal
  ): Promise<FeedbackListResponse> {
    const queryParams = buildQueryParams({
      page: filters.page || 1,
      limit: filters.limit || 20,
      status: filters.status,
      feedbackType: filters.feedbackType,
      subjectType: filters.subjectType,
      userId: filters.userId,
      sortBy: filters.sortBy || "created_at",
      sortOrder: filters.sortOrder || "desc",
    });

    const url = `${API_BASE_URL}/projects/${projectId}/feedback?${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      signal,
    });

    return handleResponse<FeedbackListResponse>(response);
  }

  /**
   * Get a single feedback item
   */
  static async getFeedbackById(
    feedbackId: number,
    signal?: AbortSignal
  ): Promise<FeedbackResponse> {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: "GET",
      credentials: "include",
      signal,
    });

    return handleResponse<FeedbackResponse>(response);
  }

  /**
   * Update feedback status
   */
  static async updateFeedbackStatus(
    feedbackId: number,
    updateData: UpdateFeedbackForm,
    signal?: AbortSignal
  ): Promise<FeedbackResponse> {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(updateData),
      signal,
    });

    return handleResponse<FeedbackResponse>(response);
  }

  /**
   * Delete feedback
   */
  static async deleteFeedback(
    feedbackId: number,
    signal?: AbortSignal
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: "DELETE",
      credentials: "include",
      signal,
    });

    return handleResponse<{ success: boolean; message: string }>(response);
  }

  /**
   * Get feedback statistics for a project
   */
  static async getFeedbackStats(
    projectId: string,
    signal?: AbortSignal
  ): Promise<FeedbackStatsResponse> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/feedback/stats`,
      {
        method: "GET",
        credentials: "include",
        signal,
      }
    );

    return handleResponse<FeedbackStatsResponse>(response);
  }
}

// Default export
export default FeedbackAPI;

// Utility functions for error handling
export function isFeedbackAPIError(error: any): error is FeedbackAPIError {
  return error instanceof FeedbackAPIErrorImpl;
}

export function getErrorMessage(error: any): string {
  if (isFeedbackAPIError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
