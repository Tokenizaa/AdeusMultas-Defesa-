/**
 * Documenso Envelope Service
 * Business logic for envelope lifecycle management
 */

import { getDocumensoClient, DocumensoClient } from './client';
import {
  CreateEnvelopeRequest,
  CreateEnvelopeField,
  EnvelopeResponse,
  EnvelopeStatus,
  EnvelopeSettings,
  EnvelopeRecipient,
  DocumensoError,
} from '@/types/documenso';
import { logger, LogService } from '@/server/observability/logger';

/**
 * Service for managing Documenso envelope lifecycle
 */
export class EnvelopeService {
  private client: DocumensoClient;

  constructor(client?: DocumensoClient) {
    this.client = client || getDocumensoClient();
  }

  /**
   * Create envelope from case data
   */
  async createEnvelopeFromCase(
    caseId: string,
    pdfBuffer: Buffer,
    signers: Array<{ email: string; name: string }>,
    options?: {
      title?: string;
      fields?: Partial<CreateEnvelopeField>[];
      settings?: Partial<EnvelopeSettings>;
      metadata?: Record<string, any>;
    }
  ): Promise<EnvelopeResponse> {
    logger.info('documenso' as LogService, 'envelope-service', 'create-envelope-from-case', 'Creating envelope from case', {
      caseId,
      signersCount: signers.length,
    });

    // 1. Create envelope (gets presigned URLs)
    const envelopeRequest = this.buildEnvelopeRequest(caseId, signers, pdfBuffer, options);
    const envelope = await this.client.createEnvelope(envelopeRequest);

    // 2. Upload PDF to presigned URL
    if (envelope.documents.length > 0 && envelope.documents[0].uploadUrl) {
      await this.uploadPdf(envelope.documents[0].uploadUrl!, pdfBuffer);
    }

    logger.info('documenso' as LogService, 'envelope-service', 'create-envelope-from-case', 'Envelope created and PDF uploaded', {
      envelopeId: envelope.id,
      caseId,
    });

    return envelope;
  }

  /**
   * Build envelope request from case data
   */
  private buildEnvelopeRequest(
    caseId: string,
    signers: Array<{ email: string; name: string }>,
    pdfBuffer: Buffer,
    options?: {
      title?: string;
      fields?: Partial<CreateEnvelopeField>[];
      settings?: Partial<EnvelopeSettings>;
      metadata?: Record<string, any>;
    }
  ): CreateEnvelopeRequest {
    const title = options?.title || `Defesa de Multa - Caso ${caseId}`;

    // Default: one document (the defense PDF)
    const documents = [
      {
        name: `defesa-${caseId}.pdf`,
        fileUrl: '', // Will be replaced with presigned URL
      },
    ];

    // Create recipients (all as SIGNER by default)
    const recipients = signers.map((signer, index) => ({
      email: signer.email,
      name: signer.name,
      role: 'SIGNER' as const,
      signingOrder: index + 1,
    }));

    // Default signature field for each signer on page 1
    const fields: CreateEnvelopeField[] = recipients.flatMap((recipient, rIndex) => {
      const baseFields: CreateEnvelopeField[] = [
        {
          documentId: `doc_0`,
          recipientId: `rec_${rIndex}`,
          type: 'SIGNATURE',
          page: 1,
          x: 100 + rIndex * 250, // Offset for multiple signers
          y: 600,
          width: 200,
          height: 50,
          required: true,
        },
        {
          documentId: `doc_0`,
          recipientId: `rec_${rIndex}`,
          type: 'DATE',
          page: 1,
          x: 100 + rIndex * 250,
          y: 550,
          width: 150,
          height: 30,
          required: true,
        },
      ];

      // Add custom fields if provided
      if (options?.fields && options.fields[rIndex]) {
        return baseFields.map((f, i) => ({ ...f, ...options.fields![rIndex] }));
      }

      return baseFields;
    });

    // Default settings
    const settings: EnvelopeSettings = {
      expiresInDays: 30,
      signingOrder: 'PARALLEL',
      reminderEnabled: true,
      reminderIntervalDays: 7,
      ...options?.settings,
    };

    return {
      title,
      documents,
      recipients,
      fields,
      settings,
      externalId: caseId,
      metadata: {
        caseId,
        ...options?.metadata,
      },
    };
  }

  /**
   * Upload PDF to presigned URL
   */
  private async uploadPdf(uploadUrl: string, pdfBuffer: Buffer): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
      },
      body: pdfBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('documenso' as LogService, 'envelope-service', 'upload-pdf', 'Failed to upload PDF to Documenso', {
        uploadUrl,
        httpStatus: response.status,
        error: errorText,
        status: 'failed',
      });
      throw new DocumensoError(
        response.status,
        'PDF_UPLOAD_FAILED',
        `Failed to upload PDF: ${errorText}`
      );
    }

    logger.debug('documenso' as LogService, 'envelope-service', 'upload-pdf', 'PDF uploaded successfully', { uploadUrl });
  }

  /**
   * Send envelope for signing
   */
  async sendEnvelope(envelopeId: string): Promise<EnvelopeResponse> {
    logger.info('documenso' as LogService, 'envelope-service', 'send-envelope', 'Sending envelope for signing', { envelopeId, status: 'pending' });
    return this.client.sendEnvelope(envelopeId);
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus> {
    const envelope = await this.client.getEnvelope(envelopeId);
    return envelope.status;
  }

  /**
   * Get full envelope details
   */
  async getEnvelope(envelopeId: string): Promise<EnvelopeResponse> {
    return this.client.getEnvelope(envelopeId);
  }

  /**
   * Get signing URL for recipient
   */
  async getSigningUrl(envelopeId: string, recipientId: string): Promise<string> {
    const response = await this.client.getSigningUrl(envelopeId, recipientId);
    return response.signingUrl;
  }

  /**
   * Download completed PDF
   */
  async downloadCompleted(envelopeId: string): Promise<Buffer> {
    logger.info('documenso' as LogService, 'envelope-service', 'download-completed', 'Downloading completed envelope PDF', { envelopeId, status: 'pending' });
    return this.client.downloadEnvelope(envelopeId);
  }

  /**
   * Check if envelope is in terminal state
   */
  isTerminalStatus(status: EnvelopeStatus): boolean {
    return ['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(status);
  }

  /**
   * Map Documenso status to internal case status
   */
  mapToInternalStatus(status: EnvelopeStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'draft';
      case 'PENDING':
        return 'aguardando_assinatura';
      case 'COMPLETED':
        return 'assinado';
      case 'REJECTED':
        return 'rejeitado';
      case 'CANCELLED':
        return 'cancelado';
      case 'EXPIRED':
        return 'expirado';
      default:
        return 'desconhecido';
    }
  }

  /**
   * Create embedding token for iframe signing
   */
  async createEmbeddingToken(envelopeId: string, recipientId: string, redirectUrl?: string): Promise<string> {
    const response = await this.client.createEmbeddingToken({
      envelopeId,
      recipientId,
      redirectUrl,
    });
    return response.token;
  }
}

// Singleton instance
let envelopeServiceInstance: EnvelopeService | null = null;

export function getEnvelopeService(): EnvelopeService {
  if (!envelopeServiceInstance) {
    envelopeServiceInstance = new EnvelopeService();
  }
  return envelopeServiceInstance;
}

export function resetEnvelopeService(): void {
  envelopeServiceInstance = null;
}