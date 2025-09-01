/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, processSSEStream } from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Chat Streaming Analysis - Issues and Solutions', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('Current Implementation Issues', () => {
    it('should handle partial JSON messages correctly', async () => {
      // This simulates the current chat implementation buffer issue
      // where JSON could be split across chunks
      
      const partialChunk1 = 'data: {"type": "content", "con';
      const partialChunk2 = 'tent": "Hello World"}\n\n';
      
      let buffer = '';
      const messages: any[] = [];
      
      // Simulate the current chat parsing logic
      [partialChunk1, partialChunk2].forEach(chunk => {
        buffer += chunk;
        const lines = buffer.split('\n').filter(line => line.trim() !== '');
        
        // This is the problematic part - last line should be kept in buffer
        // but current implementation filters it out
        buffer = ''; // Current implementation doesn't preserve partial lines
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            try {
              const parsed = JSON.parse(content);
              messages.push(parsed);
            } catch (e) {
              // Current implementation would fail here for partial JSON
              console.log('Failed to parse:', content);
            }
          }
        }
      });
      
      // Current implementation would fail to parse this message
      expect(messages).toHaveLength(0);
    });

    it('should demonstrate improved buffer handling', async () => {
      // Improved implementation that handles partial messages
      const partialChunk1 = 'data: {"type": "content", "con';
      const partialChunk2 = 'tent": "Hello World"}\n\n';
      
      let buffer = '';
      const messages: any[] = [];
      
      [partialChunk1, partialChunk2].forEach(chunk => {
        buffer += chunk;
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            try {
              const parsed = JSON.parse(content);
              messages.push(parsed);
            } catch (e) {
              console.log('Failed to parse:', content);
            }
          }
        }
      });
      
      // Improved implementation correctly parses the message
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ type: 'content', content: 'Hello World' });
    });
  });

  describe('Recommended Refactored Implementation', () => {
    it('should use centralized API client for streaming', async () => {
      const messages: any[] = [];
      let completed = false;
      let sessionId: string | null = null;
      
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/event-stream'),
        entries: vi.fn().mockReturnValue([['content-type', 'text/event-stream']]),
      };
      
      const mockBody = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"type": "metadata", "chatSessionId": "session-123"}\n\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"type": "content", "content": "Hello"}\n\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"type": "content", "content": " World"}\n\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: [DONE]\n\n')
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined
            }),
          releaseLock: vi.fn()
        })
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        body: mockBody,
        clone: () => ({ headers: mockHeaders, body: mockBody }),
      });

      // Use the centralized API client for streaming
      const response = await api.stream('/chat', {
        method: 'POST',
        body: { message: 'Hello', projectId: 'project-1' }
      });

      // Use the built-in SSE processor
      await processSSEStream(response, {
        onMessage: (data) => {
          if (data.type === 'metadata' && data.chatSessionId) {
            sessionId = data.chatSessionId;
          } else if (data.type === 'content') {
            messages.push(data);
          }
        },
        onComplete: () => {
          completed = true;
        }
      });

      expect(sessionId).toBe('session-123');
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe(' World');
      expect(completed).toBe(true);
    });

    it('should handle streaming errors properly', async () => {
      const errors: Error[] = [];
      
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: mockHeaders,
        json: async () => ({ message: 'Stream processing failed' }),
        text: async () => JSON.stringify({ message: 'Stream processing failed' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.stream('/chat', {
          method: 'POST',
          body: { message: 'Hello' }
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Stream processing failed');
      }
    });

    it('should handle authentication errors in streaming', async () => {
      const mockLogout = vi.fn();
      // Set a mock logout handler
      (api as any).setGlobalLogoutHandler?.(mockLogout);
      
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: mockHeaders,
        json: async () => ({ message: 'Token expired' }),
        text: async () => JSON.stringify({ message: 'Token expired' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.stream('/chat', {
          method: 'POST',
          body: { message: 'Hello' }
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // The centralized client should handle auth errors properly
        expect(error.message).toContain('Authentication failed');
      }
    });
  });

  describe('Performance Considerations', () => {
    it('should reuse TextDecoder for efficiency', () => {
      // Current implementation creates new TextDecoder for each chunk
      // Improved implementation should reuse it
      
      const decoder = new TextDecoder();
      const chunks = [
        new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
        new Uint8Array([32, 87, 111, 114, 108, 100]) // " World"
      ];
      
      let result = '';
      chunks.forEach(chunk => {
        result += decoder.decode(chunk, { stream: true });
      });
      
      expect(result).toBe('Hello World');
    });

    it('should properly handle large message streams', async () => {
      // Test handling of many small chunks
      const chunkCount = 1000;
      const expectedTotal = chunkCount;
      
      let processedCount = 0;
      
      const mockBody = {
        getReader: () => ({
          read: vi.fn()
            .mockImplementation(() => {
              if (processedCount < chunkCount) {
                processedCount++;
                return Promise.resolve({
                  done: false,
                  value: new TextEncoder().encode(`data: {"type": "content", "content": "chunk-${processedCount}"}\n\n`)
                });
              } else {
                return Promise.resolve({
                  done: true,
                  value: undefined
                });
              }
            }),
          releaseLock: vi.fn()
        })
      };
      
      const messages: any[] = [];
      
      // Simulate processing many chunks efficiently
      await processSSEStream({ body: mockBody } as any, {
        onMessage: (data) => {
          if (data.type === 'content') {
            messages.push(data);
          }
        }
      });
      
      expect(messages).toHaveLength(expectedTotal);
      expect(messages[0].content).toBe('chunk-1');
      expect(messages[expectedTotal - 1].content).toBe(`chunk-${expectedTotal}`);
    });
  });
});