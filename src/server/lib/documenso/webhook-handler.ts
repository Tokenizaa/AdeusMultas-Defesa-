/**
 * Documenso Webhook Handler
 * Handles webhook events with HMAC verification and idempotency
 * @see https://docs.documenso.com/docs/developers/webhooks/verification
 */

import { getDocumensoClient, DocumensoClient } from './client';
import { getEnvelopeService, EnvelopeService } from './envelope-service';
import {
  WebhookPayload,
  WebhookEvent,
  EnvelopeStatus,
  DocumensoEnvelopeRecord,
  DocumensoRecipientRecord,
} from '@/types/documenso';
import { logger, LogService } from '@/server/observability/logger';
import { Request, Response, NextFunction } from 'express';
import { envelopeRepository } from '../../db/envelope-repository';

// Type for processed webhook events (stored in Redis/DB for idempotency)
interface ProcessedWebhookEvent {
  eventKey: string;
  processedAt: Date;
}

/**
 * Webhook handler service
 */
export class WebhookHandler {
  private client: DocumensoClient;
  private envelopeService: EnvelopeService;
  private processedEvents: Map<string, Date> = new Map(); // In-memory for now, use Redis in production
  private readonly IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(client?: DocumensoClient, envelopeService?: EnvelopeService) {
    this.client = client || getDocumensoClient();
    this.envelopeService = envelopeService || getEnvelopeService();
  }

  /**
   * Process incoming webhook
   * Call this from Express route with raw body
   */
  async handleWebhook(rawBody: string, signature: string): Promise<{
    success: boolean;
    event?: WebhookEvent;
    envelopeId?: string;
  }> {
    // 1. Verify HMAC signature
    if (!this.client.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('documenso' as LogService, 'webhook-handler', 'handle-webhook', 'Webhook signature verification failed', {
        signaturePresent: !!signature,
        status: 'failed',
      });
      return { success: false };
    }

    // 2. Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      logger.error('documenso' as LogService, 'webhook-handler', 'handle-webhook', 'Invalid webhook payload JSON', { err, status: 'failed' });
      return { success: false };
    }

    // 3. Idempotency check
    const eventKey = `${payload.payload.id}:${payload.event}`;
    if (this.isProcessed(eventKey)) {
      logger.info('documenso' as LogService, 'webhook-handler', 'handle-webhook', 'Duplicate webhook event, skipping', { eventKey, status: 'skipped' });
      return { success: true, event: payload.event, envelopeId: payload.payload.id };
    }

    // 4. Process event
    try {
      await this.processEvent(payload);
      this.markProcessed(eventKey);
      logger.info('documenso' as LogService, 'webhook-handler', 'handle-webhook', 'Webhook processed successfully', {
        event: payload.event,
        envelopeId: payload.payload.id,
        status: 'success',
      });
    } catch (err) {
      logger.error('documenso' as LogService, 'webhook-handler', 'handle-webhook', 'Webhook processing failed', {
        event: payload.event,
        envelopeId: payload.payload.id,
        err,
        status: 'failed',
      });
      // Don't mark as processed so it can be retried
      throw err;
    }

    return { success: true, event: payload.event, envelopeId: payload.payload.id };
  }

  /**
   * Process webhook event based on type
   */
  private async processEvent(payload: WebhookPayload): Promise<void> {
    const { event, payload: envelopeData } = payload;

    switch (event) {
      case 'DOCUMENT_SENT':
        await this.handleDocumentSent(envelopeData);
        break;
      case 'DOCUMENT_OPENED':
        await this.handleDocumentOpened(envelopeData);
        break;
      case 'DOCUMENT_SIGNED':
        await this.handleDocumentSigned(envelopeData);
        break;
      case 'DOCUMENT_RECIPIENT_COMPLETED':
        await this.handleRecipientCompleted(envelopeData);
        break;
      case 'DOCUMENT_COMPLETED':
        await this.handleDocumentCompleted(envelopeData);
        break;
      case 'DOCUMENT_REJECTED':
        await this.handleDocumentRejected(envelopeData);
        break;
      case 'DOCUMENT_CANCELLED':
        await this.handleDocumentCancelled(envelopeData);
        break;
      case 'RECIPIENT_EXPIRED':
        await this.handleRecipientExpired(envelopeData);
        break;
      case 'DOCUMENT_REMINDER_SENT':
        await this.handleReminderSent(envelopeData);
        break;
      default:
        logger.info('documenso' as LogService, 'webhook-handler', 'process-event', 'Unhandled webhook event', { event, status: 'skipped' });
    }
  }

  /**
   * Handle DOCUMENT_SENT - envelope sent to recipients
   */
  private async handleDocumentSent(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-document-sent', 'Document sent', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      recipients: envelopeData.recipients.length,
      status: 'success',
    });

    // Update envelope status in database
    await this.updateEnvelopeStatus(envelopeData.id, 'PENDING', {
      sent_at: envelopeData.sentAt,
    });
  }

  /**
   * Handle DOCUMENT_OPENED - recipient opened document
   */
  private async handleDocumentOpened(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-document-opened', 'Document opened', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      status: 'success',
    });

    // Update recipient read status
    for (const recipient of envelopeData.recipients) {
      if (recipient.readStatus === 'OPENED' || recipient.readStatus === 'READ') {
        await this.updateRecipientReadStatus(envelopeData.id, recipient.id, recipient.readStatus);
      }
    }
  }

  /**
   * Handle DOCUMENT_SIGNED - recipient signed
   */
  private async handleDocumentSigned(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-document-signed', 'Document signed', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      signedRecipients: envelopeData.recipients.filter(r => r.signingStatus === 'SIGNED').length,
      status: 'success',
    });

    for (const recipient of envelopeData.recipients) {
      if (recipient.signingStatus === 'SIGNED') {
        await this.updateRecipientSigningStatus(envelopeData.id, recipient.id, 'SIGNED', recipient.signedAt);
      }
    }
  }

  /**
   * Handle DOCUMENT_RECIPIENT_COMPLETED - recipient completed all actions
   */
  private async handleRecipientCompleted(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-recipient-completed', 'Recipient completed', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      status: 'success',
    });

    for (const recipient of envelopeData.recipients) {
      if (recipient.signingStatus === 'COMPLETED') {
        await this.updateRecipientSigningStatus(envelopeData.id, recipient.id, 'COMPLETED', recipient.signedAt);
      }
    }
  }

  /**
   * Handle DOCUMENT_COMPLETED - all recipients completed (PRIMARY EVENT)
   */
  private async handleDocumentCompleted(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-document-completed', 'Document completed - downloading PDF', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      completedAt: envelopeData.completedAt,
      status: 'pending',
    });

    // 1. Update envelope status
    await this.updateEnvelopeStatus(envelopeData.id, 'COMPLETED', {
      completed_at: envelopeData.completedAt,
    });

    // 2. Download completed PDF
    try {
      const pdfBuffer = await this.envelopeService.downloadCompleted(envelopeData.id);

      // 3. Store PDF and update case
      await this.storeCompletedPdfAndUpdateCase(envelopeData, pdfBuffer);

      logger.info('documenso' as LogService, 'webhook-handler', 'handle-document-completed', 'Completed PDF downloaded and stored', {
        envelopeId: envelopeData.id,
        pdfSize: pdfBuffer.length,
        status: 'success',
      });
    } catch (err) {
      logger.error('documenso' as LogService, 'webhook-handler', 'handle-document-completed', 'Failed to download completed PDF', {
        envelopeId: envelopeData.id,
        err,
        status: 'failed',
      });
      throw err;
    }
  }

  /**
   * Handle DOCUMENT_REJECTED - recipient rejected
   */
  private async handleDocumentRejected(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.warn('documenso' as LogService, 'webhook-handler', 'handle-document-rejected', 'Document rejected', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      rejectedRecipients: envelopeData.recipients.filter(r => r.signingStatus === 'REJECTED').length,
      status: 'failed',
    });

    await this.updateEnvelopeStatus(envelopeData.id, 'REJECTED', {
      // rejection_reason stored in envelope_data JSONB
    });

    // Notify case owner
    await this.notifyCaseOwner(envelopeData.externalId, 'rejected', envelopeData);
  }

  /**
   * Handle DOCUMENT_CANCELLED - envelope cancelled
   */
  private async handleDocumentCancelled(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-document-cancelled', 'Document cancelled', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      status: 'success',
    });

    await this.updateEnvelopeStatus(envelopeData.id, 'CANCELLED');
  }

  /**
   * Handle RECIPIENT_EXPIRED - signing deadline passed
   */
  private async handleRecipientExpired(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.warn('documenso' as LogService, 'webhook-handler', 'handle-recipient-expired', 'Recipient expired', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      status: 'failed',
    });

    await this.updateEnvelopeStatus(envelopeData.id, 'EXPIRED');

    // Notify case owner
    await this.notifyCaseOwner(envelopeData.externalId, 'expired', envelopeData);
  }

  /**
   * Handle DOCUMENT_REMINDER_SENT - reminder email sent
   */
  private async handleReminderSent(envelopeData: WebhookPayload['payload']): Promise<void> {
    logger.info('documenso' as LogService, 'webhook-handler', 'handle-reminder-sent', 'Reminder sent', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      status: 'success',
    });
    // Could track reminder count if needed
  }

  // ==========================================
  // Database Operations (to be implemented with Supabase)
  // ==========================================

  private async updateEnvelopeStatus(
    documensoEnvelopeId: string,
    status: EnvelopeStatus,
    extraData?: Partial<DocumensoEnvelopeRecord>
  ): Promise<void> {
    // FASE 1.2 CORREÇÃO: persistir status real em Supabase (antes era no-op)
    try {
      await envelopeRepository.updateStatus(documensoEnvelopeId, status, {
        sent_at: extraData?.sent_at as string | undefined,
        completed_at: extraData?.completed_at as string | undefined,
      });
    } catch (err) {
      logger.error('documenso' as LogService, 'webhook-handler', 'update-envelope-status', 'Falha ao persistir status do envelope', {
        documensoEnvelopeId,
        envelopeStatus: status,
        err,
        status: 'failed',
      });
      throw err; // re-throw para não perder o evento
    }
  }

  private async updateRecipientReadStatus(
    documensoEnvelopeId: string,
    documensoRecipientId: string,
    readStatus: string
  ): Promise<void> {
    // TODO: Implement with Supabase
    logger.debug('documenso' as LogService, 'webhook-handler', 'update-recipient-read-status', 'Update recipient read status', { documensoEnvelopeId, documensoRecipientId, readStatus, status: 'pending' });
  }

  private async updateRecipientSigningStatus(
    documensoEnvelopeId: string,
    documensoRecipientId: string,
    signingStatus: string,
    signedAt?: string
  ): Promise<void> {
    // TODO: Implement with Supabase
    logger.debug('documenso' as LogService, 'webhook-handler', 'update-recipient-signing-status', 'Update recipient signing status', { documensoEnvelopeId, documensoRecipientId, signingStatus, signedAt, status: 'pending' });
  }

  private async storeCompletedPdfAndUpdateCase(
    envelopeData: WebhookPayload['payload'],
    pdfBuffer: Buffer
  ): Promise<void> {
    // TODO: Implement with Supabase - upload to storage, update case record
    logger.debug('documenso' as LogService, 'webhook-handler', 'store-completed-pdf', 'Store completed PDF', {
      envelopeId: envelopeData.id,
      externalId: envelopeData.externalId,
      pdfSize: pdfBuffer.length,
      status: 'pending',
    });
  }

  private async notifyCaseOwner(
    caseId: string,
    eventType: string,
    envelopeData: WebhookPayload['payload']
  ): Promise<void> {
    // TODO: Implement notification (email, WhatsApp, etc.)
    logger.info('documenso' as LogService, 'webhook-handler', 'notify-case-owner', 'Notify case owner', { caseId, eventType, envelopeId: envelopeData.id, status: 'pending' });
  }

  // ==========================================
  // Idempotency Helpers
  // ==========================================

  private isProcessed(eventKey: string): boolean {
    const processed = this.processedEvents.get(eventKey);
    if (!processed) return false;

    // Check TTL
    if (Date.now() - processed.getTime() > this.IDEMPOTENCY_TTL_MS) {
      this.processedEvents.delete(eventKey);
      return false;
    }

    return true;
  }

  private markProcessed(eventKey: string): void {
    this.processedEvents.set(eventKey, new Date());
  }

  /**
   * Clean up expired idempotency keys
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, date] of this.processedEvents.entries()) {
      if (now - date.getTime() > this.IDEMPOTENCY_TTL_MS) {
        this.processedEvents.delete(key);
      }
    }
  }
}

// Express middleware for webhook verification
export function documensoWebhookMiddleware(
  handler: WebhookHandler
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Raw body is required for HMAC verification
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers['x-documenso-secret'] as string;

      if (!signature) {
        logger.warn('documenso' as LogService, 'webhook-handler', 'webhook-middleware', 'Missing X-Documenso-Secret header', { status: 'failed' });
        res.status(401).json({ error: 'Missing signature' });
        return;
      }

      const result = await handler.handleWebhook(rawBody, signature);

      if (!result.success) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('documenso' as LogService, 'webhook-handler', 'webhook-middleware', 'Webhook handler error', { err, status: 'failed' });
      // Return 200 to avoid Documenso retries for processing errors
      // The event will be retried by polling fallback
      res.status(200).json({ error: 'Processing failed, will retry' });
    }
  };
}

// Singleton instance
let webhookHandlerInstance: WebhookHandler | null = null;

export function getWebhookHandler(): WebhookHandler {
  if (!webhookHandlerInstance) {
    webhookHandlerInstance = new WebhookHandler();
  }
  return webhookHandlerInstance;
}

export function resetWebhookHandler(): void {
  webhookHandlerInstance = null;
}