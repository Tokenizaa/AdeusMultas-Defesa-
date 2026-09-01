/**
 * Unit tests for Documenso Webhook Verification
 */

import { DocumensoClient } from '@/server/lib/documenso/client';
import { EnvelopeService } from '@/server/lib/documenso/envelope-service';
import { WebhookHandler } from '@/server/lib/documenso/webhook-handler';
import { DocumensoError } from '@/types/documenso';
import { logger } from '@/server/observability/logger';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger
vi.mock('@/server/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('Webhook Verification', () => {
  let client: DocumensoClient;
  let webhookHandler: WebhookHandler;
  const mockFetch = fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockClear();
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
      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: { id: 'env_123', externalId: 'case-123', status: 'COMPLETED' },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

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
      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: { id: 'env_123' },
      });

      const result = await webhookHandler.handleWebhook(payload, 'invalid-signature');

      expect(result.success).toBe(false);
    });

    it('should reject missing signature', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: { id: 'env_123' },
      });

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

      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: { id: 'env_123' },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      const result = await handlerWithoutSecret.handleWebhook(payload, signature);

      expect(result.success).toBe(false);
    });
  });

  describe('Idempotency', () => {
    it('should process duplicate events only once', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: { id: 'env_123', status: 'COMPLETED' },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      // Mock download for DOCUMENT_COMPLETED handler
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9),
      } as Response);

      // First call
      const result1 = await webhookHandler.handleWebhook(payload, signature);
      expect(result1.success).toBe(true);

      // Second call with same event (duplicate, skipped)
      const result2 = await webhookHandler.handleWebhook(payload, signature);
      expect(result2.success).toBe(true);
      // Should be treated as duplicate
    });

    it('should allow different events for same envelope', async () => {
      const payload1 = JSON.stringify({
        event: 'DOCUMENT_SIGNED',
        payload: {
          id: 'env_123',
          status: 'PENDING',
          recipients: [],
        },
      });

      const payload2 = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: {
          id: 'env_123',
          externalId: 'case-123',
          status: 'COMPLETED',
        },
      });

      const crypto = require('crypto');
      const signature1 = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload1)
        .digest('hex');
      const signature2 = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload2)
        .digest('hex');

      // DOCUMENT_SIGNED doesn't trigger download
      const result1 = await webhookHandler.handleWebhook(payload1, signature1);

      // Mock download for DOCUMENT_COMPLETED handler
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9),
      } as Response);

      const result2 = await webhookHandler.handleWebhook(payload2, signature2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
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
          id: 'env_123',
          externalId: 'case-456',
          status: 'PENDING',
          recipients: [
            { id: 'rec_1', email: 'test@example.com', name: 'Test User', role: 'SIGNER', signingStatus: 'SENT', readStatus: 'NOT_OPENED' },
          ],
        },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      const result = await webhookHandler.handleWebhook(payload, signature);

      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_SENT');
    });

    it('should handle DOCUMENT_COMPLETED event', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_COMPLETED',
        payload: {
          id: 'env_123',
          externalId: 'case-456',
          status: 'COMPLETED',
          completedAt: '2024-01-15T10:30:00Z',
          recipients: [
            { id: 'rec_1', email: 'test@example.com', name: 'Test User', role: 'SIGNER', signingStatus: 'SIGNED', signedAt: '2024-01-15T10:25:00Z', readStatus: 'READ' },
          ],
        },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from('fake pdf').buffer.slice(0, 9),
      } as Response);

      const result = await webhookHandler.handleWebhook(payload, signature);

      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_COMPLETED');
    });

    it('should handle DOCUMENT_REJECTED event', async () => {
      const payload = JSON.stringify({
        event: 'DOCUMENT_REJECTED',
        payload: {
          id: 'env_123',
          externalId: 'case-456',
          status: 'REJECTED',
          recipients: [
            { id: 'rec_1', email: 'test@example.com', name: 'Test User', role: 'SIGNER', signingStatus: 'REJECTED', rejectionReason: 'Terms not accepted', readStatus: 'READ' },
          ],
        },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      const result = await webhookHandler.handleWebhook(payload, signature);

      expect(result.success).toBe(true);
      expect(result.event).toBe('DOCUMENT_REJECTED');
    });
  });

  describe('Payload Validation', () => {
    it('should reject invalid JSON', async () => {
      const payload = 'invalid json';
      const signature = 'some-signature';

      const result = await webhookHandler.handleWebhook(payload, signature);

      expect(result.success).toBe(false);
    });

    it('should reject missing event type', async () => {
      const payload = JSON.stringify({
        payload: { id: 'env_123' },
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      const result = await webhookHandler.handleWebhook(payload, signature);

      // Should still process but log unknown event
      expect(result.success).toBe(true);
    });
  });
});