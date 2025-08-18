// Centralized API Client with Authentication Error Handling
// This service provides a fetch wrapper that automatically handles 401/403 responses
// and triggers appropriate logout actions to prevent "half logout" states.

import { API_BASE_URL } from "../config";

// Global logout handler - will be set by the AuthStore
let globalLogoutHandler: (() => void) | null = null;

// Request/Response interceptors
interface RequestInterceptor {
  (url: string, options: RequestInit): void | Promise<void>;
}

interface ResponseInterceptor {
  (response: Response, url: string): void | Promise<void>;
}

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

// Error classes for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public response?: Response
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, status: number, response?: Response) {
    super(message, status, undefined, response);
    this.name = "AuthenticationError";
  }
}

// Request configuration interface
export interface APIRequestConfig {
  retries?: number;
  timeout?: number;
  signal?: AbortSignal;
  skipAuthCheck?: boolean; // For login/logout endpoints
  mode?: RequestMode; // CORS mode
  cache?: RequestCache; // Cache mode
  preserveErrorDetail?: boolean; // Preserve original error messages
  expectedContentType?: 'json' | 'text' | 'blob' | 'auto'; // Expected response type
}

// Default configuration
const DEFAULT_CONFIG: APIRequestConfig = {
  retries: 3,
  timeout: 30000, // 30 seconds
  skipAuthCheck: false,
  preserveErrorDetail: true,
  expectedContentType: 'auto',
};

/**
 * Register a global logout handler that will be called when auth errors occur
 * This should be called by the AuthStore during initialization
 */
export function setGlobalLogoutHandler(handler: () => void) {
  globalLogoutHandler = handler;
}

/**
 * Get the full API URL for a given endpoint
 * This is useful for browser redirects, downloads, etc.
 */
export function getApiUrl(endpoint: string): string {
  return endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
}

/**
 * Add a request interceptor
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  requestInterceptors.push(interceptor);
  
  // Return cleanup function
  return () => {
    const index = requestInterceptors.indexOf(interceptor);
    if (index > -1) {
      requestInterceptors.splice(index, 1);
    }
  };
}

/**
 * Add a response interceptor
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  responseInterceptors.push(interceptor);
  
  // Return cleanup function
  return () => {
    const index = responseInterceptors.indexOf(interceptor);
    if (index > -1) {
      responseInterceptors.splice(index, 1);
    }
  };
}

/**
 * Add a simple logging interceptor for debugging
 */
export function enableDebugLogging(): () => void {
  const requestLogger = (url: string, options: RequestInit) => {
    console.log(`[API] ${options.method || 'GET'} ${url}`, {
      headers: options.headers,
      body: options.body
    });
  };
  
  const responseLogger = (response: Response, url: string) => {
    console.log(`[API] ${response.status} ${url}`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
  };
  
  const removeRequest = addRequestInterceptor(requestLogger);
  const removeResponse = addResponseInterceptor(responseLogger);
  
  return () => {
    removeRequest();
    removeResponse();
  };
}

/**
 * Parse response based on expected content type
 */
async function parseResponseByContentType<T>(
  response: Response, 
  expectedContentType: 'json' | 'text' | 'blob' | 'auto'
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  
  // If expectedContentType is 'auto', determine from Content-Type header
  if (expectedContentType === 'auto') {
    if (contentType.includes('application/json')) {
      expectedContentType = 'json';
    } else if (contentType.includes('text/')) {
      expectedContentType = 'text';
    } else if (contentType.includes('application/octet-stream') || 
               contentType.includes('image/') || 
               contentType.includes('audio/') || 
               contentType.includes('video/')) {
      expectedContentType = 'blob';
    } else {
      // Default to JSON for unknown types
      expectedContentType = 'json';
    }
  }

  switch (expectedContentType) {
    case 'text': {
      const text = await response.text();
      return text as unknown as T;
    }
    
    case 'blob': {
      const blob = await response.blob();
      return blob as unknown as T;
    }
    
    case 'json':
    default: {
      const responseText = await response.text();
      if (!responseText) {
        return {} as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        throw new APIError(
          "Invalid JSON response from server",
          response.status,
          undefined,
          response
        );
      }
    }
  }
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
  const requestUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  // Create abort controller for timeout if no signal provided
  const controller = new AbortController();
  const timeoutId = signal
    ? null
    : setTimeout(() => controller.abort(), timeout);

  const requestSignal = signal || controller.signal;

  const requestOptions: RequestInit = {
    ...options,
    signal: requestSignal,
    credentials: "include", // Always include cookies for session auth
    mode: config.mode || 'cors',
    cache: config.cache || 'default',
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Call request interceptors
      for (const interceptor of requestInterceptors) {
        try {
          await interceptor(requestUrl, requestOptions);
        } catch (error) {
          console.error('Request interceptor error:', error);
          // Continue with the request despite interceptor failure
        }
      }
      
      const response = await fetch(requestUrl, requestOptions);

      // Clear timeout if we got a response
      if (timeoutId) clearTimeout(timeoutId);
      
      // Call response interceptors
      for (const interceptor of responseInterceptors) {
        try {
          await interceptor(response.clone(), requestUrl);
        } catch (error) {
          console.error('Response interceptor error:', error);
          // Continue with the response despite interceptor failure
        }
      }

      // Handle authentication errors BEFORE other error handling
      if (
        !skipAuthCheck &&
        (response.status === 401 || response.status === 403)
      ) {
        console.warn(
          `Authentication error detected: ${response.status} on ${requestUrl}`
        );

        // Trigger global logout immediately to prevent half-logout state
        if (globalLogoutHandler) {
          globalLogoutHandler();
        } else {
          console.error(
            "No global logout handler registered - this may cause half-logout state"
          );
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
        let errorMessage: string;
        
        // Try to parse error response based on content type
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          try {
            errorData = await response.json();
            errorMessage = errorData.message || errorData.error || response.statusText;
          } catch {
            errorMessage = response.statusText;
            errorData = { message: errorMessage };
          }
        } else if (contentType?.includes('text/html')) {
          // Handle HTML error pages (like 404s)
          try {
            const text = await response.text();
            // Extract title or first heading from HTML if possible
            const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
            errorMessage = titleMatch ? titleMatch[1] : response.statusText;
            errorData = { message: errorMessage, html: true };
          } catch {
            errorMessage = response.statusText;
            errorData = { message: errorMessage };
          }
        } else {
          // Handle plain text or other content types
          try {
            const text = await response.text();
            errorMessage = text || response.statusText;
            errorData = { message: errorMessage };
          } catch {
            errorMessage = response.statusText;
            errorData = { message: errorMessage };
          }
        }

        throw new APIError(
          config.preserveErrorDetail ? errorMessage : `Request failed with status ${response.status}`,
          response.status,
          errorData.code,
          response
        );
      }

      // Handle successful responses based on expected content type
      return await parseResponseByContentType<T>(response, config.expectedContentType || 'auto');
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof APIError) {
        // Don't retry auth errors, client errors, or not found
        if (
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404 ||
          (error.status >= 400 && error.status < 500)
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

  // Should never reach here, but TypeScript requires it
  throw lastError!;
}

/**
 * Stream configuration for SSE endpoints
 */
export interface StreamConfig extends APIRequestConfig {
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Handle Server-Sent Events (SSE) streaming responses
 * Returns a Response object that can be processed for streaming
 */
export async function streamRequest(
  url: string,
  config: StreamConfig = {}
): Promise<Response> {
  const {
    method = "POST",
    body,
    headers = {},
    timeout = 60000, // 60 seconds for streaming
    signal,
    skipAuthCheck = false,
  } = config;

  // Ensure URL is absolute
  const requestUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  // Create abort controller for timeout if no signal provided
  const controller = new AbortController();
  const timeoutId = signal
    ? null
    : setTimeout(() => controller.abort(), timeout);

  const requestSignal = signal || controller.signal;

  const requestOptions: RequestInit = {
    method,
    signal: requestSignal,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    // Call request interceptors for streaming requests too
    for (const interceptor of requestInterceptors) {
      await interceptor(requestUrl, requestOptions);
    }
    
    const response = await fetch(requestUrl, requestOptions);

    // Clear timeout if we got a response
    if (timeoutId) clearTimeout(timeoutId);
    
    // Call response interceptors for streaming requests
    for (const interceptor of responseInterceptors) {
      await interceptor(response.clone(), requestUrl);
    }

    // Handle authentication errors
    if (
      !skipAuthCheck &&
      (response.status === 401 || response.status === 403)
    ) {
      console.warn(
        `Authentication error detected: ${response.status} on ${requestUrl}`
      );

      // Trigger global logout
      if (globalLogoutHandler) {
        globalLogoutHandler();
      }

      throw new AuthenticationError(
        `Authentication failed (${response.status})`,
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

    return response;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Process SSE stream from a Response object
 * This helper processes the response body as a stream of SSE events
 */
export async function processSSEStream(
  response: Response,
  config: StreamConfig = {}
): Promise<void> {
  const { onMessage, onError, onComplete } = config;

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (onComplete) onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const content = line.slice(6);
          
          if (content === "[DONE]") {
            if (onComplete) onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(content);
            if (onMessage) onMessage(parsed);
          } catch (e) {
            // Log parsing errors for debugging but don't break the stream
            console.warn('Failed to parse SSE message:', content, e);
            // If it's not JSON, pass the raw content
            if (onMessage) onMessage(content);
          }
        }
      }
    }
  } catch (error) {
    if (onError) onError(error as Error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  get: <T = any>(url: string, config?: APIRequestConfig) =>
    apiRequest<T>(url, { method: "GET" }, config),

  post: <T = any>(url: string, data?: any, config?: APIRequestConfig) =>
    apiRequest<T>(
      url,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    ),

  put: <T = any>(url: string, data?: any, config?: APIRequestConfig) =>
    apiRequest<T>(
      url,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    ),

  patch: <T = any>(url: string, data?: any, config?: APIRequestConfig) =>
    apiRequest<T>(
      url,
      {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    ),

  delete: <T = any>(url: string, config?: APIRequestConfig) =>
    apiRequest<T>(url, { method: "DELETE" }, config),

  /**
   * Stream endpoint for SSE responses
   * Returns the raw Response object for custom processing
   */
  stream: (url: string, config?: StreamConfig) => streamRequest(url, config),

  /**
   * Stream endpoint with automatic SSE processing
   * Handles the entire streaming lifecycle
   */
  streamSSE: async (url: string, config: StreamConfig) => {
    const response = await streamRequest(url, config);
    return processSSEStream(response, config);
  },
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
  return "An unexpected error occurred";
}
