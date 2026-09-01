/**
 * Documenso API Client
 * Wrapper around fetch for Documenso API v2 (Envelope-based)
 * @see https://docs.documenso.com/docs/developers/api
 */

import {
  CreateEnvelopeRequest,
  EnvelopeResponse,
  EnvelopeStatus,
  SigningUrlResponse,
  DocumensoError,
  DOCUMENSO_BASE_PATH,
  DOCUMENSO_ENDPOINTS,
  ListEnvelopesQuery,
  ListEnvelopesResponse,
  EmbeddingTokenRequest,
  EmbeddingTokenResponse,
  DocumensoConfig,
  WebhookEvent,
} from '@/types/documenso';
import { logger, LogService } from '@/server/observability/logger';
import crypto from 'crypto';

/**
 * Documenso API Client for v2 Envelope API
 */
export class DocumensoClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly webhookSecret: string;
  private readonly webhookUrl: string;

  constructor(config: DocumensoConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
    this.webhookSecret = config.webhookSecret;
    this.webhookUrl = config.webhookUrl;
  }

  /**
   * Create a new envelope with documents, recipients, and fields
   */
  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResponse> {
    logger.info('documenso' as LogService, 'client', 'create-envelope', 'Creating Documenso envelope', {
      externalId: request.externalId,
      title: request.title,
      recipientsCount: request.recipients.length,
      documentsCount: request.documents.length,
      status: 'pending',
    });

    const response = await this.request<EnvelopeResponse>(
      DOCUMENSO_ENDPOINTS.ENVELOPES,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    logger.info('documenso' as LogService, 'client', 'create-envelope', 'Documenso envelope created', {
      envelopeId: response.id,
      externalId: request.externalId,
      envelopeStatus: response.status,
      status: 'success',
    });

    return response;
  }

  /**
   * Get envelope by ID
   */
  async getEnvelope(envelopeId: string): Promise<EnvelopeResponse> {
    return this.request<EnvelopeResponse>(DOCUMENSO_ENDPOINTS.ENVELOPE_BY_ID(envelopeId));
  }

  /**
   * Send envelope for signing
   */
  async sendEnvelope(envelopeId: string): Promise<EnvelopeResponse> {
    logger.info('documenso' as LogService, 'client', 'send-envelope', 'Sending Documenso envelope', { envelopeId, status: 'pending' });

    const response = await this.request<EnvelopeResponse>(
      DOCUMENSO_ENDPOINTS.ENVELOPE_SEND(envelopeId),
      { method: 'POST' }
    );

    logger.info('documenso' as LogService, 'client', 'send-envelope', 'Documenso envelope sent', { envelopeId, envelopeStatus: response.status, status: 'success' });

    return response;
  }

  /**
   * Download completed envelope PDF
   */
  async downloadEnvelope(envelopeId: string): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}${DOCUMENSO_BASE_PATH}${DOCUMENSO_ENDPOINTS.ENVELOPE_DOWNLOAD(envelopeId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw DocumensoError.fromResponse(response.status, error);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get signing URL for a specific recipient
   */
  async getSigningUrl(envelopeId: string, recipientId: string): Promise<SigningUrlResponse> {
    return this.request<SigningUrlResponse>(
      DOCUMENSO_ENDPOINTS.ENVELOPE_SIGNING_URL(envelopeId, recipientId)
    );
  }

  /**
   * List envelopes with optional filters
   */
  async listEnvelopes(query: ListEnvelopesQuery = {}): Promise<ListEnvelopesResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.status) params.set('status', query.status);
    if (query.externalId) params.set('externalId', query.externalId);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<ListEnvelopesResponse>(`${DOCUMENSO_ENDPOINTS.ENVELOPES}${queryString}`);
  }

  /**
   * Delete envelope
   */
  async deleteEnvelope(envelopeId: string): Promise<void> {
    await this.request(DOCUMENSO_ENDPOINTS.ENVELOPE_BY_ID(envelopeId), {
      method: 'DELETE',
    });
  }

  /**
   * Create embedding presign token for iframe signing
   */
  async createEmbeddingToken(request: EmbeddingTokenRequest): Promise<EmbeddingTokenResponse> {
    return this.request<EmbeddingTokenResponse>(
      DOCUMENSO_ENDPOINTS.EMBEDDING_TOKEN,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, receivedSecret: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('documenso' as LogService, 'client', 'verify-webhook', 'Webhook secret not configured, rejecting webhook');
      return false;
    }

    if (!receivedSecret) {
      logger.warn('documenso' as LogService, 'client', 'verify-webhook', 'No signature header received');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison
    const receivedBuffer = Buffer.from(receivedSecret);
    const expectedBuffer = Buffer.from(expected);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  /**
   * Get webhook configuration
   */
  getWebhookConfig(): { secret: string; url: string } {
    return {
      secret: this.webhookSecret,
      url: this.webhookUrl,
    };
  }

  /**
   * Internal request helper
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${DOCUMENSO_BASE_PATH}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      logger.error('documenso' as LogService, 'client', 'request', 'Documenso API error', { path, httpStatus: response.status, error: errorData, status: 'failed' });

      throw DocumensoError.fromResponse(response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Get standard headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
}

/**
 * Create DocumensoClient from environment variables
 */
export function createDocumensoClient(): DocumensoClient {
  const baseUrl = process.env.DOCUMENSO_BASE_URL;
  const apiToken = process.env.DOCUMENSO_API_TOKEN;
  const webhookSecret = process.env.DOCUMENSO_WEBHOOK_SECRET;
  const webhookUrl = process.env.DOCUMENSO_WEBHOOK_URL;

  if (!baseUrl) {
    throw new Error('DOCUMENSO_BASE_URL environment variable is required');
  }

  if (!apiToken) {
    throw new Error('DOCUMENSO_API_TOKEN environment variable is required');
  }

  if (!webhookSecret) {
    throw new Error('DOCUMENSO_WEBHOOK_SECRET environment variable is required');
  }

  if (!webhookUrl) {
    throw new Error('DOCUMENSO_WEBHOOK_URL environment variable is required');
  }

  return new DocumensoClient({
    baseUrl,
    apiToken,
    webhookSecret,
    webhookUrl,
  });
}

// Singleton instance
let documensoClientInstance: DocumensoClient | null = null;

export function getDocumensoClient(): DocumensoClient {
  if (!documensoClientInstance) {
    documensoClientInstance = createDocumensoClient();
  }
  return documensoClientInstance;
}

export function resetDocumensoClient(): void {
  documensoClientInstance = null;
}