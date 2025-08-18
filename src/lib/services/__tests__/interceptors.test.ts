/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  api, 
  addRequestInterceptor, 
  addResponseInterceptor,
  enableDebugLogging
} from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Request/Response Interceptors and Logging', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Interceptors', () => {
    it('should call request interceptors before making requests', async () => {
      const interceptor1 = vi.fn();
      const interceptor2 = vi.fn();
      
      const cleanup1 = addRequestInterceptor(interceptor1);
      const cleanup2 = addRequestInterceptor(interceptor2);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{"message": "success"}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/test', { timeout: 1000, retries: 0 });

      // Both interceptors should be called
      expect(interceptor1).toHaveBeenCalledOnce();
      expect(interceptor2).toHaveBeenCalledOnce();

      // Should be called with URL and options
      expect(interceptor1).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );

      cleanup1();
      cleanup2();
    });

    it('should allow interceptors to modify requests', async () => {
      const modifyingInterceptor = vi.fn((url: string, options: RequestInit) => {
        // Simulate adding a custom header
        if (options.headers) {
          (options.headers as any)['X-Custom-Header'] = 'intercepted';
        }
      });
      
      const cleanup = addRequestInterceptor(modifyingInterceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.post('/test', { data: 'test' }, { timeout: 1000, retries: 0 });

      expect(modifyingInterceptor).toHaveBeenCalled();
      
      // Check that the fetch was called with the modified headers
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'intercepted'
          })
        })
      );

      cleanup();
    });

    it('should support async request interceptors', async () => {
      const asyncInterceptor = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return;
      });
      
      const cleanup = addRequestInterceptor(asyncInterceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/test', { timeout: 1000, retries: 0 });

      expect(asyncInterceptor).toHaveBeenCalled();

      cleanup();
    });

    it('should properly clean up interceptors', async () => {
      const interceptor = vi.fn();
      const cleanup = addRequestInterceptor(interceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/test', { timeout: 1000, retries: 0 });
      expect(interceptor).toHaveBeenCalledOnce();

      // Clean up the interceptor
      cleanup();
      interceptor.mockClear();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/test2', { timeout: 1000, retries: 0 });
      
      // Interceptor should not be called after cleanup
      expect(interceptor).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptors', () => {
    it('should call response interceptors after receiving responses', async () => {
      const interceptor1 = vi.fn();
      const interceptor2 = vi.fn();
      
      const cleanup1 = addResponseInterceptor(interceptor1);
      const cleanup2 = addResponseInterceptor(interceptor2);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      const mockResponse = {
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{"data": "test"}',
        clone: () => ({ headers: mockHeaders }),
      };
      
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.get('/test', { timeout: 1000, retries: 0 });

      // Both interceptors should be called
      expect(interceptor1).toHaveBeenCalledOnce();
      expect(interceptor2).toHaveBeenCalledOnce();

      // Should be called with cloned response and URL
      expect(interceptor1).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.any(Object)
        }),
        expect.stringContaining('/test')
      );

      cleanup1();
      cleanup2();
    });

    it('should support async response interceptors', async () => {
      const asyncInterceptor = vi.fn().mockImplementation(async (response: Response, url: string) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return;
      });
      
      const cleanup = addResponseInterceptor(asyncInterceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/test', { timeout: 1000, retries: 0 });

      expect(asyncInterceptor).toHaveBeenCalled();

      cleanup();
    });

    it('should call response interceptors even on error responses', async () => {
      const interceptor = vi.fn();
      const cleanup = addResponseInterceptor(interceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: mockHeaders,
        json: async () => ({ message: 'Not found' }),
        text: async () => JSON.stringify({ message: 'Not found' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.get('/test', { timeout: 1000, retries: 0 });
      } catch (error) {
        // Expected to throw
      }

      // Interceptor should still be called for error responses
      expect(interceptor).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.any(Object)
        }),
        expect.stringContaining('/test')
      );

      cleanup();
    });
  });

  describe('Debug Logging', () => {
    it('should enable debug logging for requests and responses', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const cleanup = enableDebugLogging();

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{"result": "success"}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.post('/test', { data: 'test' }, { timeout: 1000, retries: 0 });

      // Should have logged something (exact format may vary)
      expect(consoleSpy).toHaveBeenCalled();

      cleanup();
      consoleSpy.mockRestore();
    });

    it('should properly clean up debug logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const cleanup = enableDebugLogging();
      cleanup(); // Clean up immediately

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/test', { timeout: 1000, retries: 0 });

      // Should not log after cleanup
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Combined Interceptors and Logging', () => {
    it('should work with both custom interceptors and debug logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const requestInterceptor = vi.fn();
      const responseInterceptor = vi.fn();
      
      const debugCleanup = enableDebugLogging();
      const reqCleanup = addRequestInterceptor(requestInterceptor);
      const resCleanup = addResponseInterceptor(responseInterceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{"data": "combined"}',
        clone: () => ({ headers: mockHeaders }),
      });

      await api.get('/combined-test', { timeout: 1000, retries: 0 });

      // All interceptors should be called
      expect(requestInterceptor).toHaveBeenCalled();
      expect(responseInterceptor).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      debugCleanup();
      reqCleanup();
      resCleanup();
      consoleSpy.mockRestore();
    });
  });

  describe('Interceptor Error Handling', () => {
    it('should handle interceptor errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingInterceptor = vi.fn().mockImplementation(() => {
        throw new Error('Interceptor error');
      });
      const workingInterceptor = vi.fn();
      
      const cleanup1 = addRequestInterceptor(failingInterceptor);
      const cleanup2 = addRequestInterceptor(workingInterceptor);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '{}',
        clone: () => ({ headers: mockHeaders }),
      });

      // Request should succeed despite interceptor error
      await expect(api.get('/test', { timeout: 1000, retries: 0 })).resolves.toEqual({});

      expect(failingInterceptor).toHaveBeenCalled();
      expect(workingInterceptor).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Request interceptor error:', expect.any(Error));

      cleanup1();
      cleanup2();
      consoleSpy.mockRestore();
    });
  });
});