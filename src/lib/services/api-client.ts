// Centralized API Client with Authentication Error Handling
// This service provides a fetch wrapper that automatically handles 401/403 responses
// and triggers appropriate logout actions to prevent "half logout" states.

import { API_BASE_URL } from '../config';

// Global logout handler - will be set by the AuthStore
let globalLogoutHandler: (() => void) | null = null;

// Error classes for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public response?: Response
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, status: number, response?: Response) {
    super(message, status, undefined, response);
    this.name = 'AuthenticationError';
  }
}

// Request configuration interface
export interface APIRequestConfig {
  retries?: number;
  timeout?: number;
  signal?: AbortSignal;
  skipAuthCheck?: boolean; // For login/logout endpoints
}

// Default configuration
const DEFAULT_CONFIG: APIRequestConfig = {
  retries: 3,
  timeout: 30000, // 30 seconds
  skipAuthCheck: false,
};

/**
 * Register a global logout handler that will be called when auth errors occur
 * This should be called by the AuthStore during initialization
 */
export function setGlobalLogoutHandler(handler: () => void) {
  globalLogoutHandler = handler;
}

/**
 * Centralized fetch wrapper with automatic auth error handling
 * This function intercepts all API calls and handles 401/403 responses globally
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  config: APIRequestConfig = {}
): Promise<T> {
  const {
    retries = DEFAULT_CONFIG.retries!,
    timeout = DEFAULT_CONFIG.timeout!,
    signal,
    skipAuthCheck = DEFAULT_CONFIG.skipAuthCheck!,
  } = config;

  // Ensure URL is absolute
  const requestUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Create abort controller for timeout if no signal provided
  const controller = new AbortController();
  const timeoutId = signal
    ? null
    : setTimeout(() => controller.abort(), timeout);

  const requestSignal = signal || controller.signal;

  const requestOptions: RequestInit = {
    ...options,
    signal: requestSignal,
    credentials: 'include', // Always include cookies for session auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(requestUrl, requestOptions);

      // Clear timeout if we got a response
      if (timeoutId) clearTimeout(timeoutId);

      // Handle authentication errors BEFORE other error handling
      if (!skipAuthCheck && (response.status === 401 || response.status === 403)) {
        console.warn(`Authentication error detected: ${response.status} on ${requestUrl}`);
        
        // Trigger global logout immediately to prevent half-logout state
        if (globalLogoutHandler) {
          console.log('Triggering global logout due to auth error');
          globalLogoutHandler();
        } else {
          console.error('No global logout handler registered - this may cause half-logout state');
        }

        // Parse error details if available
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new AuthenticationError(
          errorData.message || `Authentication failed (${response.status})`,
          response.status,
          response
        );
      }

      // Handle other non-ok responses
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new APIError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData.code,
          response
        );
      }

      // Handle successful responses
      const responseText = await response.text();
      if (!responseText) {
        return {} as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        throw new APIError(
          'Invalid JSON response from server',
          response.status,
          undefined,
          response
        );
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof APIError) {
        // Don't retry auth errors, client errors, or not found
        if (
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404 ||
          error.status >= 400 && error.status < 500
        ) {
          throw error;
        }
      }

      // Don't retry on abort
      if (error instanceof Error && error.name === 'AbortError') {
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

  // Should never reach here, but TypeScript requires it
  throw lastError!;
}

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  get: <T = any>(url: string, config?: APIRequestConfig) =>
    apiRequest<T>(url, { method: 'GET' }, config),

  post: <T = any>(url: string, data?: any, config?: APIRequestConfig) =>
    apiRequest<T>(
      url,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    ),

  put: <T = any>(url: string, data?: any, config?: APIRequestConfig) =>
    apiRequest<T>(
      url,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    ),

  patch: <T = any>(url: string, data?: any, config?: APIRequestConfig) =>
    apiRequest<T>(
      url,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    ),

  delete: <T = any>(url: string, config?: APIRequestConfig) =>
    apiRequest<T>(url, { method: 'DELETE' }, config),
};

/**
 * Helper function to check if an error is an authentication error
 */
export function isAuthError(error: any): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Helper function to get a user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (error instanceof APIError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}