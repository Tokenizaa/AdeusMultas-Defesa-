/**
 * Meta Webhooks Processing Service
 * Handles Hub Challenge verification, HMAC SHA-256 signature verification, Idempotency,
 * and Async Event Dispatching.
 */

import crypto from 'crypto';
import { logger } from '../../../server/observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { marketingService } from '../../../server/services/marketing-service';
import { MetaWebhookEventRecord } from '../types';
import { MetaWebhookSignatureInvalidError } from '../errors/meta-errors';

export class MetaWebhookService {
  private recentWebhooks: MetaWebhookEventRecord[] = [];
  private processedEventIds = new Set<string>();

  private getVerifyToken(): string | undefined {
    return (
      process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ||
      process.env.META_VERIFY_TOKEN?.trim() ||
      undefined
    );
  }

  private getAppSecret(): string | undefined {
    return (
      process.env.META_APP_SECRET?.trim() ||
      process.env.FACEBOOK_APP_SECRET?.trim() ||
      undefined
    );
  }

  /**
   * Validates GET verification challenge from Meta Webhook Subscription setup
   * SECURITY: Rejeita desafio se META_WEBHOOK_VERIFY_TOKEN não está configurado.
   * Bypass removido: fallback hardcoded era vetor de ataque.
   */
  public verifyChallenge(mode?: string, token?: string, challenge?: string): string | null {
    const configuredToken = this.getVerifyToken();

    // NÃO PERMITIR bypass de segurança: sem env var configurada, rejeitar
    if (!configuredToken) {
      logger.warn('meta', 'webhook', 'challenge_no_configured_token',
        'Webhook challenge rejeitado: META_WEBHOOK_VERIFY_TOKEN ausente. Configure antes de registrar o webhook.');
      return null;
    }

    if (mode === 'subscribe' && token === configuredToken) {
      logger.info('meta', 'webhook', 'challenge_verified', 'Webhook challenge verificado com sucesso');
      return challenge || 'OK';
    }

    logger.warn('meta', 'webhook', 'challenge_failed', 'Tentativa de verificação de webhook com token inválido', {
      receivedToken: token ? '[REDACTED]' : undefined,
    });
    return null;
  }

  /**
   * Verifies X-Hub-Signature-256 HMAC header
   * SECURITY: Sem META_APP_SECRET configurado, NÃO aceita payloads não assinados.
   * O bypass anterior (return true quando sem segredo) permitia injeção de webhooks falsos.
   */
  public verifySignature(rawPayload: string | Buffer, signatureHeader?: string): boolean {
    const appSecret = this.getAppSecret();

    // Sem app secret configurado → rejeitar assinatura (não existe forma de validar)
    if (!appSecret) {
      logger.warn('meta', 'webhook', 'signature_no_secret',
        'Verificação HMAC rejeitada: META_APP_SECRET ausente no ambiente. Configure para receber eventos legitimamente.');
      return false;
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

          // Se for evento de feed ou status com post_id, atualizar estado do conteúdo
          if ((change.field === 'feed' || change.field === 'status' || change.field === 'posts') && change.value) {
            const postId = change.value.post_id || change.value.id;
            const verb = change.value.verb;
            if (postId) {
              if (verb === 'add' || !verb) {
                marketingService.updateContentByMetaPostId(postId, {
                  status: 'publicado',
                  published_at: new Date().toISOString(),
                  publishedAt: new Date().toISOString(),
                }).catch(() => {});
              } else if (verb === 'remove' || verb === 'delete') {
                marketingService.updateContentByMetaPostId(postId, {
                  status: 'failed',
                  error: 'Post removido ou rejeitado na Meta',
                }).catch(() => {});
              }
            }
          }

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
