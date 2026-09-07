import { supabase } from '../supabase';
import type { Database } from '../../types/supabase';

/**
 * API Client - Centralized fetch wrapper with auth, error handling, retries, and timeouts.
 */
class ApiClient {
  private baseUrl: string;
  private maxRetries: number = 3;
  private timeoutSeconds: number = 10;

  constructor(baseUrl: string = '', maxRetries: number = 3, timeoutSeconds: number = 10) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.maxRetries = maxRetries;
    this.timeoutSeconds = timeoutSeconds;
  }

  private async fetchWithRetry<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), this.timeoutSeconds * 1000);

        const headers = new Headers(options.headers);
        const token = await this.getAuthToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        if (options.body && !(options.body instanceof FormData)) {
          if (typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
            headers.set('Content-Type', 'application/json');
          }
        }

        const response = await fetch(url, {
          ...options,
          headers,
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch {
            errorMessage = await response.text() || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Expected JSON response');
        }
        return await response.json();
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || '');
        const isNetworkOrTimeout =
          error?.name === 'AbortError' ||
          error?.name === 'TypeError' ||
          msg.includes('Failed to fetch') ||
          msg.includes('fetch failed') ||
          msg.includes('NetworkError') ||
          msg.includes('network') ||
          msg.includes('Expected JSON response') ||
          msg.includes('Load failed');

        if (attempt < this.maxRetries && isNetworkOrTimeout) {
          await new Promise(resolve => setTimeout(resolve, Math.max(100, Math.pow(2, attempt) * 200)));
          continue;
        }
        break;
      }
    }

    throw lastError;
  }

  /** Returns only a real Supabase access token, never a locally synthesized token. */
  private async getAuthToken(): Promise<string | null> {
    try {
      if (!supabase) return null;
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch (error) {
      console.warn('Failed to get auth token from Supabase:', error);
      return null;
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.fetchWithRetry<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.fetchWithRetry<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.fetchWithRetry<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.fetchWithRetry<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.fetchWithRetry<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient('');
export type { ApiClient };
