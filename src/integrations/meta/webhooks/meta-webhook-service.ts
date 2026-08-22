/**
 * Meta Webhooks Processing Service
 * Handles Hub Challenge verification, HMAC SHA-256 signature verification, Idempotency,
 * and Async Event Dispatching.
 */

import crypto from 'crypto';
import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { MetaWebhookEventRecord } from '../types';
import { MetaWebhookSignatureInvalidError } from '../errors/meta-errors';

export class MetaWebhookService {
  private recentWebhooks: MetaWebhookEventRecord[] = [];
  private processedEventIds = new Set<string>();

  private getVerifyToken(): string {
    return (
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      'defesai_meta_webhook_secret_verify_token'
    );
  }

  private getAppSecret(): string {
    return (
      process.env.META_APP_SECRET ||
      process.env.FACEBOOK_APP_SECRET ||
      ''
    );
  }

  /**
   * Validates GET verification challenge from Meta Webhook Subscription setup
   */
  public verifyChallenge(mode?: string, token?: string, challenge?: string): string | null {
    const configuredToken = this.getVerifyToken();

    if (mode === 'subscribe' && token === configuredToken) {
      logger.info('meta', 'webhook', 'challenge_verified', 'Webhook Meta verificado com sucesso');
      return challenge || 'OK';
    }

    logger.warn('meta', 'webhook', 'challenge_failed', 'Tentativa de verificação de webhook com token inválido', {
      receivedToken: token ? '[REDACTED]' : undefined,
    });
    return null;
  }

  /**
   * Verifies X-Hub-Signature-256 HMAC header
   */
  public verifySignature(rawPayload: string | Buffer, signatureHeader?: string): boolean {
    const appSecret = this.getAppSecret();
    if (!appSecret) {
      // If secret is not configured in local environment, allow pass-through with warning
      return true;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = signatureHeader.replace('sha256=', '');
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8'));
    const calculatedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Ingests and processes POST webhook payload asynchronously
   */
  public async handleWebhookPayload(
    rawPayload: string | Buffer,
    signatureHeader?: string,
    parsedBody?: any
  ): Promise<{ processed: boolean; eventId: string }> {
    const isValid = this.verifySignature(rawPayload, signatureHeader);
    if (!isValid) {
      logger.error('meta', 'webhook', 'invalid_signature', 'Assinatura X-Hub-Signature-256 inválida');
      throw new MetaWebhookSignatureInvalidError();
    }

    const payload = parsedBody || (typeof rawPayload === 'string' ? JSON.parse(rawPayload) : JSON.parse(rawPayload.toString('utf8')));
    const eventId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: MetaWebhookEventRecord = {
      id: eventId,
      object: payload.object || 'page',
      entryCount: payload.entry?.length || 0,
      receivedAt: new Date().toISOString(),
      processed: false,
      entries: (payload.entry || []).map((e: any) => ({
        id: e.id,
        time: e.time,
        changes: e.changes,
      })),
    };

    this.recentWebhooks.unshift(record);
    if (this.recentWebhooks.length > 50) this.recentWebhooks.pop();

    // Async background dispatching
    setImmediate(() => {
      this.dispatchInternalEvents(record, payload);
    });

    return { processed: true, eventId };
  }

  private dispatchInternalEvents(record: MetaWebhookEventRecord, payload: any): void {
    try {
      (payload.entry || []).forEach((entry: any) => {
        const entryId = entry.id;

        (entry.changes || []).forEach((change: any) => {
          const changeKey = `${entryId}_${change.field}_${entry.time}`;
          if (this.processedEventIds.has(changeKey)) return;
          this.processedEventIds.add(changeKey);

          logger.info('meta', 'webhook', 'event_dispatched', `Evento Meta [${change.field}] processado`, {
            field: change.field,
            pageId: entryId,
          });

          // Dispatch to core EventBus
          eventBus.publish(
            EventTopics.MARKETING_CONTENT_DRAFTED,
            {
              source: 'meta_webhook',
              field: change.field,
              value: change.value,
              targetId: entryId,
            },
            'meta_webhook_service'
          );
        });
      });

      record.processed = true;
    } catch (err: any) {
      record.error = err.message;
      logger.error('meta', 'webhook', 'dispatch_error', `Erro ao despachar eventos do webhook: ${err.message}`);
    }
  }

  public getRecentWebhooks(): MetaWebhookEventRecord[] {
    return [...this.recentWebhooks];
  }
}

export const metaWebhookService = new MetaWebhookService();
