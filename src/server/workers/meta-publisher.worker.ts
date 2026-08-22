import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { marketingService } from '../services/marketing-service';
import { MetaPublishRequest, MetaPublishResult } from '../../types';
import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';

/**
 * MetaPublisher — Production delivery queue with retry and token health awareness.
 * Dispatches publications through the canonical MetaAdapter.
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
    this.jobHistory.unshift({
      id: item.id,
      channel: request.destination,
      contentId,
      status: 'retrying',
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
    this.queue.push(item);
    logger.info('meta', 'meta-publisher', 'enqueue', `Publicação ${item.id} enfileirada`);
    this.process().catch(() => {});
    return { queued: true, itemId: item.id };
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
      }

      logger.info('meta', 'meta-publisher', 'publish', `Publicação ${item.id} entregue`);
    } catch (err: any) {
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
