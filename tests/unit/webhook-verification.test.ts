/**
 * Unit tests for Documenso Webhook Verification
 */

import { DocumensoClient } from '@/server/lib/documenso/client';
import { EnvelopeService } from '@/server/lib/documenso/envelope-service';
import { WebhookHandler } from '@/server/lib/documenso/webhook-handler';
import { logger } from '@/server/observability/logger';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/server/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Webhook Verification', () => {
  let client: DocumensoClient;
  let webhookHandler: WebhookHandler;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    client = new DocumensoClient({
      baseUrl: 'https://documenso.example.com',
      apiToken: 'test-token',
      webhookSecret: 'test-webhook-secret',
      webhookUrl: 'https://app.example.com/webhooks/documenso',
    });
    const envelopeService = new EnvelopeService(client);
    webhookHandler = new WebhookHandler(client, envelopeService);
  });

  describe('HMAC Signature Verification', () => {
    it('should verify valid HMAC-SHA256 signature', async () => {
      const payload = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: { id: 'env_123', externalId: 'case-123', status: 'COMPLETED' } });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9),
      } as Response);

      const result = await webhookHandler.handleWebhook(payload, signature);

      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_COMPLETED');
      expect(result.envelopeId).toBe('env_123');
    });

    it('should reject invalid signature', async () => {
      const payload = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: { id: 'env_123' } });
      const result = await webhookHandler.handleWebhook(payload, 'invalid-signature');
      expect(result.success).toBe(false);
    });

    it('should reject missing signature', async () => {
      const payload = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: { id: 'env_123' } });
      const result = await webhookHandler.handleWebhook(payload, '');
      expect(result.success).toBe(false);
    });

    it('should reject when webhook secret not configured', async () => {
      const clientWithoutSecret = new DocumensoClient({
        baseUrl: 'https://documenso.example.com',
        apiToken: 'test-token',
        webhookSecret: '',
        webhookUrl: 'https://app.example.com/webhooks/documenso',
      });
      const handlerWithoutSecret = new WebhookHandler(clientWithoutSecret, new EnvelopeService(clientWithoutSecret));
      const payload = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: { id: 'env_123' } });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
      const result = await handlerWithoutSecret.handleWebhook(payload, signature);
      expect(result.success).toBe(false);
    });
  });

  describe('Idempotency', () => {
    it('should process duplicate events only once', async () => {
      const payload = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: { id: 'env_123', status: 'COMPLETED' } });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
      mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9) } as Response);

      const result1 = await webhookHandler.handleWebhook(payload, signature);
      expect(result1.success).toBe(true);

      const result2 = await webhookHandler.handleWebhook(payload, signature);
      expect(result2.success).toBe(true);
    });

    it('should allow different events for same envelope', async () => {
      const payload1 = JSON.stringify({ event: 'DOCUMENT_SIGNED', payload: { id: 'env_123', status: 'PENDING', recipients: [] } });
      const payload2 = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: { id: 'env_123', externalId: 'case-123', status: 'COMPLETED' } });
      const crypto = require('crypto');
      const signature1 = crypto.createHmac('sha256', 'test-webhook-secret').update(payload1).digest('hex');
      const signature2 = crypto.createHmac('sha256', 'test-webhook-secret').update(payload2).digest('hex');

      const result1 = await webhookHandler.handleWebhook(payload1, signature1);
      mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9) } as Response);
      const result2 = await webhookHandler.handleWebhook(payload2, signature2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.event).toBe('DOCUMENT_SIGNED');
      expect(result2.event).toBe('DOCUMENT_COMPLETED');
    });
  });

  describe('Event Processing', () => {
    it('should handle DOCUMENT_SENT event', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_SENT',
        payload: {
          id: 'env_123', externalId: 'case-456', status: 'PENDING',
          recipients: [{ id: 'rec_1', email: 'test@example.com', name: 'Test User', role: 'SIGNER', signingStatus: 'SENT', readStatus: 'NOT_OPENED' }],
        },
      });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
      const result = await webhookHandler.handleWebhook(payload, signature);
      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_SENT');
    });

    it('should handle DOCUMENT_COMPLETED event', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: {
          id: 'env_123', externalId: 'case-456', status: 'COMPLETED', completedAt: '2024-01-15T10:30:00Z',
          recipients: [{ id: 'rec_1', email: 'test@example.com', name: 'Test User', role: 'SIGNER', signingStatus: 'SIGNED', signedAt: '2024-01-15T10:25:00Z', readStatus: 'READ' }],
        },
      });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
      mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9) } as Response);
      const result = await webhookHandler.handleWebhook(payload, signature);
      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_COMPLETED');
    });

    it('should handle DOCUMENT_REJECTED event', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_REJECTED',
        payload: {
          id: 'env_123', externalId: 'case-456', status: 'REJECTED',
          recipients: [{ id: 'rec_1', email: 'test@example.com', name: 'Test User', role: 'SIGNER', signingStatus: 'REJECTED', rejectionReason: 'Terms not accepted', readStatus: 'READ' }],
        },
      });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
      const result = await webhookHandler.handleWebhook(payload, signature);
      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_REJECTED');
    });
  });

  describe('Payload Validation', () => {
    it('should reject invalid JSON', async () => {
      const result = await webhookHandler.handleWebhook('invalid json', 'some-signature');
      expect(result.success).toBe(false);
    });

    it('should reject missing event type', async () => {
      const payload = JSON.stringify({ payload: { id: 'env_123' } });
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
      const result = await webhookHandler.handleWebhook(payload, signature);
      expect(result.success).toBe(true);
    });
  });
});
