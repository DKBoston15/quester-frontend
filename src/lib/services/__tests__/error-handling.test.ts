/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  api, 
  APIError, 
  AuthenticationError, 
  setGlobalLogoutHandler,
  getErrorMessage,
  isAuthError
} from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Error Handling and Authentication', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('Error Context Preservation', () => {
    it('should preserve detailed error messages from backend', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: mockHeaders,
        json: async () => ({ 
          message: 'Validation failed: Email is required',
          code: 'VALIDATION_ERROR',
          details: { field: 'email', rule: 'required' }
        }),
        text: async () => JSON.stringify({ 
          message: 'Validation failed: Email is required',
          code: 'VALIDATION_ERROR'
        }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.post('/users', { name: 'John' }, { preserveErrorDetail: true });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(APIError);
        expect(error.message).toBe('Validation failed: Email is required');
        expect((error as APIError).status).toBe(400);
        expect((error as APIError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle server error messages in different content types', async () => {
      const testCases = [
        {
          contentType: 'text/plain',
          response: 'Server is temporarily unavailable',
          expectedMessage: 'Server is temporarily unavailable'
        },
        {
          contentType: 'text/html',
          response: '<html><head><title>Service Unavailable</title></head></html>',
          expectedMessage: 'Service Unavailable'
        },
        {
          contentType: 'application/json',
          response: JSON.stringify({ error: 'Database connection failed' }),
          expectedMessage: 'Database connection failed'
        }
      ];

      for (const testCase of testCases) {
        const mockHeaders = {
          get: vi.fn().mockReturnValue(testCase.contentType),
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: mockHeaders,
          text: async () => testCase.response,
          json: async () => testCase.contentType === 'application/json' 
            ? JSON.parse(testCase.response) 
            : null,
          clone: () => ({ headers: mockHeaders }),
        });

        try {
          await api.get('/health', { preserveErrorDetail: true, timeout: 1000, retries: 0 });
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error).toBeInstanceOf(APIError);
          expect(error.message).toBe(testCase.expectedMessage);
        }
      }
    });

    it('should fall back to status text when no error message available', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: mockHeaders,
        text: async () => '',
        json: async () => ({}),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.get('/missing', { preserveErrorDetail: true });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(APIError);
        expect(error.message).toBe('Not Found');
      }
    });
  });

  describe('Authentication Error Handling', () => {
    it('should trigger global logout on 401 errors', async () => {
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
        json: async () => ({ message: 'Token expired' }),
        text: async () => JSON.stringify({ message: 'Token expired' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.get('/protected');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe('Token expired');
        expect(mockLogout).toHaveBeenCalledOnce();
        expect(isAuthError(error)).toBe(true);
      }
    });

    it('should trigger global logout on 403 errors', async () => {
      const mockLogout = vi.fn();
      setGlobalLogoutHandler(mockLogout);

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: mockHeaders,
        json: async () => ({ message: 'Insufficient permissions' }),
        text: async () => JSON.stringify({ message: 'Insufficient permissions' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.get('/admin');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe('Insufficient permissions');
        expect(mockLogout).toHaveBeenCalledOnce();
        expect(isAuthError(error)).toBe(true);
      }
    });

    it('should skip auth check for specific endpoints', async () => {
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
        json: async () => ({ message: 'Invalid credentials' }),
        text: async () => JSON.stringify({ message: 'Invalid credentials' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.post('/auth/login', { email: 'test', password: 'wrong' }, { 
          skipAuthCheck: true, 
          preserveErrorDetail: true,
          timeout: 1000,
          retries: 0
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(APIError);
        expect(error.message).toBe('Invalid credentials');
        // Global logout should NOT be called for auth endpoints
        expect(mockLogout).not.toHaveBeenCalled();
        expect(isAuthError(error)).toBe(false);
      }
    });

    it('should warn when no global logout handler is set', async () => {
      // Reset the logout handler
      setGlobalLogoutHandler(null as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: mockHeaders,
        json: async () => ({ message: 'Session expired' }),
        text: async () => JSON.stringify({ message: 'Session expired' }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.get('/protected');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('No global logout handler registered')
        );
      }

      consoleSpy.mockRestore();
    });
  });

  describe('getErrorMessage utility', () => {
    it('should extract message from APIError', () => {
      const error = new APIError('Validation failed', 400, 'VALIDATION_ERROR');
      expect(getErrorMessage(error)).toBe('Validation failed');
    });

    it('should extract message from AuthenticationError', () => {
      const error = new AuthenticationError('Token expired', 401);
      expect(getErrorMessage(error)).toBe('Token expired');
    });

    it('should extract message from generic Error', () => {
      const error = new Error('Network timeout');
      expect(getErrorMessage(error)).toBe('Network timeout');
    });

    it('should handle unknown error types', () => {
      const error = { unexpected: 'error object' };
      expect(getErrorMessage(error)).toBe('An unexpected error occurred');
    });

    it('should handle null/undefined errors', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    });
  });

  describe('isAuthError utility', () => {
    it('should identify AuthenticationError instances', () => {
      const authError = new AuthenticationError('Unauthorized', 401);
      const apiError = new APIError('Bad request', 400);
      const genericError = new Error('Network error');

      expect(isAuthError(authError)).toBe(true);
      expect(isAuthError(apiError)).toBe(false);
      expect(isAuthError(genericError)).toBe(false);
      expect(isAuthError(null)).toBe(false);
    });
  });
});