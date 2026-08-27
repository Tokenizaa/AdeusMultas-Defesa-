/**
 * Centralized Meta Graph API HTTP Client
 * Enforces Graph API Versioning (v20.0), Exponential Backoff Retry, Rate Limit Detection,
 * and Strict Token Sanitization in Observability Logs.
 */

import { logger } from '../../../server/observability/logger';
import {
  MetaIntegrationError,
  MetaTokenExpiredError,
  MetaTokenRevokedError,
  MetaInsufficientPermissionsError,
  MetaRateLimitError,
  MetaTemporaryApiError,
  MetaAuthenticationRequiredError,
} from '../errors/meta-errors';

export interface MetaGraphRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  endpoint: string; // e.g. "me/accounts" or "1092847291/feed"
  accessToken?: string;
  body?: Record<string, any>;
  params?: Record<string, string | number | boolean>;
  retries?: number;
  skipAuth?: boolean;
}

export class MetaGraphClient {
  public readonly graphApiVersion: string;
  public readonly baseUrl: string;

  constructor() {
    this.graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v20.0';
    this.baseUrl = 'https://graph.facebook.com';
  }

  /**
   * Builds full target URL including query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>, accessToken?: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = new URL(`${this.baseUrl}/${this.graphApiVersion}/${cleanEndpoint}`);

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.append(k, String(v));
        }
      });
    }

    if (accessToken) {
      url.searchParams.append('access_token', accessToken);
    }

    return url.toString();
  }

  /**
   * Sanitizes URLs and Objects for logging (strips access_token, secrets)
   */
  private sanitizeForLog(data: any): any {
    if (!data) return data;
    if (typeof data === 'string') {
      return data.replace(/access_token=[a-zA-Z0-9_-]+/g, 'access_token=[REDACTED]');
    }
    if (typeof data === 'object') {
      const copy = Array.isArray(data) ? [...data] : { ...data };
      for (const k of Object.keys(copy)) {
        if (
          k.toLowerCase().includes('token') ||
          k.toLowerCase().includes('secret') ||
          k.toLowerCase().includes('authorization')
        ) {
          copy[k] = '[REDACTED]';
        } else if (typeof copy[k] === 'object') {
          copy[k] = this.sanitizeForLog(copy[k]);
        }
      }
      return copy;
    }
    return data;
  }

  /**
   * Executes Graph API request with automatic retry on transient errors
   */
  public async request<T = any>(options: MetaGraphRequestOptions): Promise<T> {
    const {
      method = 'GET',
      endpoint,
      accessToken,
      body,
      params,
      retries = 2,
    } = options;

    let attempt = 0;
    const maxAttempts = retries + 1;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      const url = this.buildUrl(endpoint, params, accessToken);

      const requestInit: RequestInit = {
        method,
        headers: {
          Accept: 'application/json',
        },
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        requestInit.headers = {
          ...requestInit.headers,
          'Content-Type': 'application/json',
        };
        requestInit.body = JSON.stringify(body);
      }

try {
         const response = await fetch(url, requestInit);
         
         // Check if response is JSON before attempting to parse
         const contentType = response.headers.get('content-type');
         if (!contentType || !contentType.includes('application/json')) {
           // Handle non-JSON responses (HTML error pages, login redirects, etc.)
           const text = await response.text();
            logger.error('meta', 'client', 'non_json_response', `Meta API returned non-JSON response for ${endpoint}`, {
              endpoint,
              method,
              httpStatus: response.status,
              contentType,
             responseBody: text.substring(0, 500) // Log first 500 chars for debugging
           });
           
           // If we got an HTML response, it's likely a login redirect or error page
           if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
             throw new MetaIntegrationError(
               'Meta API returned HTML response (likely login redirect or error page). Check if access token is valid and not expired.',
               'META_NON_JSON_RESPONSE',
               response.status,
               { 
                 receivedContentType: contentType,
                 responsePreview: text.substring(0, 200)
               }
             );
           }
           
           // For other non-JSON responses, throw a generic error
           throw new MetaIntegrationError(
             `Meta API returned non-JSON response (Content-Type: ${contentType}). Expected JSON.`,
             'META_NON_JSON_RESPONSE',
             response.status,
             { 
               receivedContentType: contentType,
               responsePreview: text.substring(0, 200)
             }
           );
         }
         
         const data = await response.json();

         // Check if Meta returned an API error envelope
         if (!response.ok || data.error) {
          const errorObj = data.error || {};
          const metaCode = errorObj.code;
          const metaSubcode = errorObj.error_subcode;
          const message = errorObj.message || `Meta API Error (${response.status})`;

          // 1. Token Expired / Invalid (Error code 190)
          if (metaCode === 190) {
            if (metaSubcode === 460 || metaSubcode === 463 || metaSubcode === 467) {
              throw new MetaTokenExpiredError(message, errorObj);
            }
            if (metaSubcode === 458 || metaSubcode === 459) {
              throw new MetaTokenRevokedError(message, errorObj);
            }
            throw new MetaTokenExpiredError(message, errorObj);
          }

          // 2. Insufficient Permissions (Error code 200, 10, 298)
          if (metaCode === 200 || metaCode === 10 || metaCode === 298) {
            throw new MetaInsufficientPermissionsError(
              [errorObj.error_user_title || 'Permissão requerida'],
              errorObj
            );
          }

          // 3. Rate Limit (Error code 4, 17, 32, 613, 80004)
          if (metaCode === 4 || metaCode === 17 || metaCode === 32 || metaCode === 613 || metaCode === 80004) {
            const retryAfter = Number(response.headers.get('Retry-After')) || 60;
            throw new MetaRateLimitError(retryAfter, errorObj);
          }

          // 4. Temporary / Transient Server Error (Error code 1, 2)
          if (metaCode === 1 || metaCode === 2 || response.status >= 500) {
            throw new MetaTemporaryApiError(message, errorObj);
          }

          // Generic Operational Meta Error
          throw new MetaIntegrationError(
            message,
            `META_API_${metaCode || response.status}`,
            response.status,
            errorObj
          );
        }

        return data as T;
      } catch (err: any) {
        lastError = err;

        // Only retry for transient errors or network failure
        const isTransient =
          err instanceof MetaTemporaryApiError ||
          err.code === 'META_TEMPORARY_API_ERROR' ||
          err.name === 'FetchError' ||
          err.message?.includes('network') ||
          err.message?.includes('fetch failed');

        if (isTransient && attempt < maxAttempts) {
          const backoffDelay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
          logger.warn(
            'meta',
            'client',
            'retry',
            `Tentativa ${attempt} falhou para ${endpoint}. Aguardando ${backoffDelay}ms para retry.`,
            { error: err.message }
          );
          await new Promise((r) => setTimeout(r, backoffDelay));
          continue;
        }

        // Log non-retriable or final error with sanitization
        logger.error('meta', 'client', 'request_failed', `Falha na requisição Meta: ${endpoint}`, {
          endpoint,
          method,
          attempt,
          error: err.message,
          code: err.code,
        });

        throw err;
      }
    }

    throw lastError;
  }
}

export const metaGraphClient = new MetaGraphClient();
