/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface ValidationError {
  field: string;
  message: string;
}

describe('TypeScript Generics and Type Safety', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('GET requests with generics', () => {
    it('should return correctly typed responses for GET requests', async () => {
      const mockUser: User = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockUser),
        clone: () => ({ headers: mockHeaders }),
      });

      // TypeScript should infer the return type as User
      const result = await api.get<User>('/users/1');
      
      expect(result).toEqual(mockUser);
      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      
      // These properties should be available with TypeScript autocomplete
      const userId: number = result.id;
      const userName: string = result.name;
      const userEmail: string = result.email;
      
      expect(userId).toBe(1);
      expect(userName).toBe('John Doe');
      expect(userEmail).toBe('john@example.com');
    });

    it('should handle paginated responses with nested generics', async () => {
      const mockUsers: User[] = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ];

      const mockResponse: PaginatedResponse<User> = {
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10
      };

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockResponse),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.get<PaginatedResponse<User>>('/users');
      
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      
      // TypeScript should know that data is an array of User objects
      const firstUser: User = result.data[0];
      expect(firstUser.id).toBe(1);
      expect(firstUser.name).toBe('John Doe');
    });
  });

  describe('POST requests with generics', () => {
    it('should handle typed request and response bodies', async () => {
      const createRequest: CreateUserRequest = {
        name: 'New User',
        email: 'newuser@example.com'
      };

      const mockResponse: User = {
        id: 3,
        name: 'New User',
        email: 'newuser@example.com'
      };

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockResponse),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.post<User>('/users', createRequest);
      
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe(3);
      expect(result.name).toBe('New User');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createRequest),
        })
      );
    });
  });

  describe('PUT and PATCH requests with generics', () => {
    it('should handle typed PUT requests', async () => {
      const updateRequest: Partial<User> = {
        name: 'Updated Name'
      };

      const mockResponse: User = {
        id: 1,
        name: 'Updated Name',
        email: 'john@example.com'
      };

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockResponse),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.put<User>('/users/1', updateRequest);
      
      expect(result.name).toBe('Updated Name');
      expect(result.id).toBe(1);
    });

    it('should handle typed PATCH requests', async () => {
      const patchRequest: Partial<User> = {
        email: 'newemail@example.com'
      };

      const mockResponse: User = {
        id: 1,
        name: 'John Doe',
        email: 'newemail@example.com'
      };

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockResponse),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.patch<User>('/users/1', patchRequest);
      
      expect(result.email).toBe('newemail@example.com');
      expect(result.id).toBe(1);
    });
  });

  describe('DELETE requests with generics', () => {
    it('should handle typed DELETE responses', async () => {
      interface DeleteResponse {
        message: string;
        deletedId: number;
      }

      const mockResponse: DeleteResponse = {
        message: 'User deleted successfully',
        deletedId: 1
      };

      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockResponse),
        clone: () => ({ headers: mockHeaders }),
      });

      const result = await api.delete<DeleteResponse>('/users/1');
      
      expect(result.message).toBe('User deleted successfully');
      expect(result.deletedId).toBe(1);
    });
  });

  describe('Error handling with types', () => {
    it('should maintain type safety even when errors occur', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: mockHeaders,
        json: async () => ({ 
          message: 'Validation failed',
          errors: [
            { field: 'email', message: 'Email is required' }
          ] as ValidationError[]
        }),
        text: async () => JSON.stringify({ 
          message: 'Validation failed',
          errors: [{ field: 'email', message: 'Email is required' }]
        }),
        clone: () => ({ headers: mockHeaders }),
      });

      try {
        await api.post<User>('/users', { name: 'Invalid User' } as CreateUserRequest, {
          preserveErrorDetail: true,
          timeout: 1000,
          retries: 0
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Validation failed');
        expect(error.status).toBe(400);
      }
    });
  });

  describe('Empty response handling', () => {
    it('should handle empty responses correctly', async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue('application/json'),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: mockHeaders,
        text: async () => '',
        clone: () => ({ headers: mockHeaders }),
      });

      // Should return empty object for empty responses
      const result = await api.delete('/users/1');
      expect(result).toEqual({});
    });
  });
});