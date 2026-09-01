/**
 * Unit tests for Documenso Envelope Service
 */

import { EnvelopeService } from '@/server/lib/documenso/envelope-service';
import { DocumensoClient } from '@/server/lib/documenso/client';
import { DocumensoError, EnvelopeStatus } from '@/types/documenso';
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

describe('EnvelopeService', () => {
  let service: EnvelopeService;
  let mockClient: DocumensoClient;
  const mockFetch = fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockClear();
    mockClient = new DocumensoClient({
      baseUrl: 'https://documenso.example.com',
      apiToken: 'test-token',
      webhookSecret: 'test-secret',
      webhookUrl: 'https://app.example.com/webhooks/documenso',
    });
    service = new EnvelopeService(mockClient);
  });

  describe('createEnvelopeFromCase', () => {
    it('should create envelope and upload PDF', async () => {
      // Mock envelope creation response
      const mockEnvelope = {
        id: 'env_abc123',
        title: 'Defesa de Multa - Caso case-123',
        status: 'DRAFT' as EnvelopeStatus,
        externalId: 'case-123',
        documents: [
          { id: 'doc_0', name: 'defesa-case-123.pdf', uploadUrl: 'https://presigned.url/upload' },
        ],
        recipients: [
          { id: 'rec_0', email: 'signer1@example.com', name: 'Signer One', role: 'SIGNER', signingOrder: 1 },
        ],
        fields: [],
        settings: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnvelope,
        } as Response)
        // Mock PDF upload
        .mockResolvedValueOnce({
          ok: true,
        } as Response);

      const pdfBuffer = Buffer.from('fake pdf content');
      const signers = [
        { email: 'signer1@example.com', name: 'Signer One' },
      ];

      const result = await service.createEnvelopeFromCase('case-123', pdfBuffer, signers);

      expect(result.id).toBe('env_abc123');
      expect(result.externalId).toBe('case-123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on PDF upload failure', async () => {
      const mockEnvelope = {
        id: 'env_abc123',
        documents: [{ id: 'doc_0', uploadUrl: 'https://presigned.url/upload' }],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnvelope,
        } as Response)
        // Mock PDF upload failure
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response);

      const pdfBuffer = Buffer.from('fake pdf content');
      const signers = [{ email: 'test@example.com', name: 'Test' }];

      await expect(
        service.createEnvelopeFromCase('case-123', pdfBuffer, signers)
      ).rejects.toThrow(DocumensoError);
    });

    it('should create envelope with custom title', async () => {
      const mockEnvelope = {
        id: 'env_abc123',
        documents: [{ id: 'doc_0', uploadUrl: 'https://presigned.url' }],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnvelope,
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response);

      const pdfBuffer = Buffer.from('pdf');
      const signers = [{ email: 'test@example.com', name: 'Test' }];

      await service.createEnvelopeFromCase('case-123', pdfBuffer, signers, {
        title: 'Custom Title',
      });

      // Verify the request included custom title
      const createCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(createCall[1]?.body as string);
      expect(requestBody.title).toBe('Custom Title');
    });

    it('should create envelope with custom settings', async () => {
      const mockEnvelope = {
        id: 'env_abc123',
        documents: [{ id: 'doc_0', uploadUrl: 'https://presigned.url' }],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnvelope,
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response);

      const pdfBuffer = Buffer.from('pdf');
      const signers = [{ email: 'test@example.com', name: 'Test' }];

      await service.createEnvelopeFromCase('case-123', pdfBuffer, signers, {
        settings: {
          expiresInDays: 60,
          signingOrder: 'SEQUENTIAL',
        },
      });

      const createCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(createCall[1]?.body as string);
      expect(requestBody.settings.expiresInDays).toBe(60);
      expect(requestBody.settings.signingOrder).toBe('SEQUENTIAL');
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

      const result = await service.sendEnvelope('env_abc123');

      expect(result.status).toBe('PENDING');
    });
  });

  describe('getEnvelopeStatus', () => {
    it('should return envelope status', async () => {
      const mockResponse = {
        id: 'env_abc123',
        status: 'COMPLETED',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const status = await service.getEnvelopeStatus('env_abc123');

      expect(status).toBe('COMPLETED');
    });
  });

  describe('downloadCompleted', () => {
    it('should download PDF buffer', async () => {
      const pdfData = Buffer.from('completed pdf content');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength),
      } as Response);

      const result = await service.downloadCompleted('env_abc123');

      expect(result).toEqual(pdfData);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(service.isTerminalStatus('COMPLETED')).toBe(true);
      expect(service.isTerminalStatus('REJECTED')).toBe(true);
      expect(service.isTerminalStatus('CANCELLED')).toBe(true);
      expect(service.isTerminalStatus('EXPIRED')).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(service.isTerminalStatus('DRAFT')).toBe(false);
      expect(service.isTerminalStatus('PENDING')).toBe(false);
    });
  });

  describe('mapToInternalStatus', () => {
    it('should map Documenso status to internal status', () => {
      expect(service.mapToInternalStatus('DRAFT')).toBe('draft');
      expect(service.mapToInternalStatus('PENDING')).toBe('aguardando_assinatura');
      expect(service.mapToInternalStatus('COMPLETED')).toBe('assinado');
      expect(service.mapToInternalStatus('REJECTED')).toBe('rejeitado');
      expect(service.mapToInternalStatus('CANCELLED')).toBe('cancelado');
      expect(service.mapToInternalStatus('EXPIRED')).toBe('expirado');
    });
  });
});