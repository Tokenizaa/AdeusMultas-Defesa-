/**
 * Unit tests for Documenso Client
 */

import { DocumensoClient } from '@/server/lib/documenso/client';
import { DocumensoError } from '@/types/documenso';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('DocumensoClient', () => {
  let client: DocumensoClient;
  const mockFetch = fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new DocumensoClient({
      baseUrl: 'https://documenso.example.com',
      apiToken: 'test-token',
      webhookSecret: 'test-secret',
      webhookUrl: 'https://app.example.com/webhooks/documenso',
    });
  });

  describe('createEnvelope', () => {
    it('should create envelope successfully', async () => {
      const mockResponse = {
        id: 'env_abc123',
        title: 'Test Envelope',
        status: 'DRAFT',
        externalId: 'case-123',
        documents: [{ id: 'doc_1', name: 'test.pdf', uploadUrl: 'https://presigned.url' }],
        recipients: [],
        fields: [],
        settings: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const request = {
        title: 'Test Envelope',
        documents: [{ name: 'test.pdf', fileUrl: '' }],
        recipients: [{ email: 'test@example.com', name: 'Test User', role: 'SIGNER' as const, signingOrder: 1 }],
        fields: [],
        externalId: 'case-123',
      };

      const result = await client.createEnvelope(request);

      expect(result.id).toBe('env_abc123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://documenso.example.com/api/v2/envelopes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw DocumensoError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized', code: 'UNAUTHORIZED' }),
      } as Response);

      const request = {
        title: 'Test',
        documents: [],
        recipients: [],
        fields: [],
        externalId: 'case-123',
      };

      await expect(client.createEnvelope(request)).rejects.toThrow(DocumensoError);
    });
  });

  describe('sendEnvelope', () => {
    it('should send envelope successfully', async () => {
      const mockResponse = {
        id: 'env_abc123',
        status: 'PENDING',
        sentAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.sendEnvelope('env_abc123');

      expect(result.status).toBe('PENDING');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://documenso.example.com/api/v2/envelopes/env_abc123/send',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getEnvelope', () => {
    it('should get envelope successfully', async () => {
      const mockResponse = {
        id: 'env_abc123',
        status: 'COMPLETED',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.getEnvelope('env_abc123');

      expect(result.id).toBe('env_abc123');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('downloadEnvelope', () => {
    it('should download PDF as Buffer', async () => {
      const pdfData = Buffer.from('fake pdf content');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength),
      } as Response);

      const result = await client.downloadEnvelope('env_abc123');

      expect(result).toEqual(pdfData);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"event":"DOCUMENT_COMPLETED","payload":{"id":"env_123"}}';
      const crypto = require('crypto');
      const expectedSecret = crypto
        .createHmac('sha256', 'test-secret')
        .update(payload)
        .digest('hex');

      const result = client.verifyWebhookSignature(payload, expectedSecret);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"event":"DOCUMENT_COMPLETED"}';
      const result = client.verifyWebhookSignature(payload, 'invalid-signature');

      expect(result).toBe(false);
    });

    it('should reject missing signature', () => {
      const payload = '{"event":"DOCUMENT_COMPLETED"}';
      const result = client.verifyWebhookSignature(payload, '');

      expect(result).toBe(false);
    });

    it('should reject when secret not configured', () => {
      const clientWithoutSecret = new DocumensoClient({
        baseUrl: 'https://documenso.example.com',
        apiToken: 'test-token',
        webhookSecret: '',
        webhookUrl: 'https://app.example.com/webhooks/documenso',
      });

      const payload = '{"event":"DOCUMENT_COMPLETED"}';
      const crypto = require('crypto');
      const expectedSecret = crypto
        .createHmac('sha256', 'test-secret')
        .update(payload)
        .digest('hex');

      const result = clientWithoutSecret.verifyWebhookSignature(payload, expectedSecret);

      expect(result).toBe(false);
    });
  });
});