import { vi } from 'vitest';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn()
  }
};

// Mock fetch
global.fetch = vi.fn();

// Mock the supabase import before importing ApiClient
vi.mock('../supabase', () => ({
  supabase: mockSupabase
}));

import { ApiClient } from '../client';
import type { ApiClient as ApiClientType } from '../client';

describe('ApiClient', () => {
  let apiClient: ApiClientType;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSupabase
    (mockSupabase.auth.getSession as Mock).mockResolvedValue({ session: null });
    
    // Create API client instance
    apiClient = new ApiClient('https://api.test.com', 2, 5);
  });

  describe('Authentication', () => {
    test('injects token when Supabase session exists', async () => {
      const mockToken = 'test-token-123';
      (mockSupabase.auth.getSession as Mock).mockResolvedValue({ 
        session: { access_token: mockToken } 
      });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });

      await apiClient.get<string>('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`
          })
        })
      );
    });

    test('does not inject token when not authenticated', async () => {
      (mockSupabase.auth.getSession as Mock).mockResolvedValue({ session: null });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });

      await apiClient.get<string>('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String)
          })
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    test('GET method works correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: 'test' })
      });

      const result = await apiClient.get<string>('/endpoint');
      expect(result).toEqual({ data: 'test' });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('POST method works correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ id: 123 })
      });

const result = await apiClient.post<number>('/endpoint', { name: 'test' });
       expect(result).toEqual({ id: 123 });
expect(fetch).toHaveBeenCalledWith(
         'https://api.test.com/endpoint',
         expect.objectContaining({
           method: 'POST',
           body: JSON.stringify({ name: 'test' })
         })
       );
    });

    test('PUT method works correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ updated: true })
      });

const result = await apiClient.put<boolean>('/endpoint', { value: 'new' });
       expect(result).toEqual({ updated: true });
       expect(fetch).toHaveBeenCalledWith(
         'https://api.test.com/endpoint',
         expect.objectContaining({
           method: 'PUT',
           body: JSON.stringify({ value: 'new' })
         })
       );
    });

    test('PATCH method works correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ patched: true })
      });

const result = await apiClient.patch<boolean>('/endpoint', { field: 'value' });
       expect(result).toEqual({ patched: true });
       expect(fetch).toHaveBeenCalledWith(
         'https://api.test.com/endpoint',
         expect.objectContaining({
           method: 'PATCH',
           body: JSON.stringify({ field: 'value' })
         })
       );
    });

    test('DELETE method works correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ deleted: true })
      });

      const result = await apiClient.delete<boolean>('/endpoint');
      expect(result).toEqual({ deleted: true });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    test('handles query parameters correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ results: [] })
      });

      await apiClient.get('/search?q=test&limit=10');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/search?q=test&limit=10',
        expect.any(Object)
      );
    });
  });

  describe('Request/Response Handling', () => {
    test('automatically parses JSON responses', async () => {
      const mockResponse = { message: 'Hello', count: 42 };
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await apiClient.get<typeof mockResponse>('/test');
      expect(result).toEqual(mockResponse);
    });

    test('automatically stringifies JSON request bodies', async () => {
      const postData = { user: 'john', age: 30 };
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ received: true })
      });

      await apiClient.post('/submit', postData);
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/submit',
        expect.objectContaining({
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('handles non-JSON data (FormData)', async () => {
      const formData = new FormData();
      formData.append('file', 'test-content', 'test.txt');
      formData.append('username', 'testuser');
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ uploaded: true })
      });

      await apiClient.post<boolean>('/upload', formData);
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/upload',
        expect.objectContaining({
          body: formData
        })
      );
      // FormData should not be stringified or have Content-Type set to application/json
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/upload',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('throws error for HTTP 4xx statuses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      });

      await expect(apiClient.get('/missing')).rejects.toThrow('HTTP 404');
    });

    test('throws error for HTTP 5xx statuses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' })
      });

      await expect(apiClient.get('/error')).rejects.toThrow('Internal Server Error');
    });

    test('throws error for invalid JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'Invalid JSON'
      });

      await expect(apiClient.get('/invalid-json')).rejects.toThrow('Expected JSON response');
    });
  });

describe('Retry Mechanism', () => {
     test('retries on network errors', async () => {
       // First call fails with network error, second succeeds
       fetch
         .mockRejectedValueOnce(new Error('NetworkError: Failed to fetch'))
         .mockResolvedValueOnce({
           ok: true,
           headers: new Map([['content-type', 'application/json']]),
           json: async () => ({ success: true })
         });

       const result = await apiClient.get('/retry-test');
       expect(result).toEqual({ success: true });
       expect(fetch).toHaveBeenCalledTimes(2);
     });

    test('does not retry on 4xx errors (client errors)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      await expect(apiClient.get('/bad-request')).rejects.toThrow('HTTP 400');
      expect(fetch).toHaveBeenCalledTimes(1); // Should not retry
    });

    test('respects maximum retry attempts', async () => {
      // Always fail with network error
      fetch.mockRejectedValue(new Error('NetworkError: Failed to fetch'));

      await expect(apiClient.get('/always-fail')).rejects.toThrow();
      // Initial attempt + maxRetries (2) = 3 total calls
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('implements exponential backoff', async () => {
      const delaySpy = vi.spyOn(global, 'setTimeout');
      fetch.mockRejectedValue(new Error('NetworkError: Failed to fetch'));

      try {
        await apiClient.get('/backoff-test');
      } catch (e) {
        // Expected to fail
      }

      // Should have called setTimeout with delays: 0ms (attempt 0), 100ms (attempt 1), 200ms (attempt 2)
      expect(delaySpy).toHaveBeenCalledWith(expect.any(Function), 0); // 2^0 * 100
      expect(delaySpy).toHaveBeenCalledWith(expect.any(Function), 100); // 2^1 * 100
      expect(delaySpy).toHaveBeenCalledWith(expect.any(Function), 200); // 2^2 * 100
    });
  });

  describe('Timeout Handling', () => {
    test('times out after configured duration', async () => {
      // Mock a request that never resolves
      const fetchPromise = fetch.mockImplementation(() => 
        new Promise(() => {})); // Never resolve
    
      const timeoutPromise = apiClient.get('/timeout-test');
      
      await expect(timeoutPromise).rejects.toThrow();
      
      // Clean up
      vi.runAllTimers();
    });

test('clears timeout on successful request', async () => {
       const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
       fetch.mockResolvedValueOnce({
         ok: true,
         headers: new Map([['content-type', 'application/json']]),
         json: async () => {
           return { success: true };
         }
       });

       await apiClient.get('/clear-timeout');
       expect(clearTimeoutSpy).toHaveBeenCalled();
     });
  });

  describe('AbortController', () => {
    test('requests can be aborted', async () => {
      // This test would require mocking AbortController, which is complex
      // For now, we'll verify the abort signal is passed to fetch
      const abortControllerMock = {
        signal: {},
        abort: vi.fn()
      };
      
      const AbortControllerMock = vi.fn(() => abortControllerMock);
      global.AbortController = AbortControllerMock;
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });

      await apiClient.get('/abort-test');
      
      expect(AbortControllerMock).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/abort-test',
        expect.objectContaining({
          signal: abortControllerMock.signal
        })
      );
    });
  });
});