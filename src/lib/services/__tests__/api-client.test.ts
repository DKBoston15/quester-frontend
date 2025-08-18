/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  api, 
  APIError, 
  AuthenticationError, 
  setGlobalLogoutHandler,
  addRequestInterceptor,
  addResponseInterceptor,
  enableDebugLogging,
  getApiUrl 
} from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApiUrl', () => {
    it('should return full URL for relative endpoint', () => {
      const url = getApiUrl('/test/endpoint');
      expect(url).toContain('/test/endpoint');
    });

    it('should return absolute URL unchanged', () => {
      const url = getApiUrl('https://example.com/api/test');
      expect(url).toBe('https://example.com/api/test');
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify(mockData),
        json: async () => mockData,
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      const result = await api.get('/test');
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => '',
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      const result = await api.get('/test');
      expect(result).toEqual({});
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with data', async () => {
      const requestData = { name: 'Test' };
      const responseData = { id: 1, ...requestData };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify(responseData),
        json: async () => responseData,
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      const result = await api.post('/test', requestData);
      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(requestData),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw APIError for non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'Something went wrong',
        clone: () => ({
          headers: new Map([['content-type', 'text/plain']]),
        }),
      });

      await expect(api.get('/test')).rejects.toThrow(APIError);
    });

    it('should throw AuthenticationError for 401 response', async () => {
      const mockLogout = vi.fn();
      setGlobalLogoutHandler(mockLogout);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ message: 'Authentication required' }),
        text: async () => JSON.stringify({ message: 'Authentication required' }),
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      await expect(api.get('/test')).rejects.toThrow(AuthenticationError);
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should handle HTML error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html><head><title>Page Not Found</title></head></html>',
        clone: () => ({
          headers: new Map([['content-type', 'text/html']]),
        }),
      });

      await expect(api.get('/test')).rejects.toThrow('Page Not Found');
    });
  });

  describe('Interceptors', () => {
    it('should call request interceptors', async () => {
      const requestInterceptor = vi.fn();
      const cleanup = addRequestInterceptor(requestInterceptor);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => '{}',
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      await api.get('/test');
      expect(requestInterceptor).toHaveBeenCalled();
      
      cleanup();
    });

    it('should call response interceptors', async () => {
      const responseInterceptor = vi.fn();
      const cleanup = addResponseInterceptor(responseInterceptor);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => '{}',
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      await api.get('/test');
      expect(responseInterceptor).toHaveBeenCalled();
      
      cleanup();
    });

    it('should enable debug logging', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cleanup = enableDebugLogging();

      expect(typeof cleanup).toBe('function');
      
      cleanup();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Configuration options', () => {
    it('should respect custom timeout', async () => {
      const abortController = new AbortController();
      const abortSpy = vi.spyOn(abortController, 'abort');
      
      // Mock AbortController
      vi.spyOn(window, 'AbortController').mockImplementation(() => abortController);
      
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 2000))
      );

      const promise = api.get('/test', { timeout: 100 });
      
      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(abortSpy).toHaveBeenCalled();
      
      vi.restoreAllMocks();
    });

    it('should preserve error details when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ message: 'Validation failed: Name is required' }),
        text: async () => JSON.stringify({ message: 'Validation failed: Name is required' }),
        clone: () => ({
          headers: new Map([['content-type', 'application/json']]),
        }),
      });

      try {
        await api.get('/test', { preserveErrorDetail: true });
      } catch (error) {
        expect(error.message).toBe('Validation failed: Name is required');
      }
    });
  });
});