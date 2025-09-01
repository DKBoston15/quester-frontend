/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  api, 
  streamRequest,
  processSSEStream,
  APIError,
  AuthenticationError,
  setGlobalLogoutHandler
} from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ReadableStream for streaming tests
class MockReadableStream {
  private reader: any;
  
  constructor(chunks: string[]) {
    let index = 0;
    this.reader = {
      read: async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined };
        }
        const chunk = new TextEncoder().encode(chunks[index++]);
        return { done: false, value: chunk };
      },
      releaseLock: () => {}
    };
  }
  
  getReader() {
    return this.reader;
  }
}

describe('Streaming API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('streamRequest', () => {
    it('should make successful streaming request', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/event-stream'),
      };
      
      const mockBody = new MockReadableStream([
        'data: {"type": "content", "content": "Hello"}\n\n',
        'data: {"type": "content", "content": " World"}\n\n',
        'data: [DONE]\n\n'
      ]);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        body: mockBody,
        clone: () => ({
          headers: mockHeaders,
          body: mockBody,
        }),
      });

      const response = await streamRequest('/stream', {
        method: 'POST',
        body: { message: 'test' }
      });
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/stream'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ message: 'test' }),
        })
      );
    });

    it('should handle authentication errors in streaming', async () => {
      const mockLogout = vi.fn();
      setGlobalLogoutHandler(mockLogout);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: mockHeaders,
        clone: () => ({
          headers: mockHeaders,
        }),
      });

      await expect(streamRequest('/stream')).rejects.toThrow(AuthenticationError);
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: mockHeaders,
        json: async () => ({ message: 'Stream processing failed' }),
        clone: () => ({
          headers: mockHeaders,
        }),
      });

      await expect(streamRequest('/stream')).rejects.toThrow(APIError);
    });
  });

  describe('processSSEStream', () => {
    it('should process SSE messages correctly', async () => {
      const messages: any[] = [];
      let completed = false;
      
      const mockBody = new MockReadableStream([
        'data: {"type": "content", "content": "Hello"}\n\n',
        'data: {"type": "content", "content": " World"}\n\n',
        'data: [DONE]\n\n'
      ]);
      
      const mockResponse = {
        body: mockBody
      } as unknown as Response;

      await processSSEStream(mockResponse, {
        onMessage: (data) => messages.push(data),
        onComplete: () => { completed = true; }
      });

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ type: 'content', content: 'Hello' });
      expect(messages[1]).toEqual({ type: 'content', content: ' World' });
      expect(completed).toBe(true);
    });

    it('should handle non-JSON SSE messages', async () => {
      const messages: any[] = [];
      
      const mockBody = new MockReadableStream([
        'data: plain text message\n\n',
        'data: [DONE]\n\n'
      ]);
      
      const mockResponse = {
        body: mockBody
      } as unknown as Response;

      await processSSEStream(mockResponse, {
        onMessage: (data) => messages.push(data)
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toBe('plain text message');
    });

    it('should handle SSE parsing errors gracefully', async () => {
      const messages: any[] = [];
      const errors: Error[] = [];
      
      const mockBody = new MockReadableStream([
        'data: {"invalid": json}\n\n', // Invalid JSON
        'data: {"type": "content", "content": "valid"}\n\n',
        'data: [DONE]\n\n'
      ]);
      
      const mockResponse = {
        body: mockBody
      } as unknown as Response;

      // Mock console.warn to capture parsing errors
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await processSSEStream(mockResponse, {
        onMessage: (data) => messages.push(data),
        onError: (error) => errors.push(error)
      });

      // Should parse the raw content for invalid JSON
      expect(messages).toHaveLength(2);
      expect(messages[0]).toBe('{"invalid": json}');
      expect(messages[1]).toEqual({ type: 'content', content: 'valid' });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle streaming errors', async () => {
      const errors: Error[] = [];
      
      // Mock a stream that throws an error
      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Stream error')),
        releaseLock: vi.fn()
      };
      
      const mockResponse = {
        body: {
          getReader: () => mockReader
        }
      } as any;

      await expect(processSSEStream(mockResponse, {
        onError: (error) => errors.push(error)
      })).rejects.toThrow('Stream error');

      expect(errors).toHaveLength(1);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle null response body', async () => {
      const mockResponse = {
        body: null
      } as Response;

      await expect(processSSEStream(mockResponse)).rejects.toThrow('Response body is null');
    });
  });

  describe('api.stream and api.streamSSE', () => {
    it('should use stream method correctly', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/event-stream'),
      };
      
      const mockBody = new MockReadableStream(['data: test\n\n']);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        body: mockBody,
        clone: () => ({
          headers: mockHeaders,
          body: mockBody,
        }),
      });

      const response = await api.stream('/test', {
        method: 'POST',
        body: { test: 'data' }
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
        })
      );
    });

    it('should use streamSSE method with automatic processing', async () => {
      const messages: any[] = [];
      let completed = false;
      
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/event-stream'),
      };
      
      const mockBody = new MockReadableStream([
        'data: {"message": "hello"}\n\n',
        'data: [DONE]\n\n'
      ]);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        body: mockBody,
        clone: () => ({
          headers: mockHeaders,
          body: mockBody,
        }),
      });

      await api.streamSSE('/test', {
        method: 'POST',
        body: { test: 'data' },
        onMessage: (data) => messages.push(data),
        onComplete: () => { completed = true; }
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ message: 'hello' });
      expect(completed).toBe(true);
    });
  });
});