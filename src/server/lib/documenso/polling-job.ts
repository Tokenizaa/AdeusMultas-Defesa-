/**
 * Documenso Polling Job
 * Fallback for missed webhooks - polls PENDING envelopes periodically
 * @see https://docs.documenso.com/docs/developers/examples/common-workflows
 */

import { getDocumensoClient, DocumensoClient, isDocumensoConfigured } from './client';
import { getEnvelopeService, EnvelopeService } from './envelope-service';
import { getWebhookHandler, WebhookHandler } from './webhook-handler';
import { EnvelopeStatus, EnvelopeResponse, WebhookEvent, WebhookPayload } from '@/types/documenso';
import { logger, LogService } from '@/server/observability/logger';

/**
 * Configuration for polling job
 */
export interface PollingJobConfig {
  intervalMs: number;           // Polling interval (default: 5 minutes)
  pendingThresholdMs: number;   // Min age of PENDING envelopes to poll (default: 10 minutes)
  maxRetries: number;           // Max retries for failed polls (default: 3)
  batchSize: number;            // Max envelopes per batch (default: 50)
}

/**
 * Polling job for Documenso envelope status
 * Runs periodically to catch any envelopes that didn't trigger webhooks
 */
export class PollingJob {
  private client?: DocumensoClient;
  private envelopeService?: EnvelopeService;
  private webhookHandler?: WebhookHandler;
  private config: PollingJobConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    config: Partial<PollingJobConfig> = {},
    client?: DocumensoClient,
    envelopeService?: EnvelopeService,
    webhookHandler?: WebhookHandler
  ) {
    if (client) {
      this.client = client;
    } else if (isDocumensoConfigured()) {
      try {
        this.client = getDocumensoClient();
      } catch {
        // Ignore if unconfigured
      }
    }

    if (envelopeService) {
      this.envelopeService = envelopeService;
    } else if (isDocumensoConfigured()) {
      try {
        this.envelopeService = getEnvelopeService();
      } catch {
        // Ignore if unconfigured
      }
    }

    if (webhookHandler) {
      this.webhookHandler = webhookHandler;
    } else if (isDocumensoConfigured()) {
      try {
        this.webhookHandler = getWebhookHandler();
      } catch {
        // Ignore if unconfigured
      }
    }

    this.config = {
      intervalMs: config.intervalMs || 5 * 60 * 1000,        // 5 minutes
      pendingThresholdMs: config.pendingThresholdMs || 10 * 60 * 1000, // 10 minutes
      maxRetries: config.maxRetries || 3,
      batchSize: config.batchSize || 50,
    };
  }

  /**
   * Start the polling job
   */
  start(): void {
    if (!isDocumensoConfigured()) {
      logger.info('documenso' as LogService, 'polling-job', 'start', 'Documenso not configured, polling job skipped', { status: 'skipped' });
      return;
    }

    if (this.intervalId) {
      logger.warn('documenso' as LogService, 'polling-job', 'start', 'Polling job already running', { status: 'failed' });
      return;
    }

    logger.info('documenso' as LogService, 'polling-job', 'start', 'Starting Documenso polling job', {
      intervalMs: this.config.intervalMs,
      pendingThresholdMs: this.config.pendingThresholdMs,
      status: 'pending',
    });

    // Run immediately on start
    this.run();

    // Schedule recurring
    this.intervalId = setInterval(() => this.run(), this.config.intervalMs);
  }

  /**
   * Stop the polling job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('documenso' as LogService, 'polling-job', 'stop', 'Documenso polling job stopped', { status: 'success' });
    }
  }

  /**
   * Run a single polling cycle
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.debug('documenso' as LogService, 'polling-job', 'run', 'Polling job already running, skipping cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.debug('documenso' as LogService, 'polling-job', 'run', 'Polling cycle started');

      // Get PENDING envelopes older than threshold
      const pendingEnvelopes = await this.getPendingEnvelopes();

      if (pendingEnvelopes.length === 0) {
        logger.debug('documenso' as LogService, 'polling-job', 'run', 'No pending envelopes to poll');
        return;
      }

      logger.info('documenso' as LogService, 'polling-job', 'run', 'Polling pending envelopes', {
        count: pendingEnvelopes.length,
        status: 'pending',
      });

      // Process each envelope
      let processed = 0;
      let failed = 0;

      for (const envelope of pendingEnvelopes) {
        try {
          await this.pollEnvelope(envelope);
          processed++;
        } catch (err) {
          failed++;
          logger.error('documenso' as LogService, 'polling-job', 'run', 'Failed to poll envelope', {
            envelopeId: envelope.documenso_envelope_id,
            err,
            status: 'failed',
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('documenso' as LogService, 'polling-job', 'run', 'Polling cycle completed', {
        total: pendingEnvelopes.length,
        processed,
        failed,
        durationMs: duration,
        status: 'success',
      });
    } catch (err) {
      logger.error('documenso' as LogService, 'polling-job', 'run', 'Polling cycle failed', { err, status: 'failed' });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get PENDING envelopes from database older than threshold
   * TODO: Implement with Supabase
   */
  private async getPendingEnvelopes(): Promise<Array<{ documenso_envelope_id: string; case_id: string }>> {
    // TODO: Implement database query
    // SELECT documenso_envelope_id, case_id FROM documenso_envelopes
    // WHERE status = 'PENDING' AND updated_at < NOW() - INTERVAL '10 minutes'
    // LIMIT batchSize

    logger.debug('documenso' as LogService, 'polling-job', 'get-pending', 'Fetching pending envelopes from database (not implemented)');
    return [];
  }

  /**
   * Poll a single envelope and process status changes
   */
  private async pollEnvelope(envelope: { documenso_envelope_id: string; case_id: string }): Promise<void> {
    if (!this.client || !this.envelopeService) return;
    const { documenso_envelope_id } = envelope;

    try {
      // Get current status from Documenso
      const current = await this.client.getEnvelope(documenso_envelope_id);

      // Check if status changed
      if (this.envelopeService.isTerminalStatus(current.status)) {
        logger.info('documenso' as LogService, 'polling-job', 'poll-envelope', 'Envelope reached terminal status via polling', {
          envelopeId: documenso_envelope_id,
          envelopeStatus: current.status,
          status: 'success',
        });

        // Create a synthetic webhook payload and process it
        await this.processTerminalStatus(current);
      }
    } catch (err) {
      // If envelope not found (404), it might have been deleted
      if (err instanceof Error && 'statusCode' in err && (err as any).statusCode === 404) {
        logger.warn('documenso' as LogService, 'polling-job', 'poll-envelope', 'Envelope not found in Documenso', { envelopeId: documenso_envelope_id, status: 'failed' });
        // Mark as cancelled in our system
        await this.markEnvelopeCancelled(documenso_envelope_id);
        return;
      }
      throw err;
    }
  }

  /**
   * Process envelope that reached terminal status
   */
  private async processTerminalStatus(envelope: EnvelopeResponse): Promise<void> {
    if (!this.webhookHandler) return;
    // Build synthetic webhook payload
    const syntheticPayload = this.buildSyntheticWebhookPayload(envelope);

    // Process through webhook handler
    await this.webhookHandler['processEvent'](syntheticPayload);
  }

  /**
   * Build synthetic webhook payload from envelope response
   */
  private buildSyntheticWebhookPayload(envelope: EnvelopeResponse): WebhookPayload {
    const eventMap: Record<EnvelopeStatus, WebhookEvent> = {
      COMPLETED: 'DOCUMENT_COMPLETED',
      REJECTED: 'DOCUMENT_REJECTED',
      CANCELLED: 'DOCUMENT_CANCELLED',
      EXPIRED: 'RECIPIENT_EXPIRED',
      DRAFT: 'DOCUMENT_CREATED',
      PENDING: 'DOCUMENT_SENT',
    };

    return {
      event: eventMap[envelope.status] || 'DOCUMENT_COMPLETED',
      payload: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        externalId: envelope.externalId,
        completedAt: envelope.completedAt,
        sentAt: envelope.sentAt,
        recipients: envelope.recipients.map(r => ({
          id: r.id,
          email: r.email,
          name: r.name,
          role: r.role,
          signingStatus: r.signingStatus,
          signedAt: r.signedAt,
          readStatus: r.readStatus,
          rejectionReason: r.rejectionReason,
        })),
        createdAt: envelope.createdAt,
      },
      createdAt: new Date().toISOString(),
      webhookEndpoint: 'polling-fallback',
    };
  }

  /**
   * Mark envelope as cancelled in our system
   */
  private async markEnvelopeCancelled(envelopeId: string): Promise<void> {
    // TODO: Implement with Supabase
    logger.info('documenso' as LogService, 'polling-job', 'mark-cancelled', 'Marking envelope as cancelled', { envelopeId, status: 'pending' });
  }

  /**
   * Manually trigger polling for a specific envelope
   */
  async pollSpecificEnvelope(envelopeId: string): Promise<EnvelopeResponse | null> {
    if (!this.client || !this.envelopeService) return null;
    try {
      const envelope = await this.client.getEnvelope(envelopeId);
      if (this.envelopeService.isTerminalStatus(envelope.status)) {
        await this.processTerminalStatus(envelope);
      }
      return envelope;
    } catch (err) {
      logger.error('documenso' as LogService, 'polling-job', 'poll-specific', 'Failed to poll specific envelope', { envelopeId, err, status: 'failed' });
      return null;
    }
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean; config: PollingJobConfig } {
    return {
      running: this.intervalId !== null,
      config: this.config,
    };
  }
}

// Singleton instance
let pollingJobInstance: PollingJob | null = null;

export function getPollingJob(config?: Partial<PollingJobConfig>): PollingJob {
  if (!pollingJobInstance) {
    pollingJobInstance = new PollingJob(config);
  }
  return pollingJobInstance;
}

export function startPollingJob(config?: Partial<PollingJobConfig>): PollingJob {
  const job = getPollingJob(config);
  job.start();
  return job;
}

export function stopPollingJob(): void {
  if (pollingJobInstance) {
    pollingJobInstance.stop();
    pollingJobInstance = null;
  }
}

export function resetPollingJob(): void {
  stopPollingJob();
}