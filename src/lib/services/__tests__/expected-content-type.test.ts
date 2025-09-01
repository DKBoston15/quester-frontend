/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Expected Content Type Functionality', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('Auto content type detection', () => {
    it('should automatically parse JSON responses', async () => {
      const mockData = { message: 'success', data: [1, 2, 3] };
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockData),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test'); // Uses auto detection by default
      
      expect(result).toEqual(mockData);
      expect(typeof result).toBe('object');
    });

    it('should automatically detect and return text responses', async () => {
      const mockText = 'This is plain text content';
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/plain'),
        entries: vi.fn().mockReturnValue([['content-type', 'text/plain']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => mockText,
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test', { expectedContentType: 'auto' });
      
      expect(result).toBe(mockText);
      expect(typeof result).toBe('string');
    });

    it('should automatically detect and return blob responses', async () => {
      const mockBlob = new Blob(['binary data'], { type: 'image/png' });
      const mockHeaders = {
        get: vi.fn().mockReturnValue('image/png'),
        entries: vi.fn().mockReturnValue([['content-type', 'image/png']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        blob: async () => mockBlob,
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test', { expectedContentType: 'auto' });
      
      expect(result).toBeInstanceOf(Blob);
      expect((result as Blob).type).toBe('image/png');
    });
  });

  describe('Explicit content type specification', () => {
    it('should force JSON parsing when expectedContentType is json', async () => {
      const mockData = { forced: 'json' };
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/plain'), // Server says text/plain
        entries: vi.fn().mockReturnValue([['content-type', 'text/plain']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockData),
        clone: () => ({ headers: mockHeaders }),
      });

      // Force JSON parsing despite text/plain content-type
      const result = await api.get('/test', { expectedContentType: 'json' });
      
      expect(result).toEqual(mockData);
      expect(typeof result).toBe('object');
    });

    it('should force text parsing when expectedContentType is text', async () => {
      const jsonString = '{"this": "looks like json"}';
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'), // Server says JSON
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => jsonString,
        clone: () => ({ headers: mockHeaders }),
      });

      // Force text parsing despite application/json content-type
      const result = await api.get('/test', { expectedContentType: 'text' });
      
      expect(result).toBe(jsonString);
      expect(typeof result).toBe('string');
    });

    it('should force blob parsing when expectedContentType is blob', async () => {
      const mockBlob = new Blob(['some data'], { type: 'application/octet-stream' });
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'), // Server says JSON
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        blob: async () => mockBlob,
        clone: () => ({ headers: mockHeaders }),
      });

      // Force blob parsing despite application/json content-type
      const result = await api.get('/test', { expectedContentType: 'blob' });
      
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('Error handling with different content types', () => {
    it('should throw proper error for invalid JSON when expecting JSON', async () => {
      const invalidJson = '{"invalid": json}';
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => invalidJson,
        clone: () => ({ headers: mockHeaders }),
      });

      await expect(
        api.get('/test', { expectedContentType: 'json', timeout: 1000, retries: 0 })
      ).rejects.toThrow('Invalid JSON response from server');
    });

    it('should handle empty responses gracefully', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '',
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test', { expectedContentType: 'json' });
      
      expect(result).toEqual({});
    });

    it('should handle text responses with empty content', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/plain'),
        entries: vi.fn().mockReturnValue([['content-type', 'text/plain']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => '',
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test', { expectedContentType: 'text' });
      
      expect(result).toBe('');
    });
  });

  describe('Content type detection edge cases', () => {
    it('should default to JSON for unknown content types in auto mode', async () => {
      const mockData = { fallback: 'json' };
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/unknown-type'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/unknown-type']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockData),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test', { expectedContentType: 'auto' });
      
      expect(result).toEqual(mockData);
    });

    it('should handle missing content-type header', async () => {
      const mockData = { no: 'header' };
      const mockHeaders = {
        get: vi.fn().mockReturnValue(null), // No content-type header
        entries: vi.fn().mockReturnValue([]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockData),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get('/test', { expectedContentType: 'auto' });
      
      // Should default to JSON parsing
      expect(result).toEqual(mockData);
    });

    it('should detect various blob content types', async () => {
      const blobTypes = [
        'application/octet-stream',
        'image/jpeg',
        'image/png',
        'audio/mp3',
        'video/mp4'
      ];

      for (const contentType of blobTypes) {
        const mockBlob = new Blob(['data'], { type: contentType });
        const mockHeaders = {
          get: vi.fn().mockReturnValue(contentType),
          entries: vi.fn().mockReturnValue([['content-type', contentType]]),
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: mockHeaders,
          blob: async () => mockBlob,
          clone: () => ({ headers: mockHeaders }),
        });

        const result = await api.get('/test', { expectedContentType: 'auto' });
        
        expect(result).toBeInstanceOf(Blob);
        expect((result as Blob).type).toBe(contentType);
        
        // Clear mock for next iteration
        mockFetch.mockClear();
      }
    });

    it('should detect various text content types', async () => {
      const textTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript'
      ];

      for (const contentType of textTypes) {
        const mockText = `Content of type ${contentType}`;
        const mockHeaders = {
          get: vi.fn().mockReturnValue(contentType),
          entries: vi.fn().mockReturnValue([['content-type', contentType]]),
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: mockHeaders,
          text: async () => mockText,
          clone: () => ({ headers: mockHeaders }),
        });

        const result = await api.get('/test', { expectedContentType: 'auto' });
        
        expect(result).toBe(mockText);
        expect(typeof result).toBe('string');
        
        // Clear mock for next iteration
        mockFetch.mockClear();
      }
    });
  });

  describe('Integration with other API methods', () => {
    it('should work with POST requests', async () => {
      const mockText = 'POST response as text';
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/plain'),
        entries: vi.fn().mockReturnValue([['content-type', 'text/plain']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: mockHeaders,
        text: async () => mockText,
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.post('/test', { data: 'test' }, { expectedContentType: 'text' });
      
      expect(result).toBe(mockText);
    });

    it('should work with PUT requests', async () => {
      const mockBlob = new Blob(['updated'], { type: 'application/octet-stream' });
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/octet-stream'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/octet-stream']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        blob: async () => mockBlob,
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.put('/test', { data: 'test' }, { expectedContentType: 'blob' });
      
      expect(result).toBeInstanceOf(Blob);
    });

    it('should work with PATCH requests', async () => {
      const mockData = { patched: true };
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
        entries: vi.fn().mockReturnValue([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockData),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.patch('/test', { data: 'test' }, { expectedContentType: 'json' });
      
      expect(result).toEqual(mockData);
    });

    it('should work with DELETE requests', async () => {
      const mockText = 'Resource deleted';
      const mockHeaders = {
        get: vi.fn().mockReturnValue('text/plain'),
        entries: vi.fn().mockReturnValue([['content-type', 'text/plain']]),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => mockText,
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.delete('/test', { expectedContentType: 'text' });
      
      expect(result).toBe(mockText);
    });
  });
});