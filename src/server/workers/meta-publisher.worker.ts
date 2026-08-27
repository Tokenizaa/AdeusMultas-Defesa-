import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { marketingService } from '../services/marketing-service';
import { MetaPublishRequest, MetaPublishResult } from '../../types';
import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';
import { MetaAuthenticationRequiredError } from '../../integrations/meta/errors/meta-errors';
import { getSupabaseServerClient } from '../db/supabase-server';

/**
 * MetaPublisher — Production delivery queue with retry and token health awareness.
 * Dispatches publications through the canonical MetaAdapter.
 * Persists job records to Supabase for restart survival.
 */
interface QueueItem {
  id: string;
  request: MetaPublishRequest;
  contentId?: string;
  attempts: number;
  nextRetryAt: number;
}

export interface PublisherJobRecord {
  id: string;
  channel: string;
  contentId?: string;
  status: 'delivered' | 'retrying' | 'failed';
  attempts: number;
  createdAt: string;
  resolvedAt?: string;
  error?: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 60 * 1000;

export class MetaPublisher {
  private queue: QueueItem[] = [];
  private processing = false;
  private tokenExpired = false;
  private jobHistory: PublisherJobRecord[] = [];
  private supabase = getSupabaseServerClient();

  getJobHistory(): PublisherJobRecord[] {
    return [...this.jobHistory].slice(0, 20);
  }

  enqueue(request: MetaPublishRequest, contentId?: string): { queued: boolean; itemId: string } {
    const item: QueueItem = {
      id: `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      request,
      contentId,
      attempts: 0,
      nextRetryAt: Date.now(),
    };

    if (!metaAdapter.isConnected()) {
      const rec: PublisherJobRecord = {
        id: item.id,
        channel: request.destination,
        contentId,
        status: 'failed',
        attempts: 0,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        error: 'Nenhuma conexão ativa com a Meta. Configure META_PAGE_ID e META_ACCESS_TOKEN no ambiente ou autentique via OAuth.',
      };
      this.jobHistory.unshift(rec);
      this.persistJobRecord(rec);
      logger.info('meta', 'meta-publisher', 'enqueue_deferred', `Publicação ${item.id} não enfileirada: Meta desconectada`);
      return { queued: false, itemId: item.id };
    }

    const rec: PublisherJobRecord = {
      id: item.id,
      channel: request.destination,
      contentId,
      status: 'retrying',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    this.jobHistory.unshift(rec);
    this.queue.push(item);
    logger.info('meta', 'meta-publisher', 'enqueue', `Publicação ${item.id} enfileirada`);

    // Persist job record to Supabase
    this.persistJobRecord(rec);

    this.process().catch(() => {});
    return { queued: true, itemId: item.id };
  }

  private persistJobRecord(rec: PublisherJobRecord): void {
    if (!this.supabase) return;
    (this.supabase as any)
      .from('publisher_jobs')
      .upsert({
        id: rec.id,
        channel: rec.channel,
        content_id: rec.contentId,
        status: rec.status,
        attempts: rec.attempts,
        created_at: rec.createdAt,
        resolved_at: rec.resolvedAt,
        error: rec.error,
      }, { onConflict: 'id' })
      .then(({ error }: any) => {
        if (error) logger.warn('meta', 'meta-publisher', 'persist', `Failed to persist job ${rec.id}`, { error: error.message });
      })
      .catch(() => {});
  }

  getQueue() {
    return this.queue.map(({ id, attempts, nextRetryAt, request }) => ({
      id,
      attempts,
      nextRetryAt,
      destination: request.destination,
    }));
  }

  setTokenExpired(expired: boolean) {
    this.tokenExpired = expired;
    if (expired) logger.warn('meta', 'meta-publisher', 'token', 'Token Meta expirado — refresh agendado');
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (true) {
        const now = Date.now();
        const idx = this.queue.findIndex((q) => q.nextRetryAt <= now);
        if (idx === -1) break;
        const item = this.queue[idx];
        this.queue.splice(idx, 1);
        await this.deliver(item);
        if (this.queue.length === 0) break;
      }
    } finally {
      this.processing = false;
    }
  }

  private async deliver(item: QueueItem): Promise<void> {
    item.attempts += 1;
    try {
      if (this.tokenExpired) {
        this.tokenExpired = false;
        await new Promise((r) => setTimeout(r, 200));
      }

      // Execute via Canonical Meta Adapter
      const pubResponse = await metaAdapter.publishContent({
        destination: item.request.destination,
        message: item.request.message,
        mediaUrl: item.request.mediaUrl,
        linkUrl: item.request.linkUrl,
        pageId: item.request.pageId,
        instagramAccountId: item.request.instagramAccountId,
        contentId: item.contentId,
      });

      if (!pubResponse.success) {
        throw new Error(pubResponse.error || 'Falha na resposta de publicação da Meta');
      }

      const result: MetaPublishResult = {
        success: true,
        facebookPostId: pubResponse.facebookPostId,
        instagramMediaId: pubResponse.instagramMediaId,
        publishedAt: pubResponse.publishedAt,
        destination: item.request.destination,
      };

      eventBus.publish(
        EventTopics.MARKETING_CONTENT_PUBLISHED,
        {
          queueItemId: item.id,
          result,
        },
        'meta_publisher'
      );

      if (item.contentId) {
        marketingService.updateContent(item.contentId, { status: 'publicado' });
      }

      const rec = this.jobHistory.find((j) => j.id === item.id);
      if (rec) {
        rec.status = 'delivered';
        rec.attempts = item.attempts;
        rec.resolvedAt = new Date().toISOString();
        this.persistJobRecord(rec);
      }

      logger.info('meta', 'meta-publisher', 'publish', `Publicação ${item.id} entregue`);
    } catch (err: any) {
      const isAuthError =
        err instanceof MetaAuthenticationRequiredError ||
        err?.name === 'MetaAuthenticationRequiredError' ||
        String(err?.message || err).includes('Nenhuma conexão ativa com a Meta') ||
        String(err?.message || err).includes('Token da Meta ausente');

      if (isAuthError) {
        const rec = this.jobHistory.find((j) => j.id === item.id);
        if (rec) {
          rec.status = 'failed';
          rec.attempts = item.attempts;
          rec.resolvedAt = new Date().toISOString();
          rec.error = err.message || 'Nenhuma conexão ativa com a Meta';
          this.persistJobRecord(rec);
        }
        eventBus.publish(
          EventTopics.MARKETING_CONTENT_PUBLISHED,
          {
            queueItemId: item.id,
            result: {
              success: false,
              destination: item.request.destination,
              publishedAt: new Date().toISOString(),
              error: err.message || String(err),
            },
          },
          'meta_publisher'
        );
        logger.info('meta', 'meta-publisher', 'auth_pending', 'Publicação suspensa: Nenhuma conexão ativa com a Meta (configure credenciais no ambiente ou autentique via OAuth).');
        return;
      }

      if (item.attempts < MAX_ATTEMPTS) {
        item.nextRetryAt = Date.now() + RETRY_BASE_MS * item.attempts;
        this.queue.push(item);
        logger.warn('meta', 'meta-publisher', 'retry', `Tentativa ${item.attempts}/${MAX_ATTEMPTS} para ${item.id}`, {
          message: String(err),
        });
      } else {
        const rec = this.jobHistory.find((j) => j.id === item.id);
        if (rec) {
          rec.status = 'failed';
          rec.attempts = item.attempts;
          rec.resolvedAt = new Date().toISOString();
          rec.error = String(err.message || err);
          this.persistJobRecord(rec);
        }
        eventBus.publish(
          EventTopics.MARKETING_CONTENT_PUBLISHED,
          {
            queueItemId: item.id,
            result: {
              success: false,
              destination: item.request.destination,
              publishedAt: new Date().toISOString(),
              error: String(err),
            },
          },
          'meta_publisher'
        );
        logger.error('meta', 'meta-publisher', 'publish', `Publicação ${item.id} falhou definitivamente`, {
          message: String(err),
        });
      }
    }
  }
}

export const metaPublisher = new MetaPublisher();
