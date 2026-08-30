import { randomUUID } from 'crypto';
import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { marketingService } from '../services/marketing-service';
import { MetaPublishRequest, MetaPublishResult } from '../../types';
import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';
import { MetaAuthenticationRequiredError } from '../../integrations/meta/errors/meta-errors';
import { getSupabaseServerClient } from '../db/supabase-server';
import { validateImageQuality } from '../services/image-quality.service';
import type { ImageQualityResult } from '../services/image-quality.service';

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
  /** Original enqueue timestamp (preservado para jobs recuperados do DB no restart) */
  createdAt?: string;
}

export interface PublisherJobRecord {
  id: string;
  channel: string;
  contentId?: string;
  status: 'delivered' | 'retrying' | 'failed' | 'rejected';
  attempts: number;
  createdAt: string;
  resolvedAt?: string;
  error?: string;
  /** Publish request payload stored in publisher_jobs.job_payload for restart recovery */
  payload?: MetaPublishRequest;
  /** ISO timestamp for next retry attempt (maps to publisher_jobs.scheduled_at) */
  scheduledAt?: string;
}

export interface EnqueueResult {
  queued: boolean;
  itemId: string;
  /** true quando a peça foi REJEITADA pelo gate de qualidade */
  rejected?: boolean;
  /** Motivos da rejeição (ex. resolution_too_low, blurred) */
  reasons?: string[];
  /** Resultado completo do gate (quando mediaUrl presente) */
  quality?: ImageQualityResult;
  /** id do PublisherJobRecord persistido quando rejeitada (rastreio) */
  jobId?: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 60 * 1000;

export class MetaPublisher {
  private queue: QueueItem[] = [];
  private processing = false;
  private tokenExpired = false;
  private jobHistory: PublisherJobRecord[] = [];
  private supabase: ReturnType<typeof getSupabaseServerClient>;

  constructor(supabase?: ReturnType<typeof getSupabaseServerClient>) {
    this.supabase = supabase ?? getSupabaseServerClient();
    this.loadPendingJobs();
  }

  /**
   * Carrega jobs pendentes do publisher_jobs (restart survival).
   * Chamado no construtor; também pode ser chamado explicitamente
   * (ex: testes) para garantir carregamento síncrono.
   */
  public async loadPendingJobs(): Promise<void> {
    if (!this.supabase) return;
    try {
      // publisher_jobs não está nos tipos gerados do Database => cast `any` (mesmo padrão
      // do persistJobRecord baseline).
      const { data, error } = await (this.supabase as any)
        .from('publisher_jobs')
        .select('*')
        .in('status', ['pending', 'retry'])
        .order('created_at', { ascending: true });

      if (error) {
        logger.warn('meta', 'meta-publisher', 'load_pending',
          `Failed to load pending jobs: ${(error as any).message}`, { error });
        return;
      }

      this.queue = (data || []).map((row: any) => ({
        id: row.id,
        request: row.job_payload as MetaPublishRequest,
        contentId: row.content_id,
        attempts: row.attempt_count,
        nextRetryAt: row.scheduled_at ? new Date(row.scheduled_at).getTime() : Date.now(),
        createdAt: row.created_at,
      }));
    } catch (err: any) {
      logger.warn('meta', 'meta-publisher', 'load_pending',
        `Error loading pending jobs: ${err.message}`, { error: err });
    }
  }

  getJobHistory(): PublisherJobRecord[] {
    return [...this.jobHistory].slice(0, 20);
  }

  async enqueue(request: MetaPublishRequest, contentId?: string): Promise<EnqueueResult> {
    // GATE DE QUALIDADE — bloqueia peça reprovada antes de enfileirar.
    // failureKind 'quality' (resolução/borrão) => NÃO enfileira.
    // failureKind 'fetch'/'decode' (falha de infraestrutura) => publica como antes (fail-open).
    if (request.mediaUrl) {
      const gate = await validateImageQuality({ imageUrl: request.mediaUrl });
      if (!gate.pass && gate.failureKind === 'quality') {
        logger.error('meta', 'meta-publisher', 'enqueue_rejected',
          `Publicação ${contentId ?? ''} rejeitada: imagem reprovou no gate de qualidade`, {
            reasons: gate.reasons,
            score: gate.score,
            metrics: gate.metrics,
            mediaUrl: request.mediaUrl,
          });

        // RASTREIO (W1): job persistido como 'rejected' + evento + status de saída no conteúdo.
        // NUNCA deixar a peça em 'agendado' após rejeição — sem estado de saída o worker
        // re-processa a peça eternamente a cada ciclo.
        const rec: PublisherJobRecord = {
          id: randomUUID(),
          channel: request.destination,
          contentId,
          status: 'rejected',
          attempts: 0,
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          error: `Quality gate: ${gate.reasons.join(', ')}`,
          payload: request,
          scheduledAt: new Date().toISOString(),
        };
        this.jobHistory.unshift(rec);
        this.persistJobRecord(rec);

        if (contentId) {
          // Estado de saída + trilha (B1b/W1) em UMA chamada — remove a semi-race da
          // chamada dupla e grava rejected_at. rejection_reason/rejected_at exigem a
          // migration 20260829000001_add_editorial_content_rejection_tracking aplicada.
          const reasons = gate.reasons.join(', ');
          marketingService
            .updateContent(contentId, {
              status: 'reprovado_qualidade',
              rejection_reason: reasons,
              rejected_at: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .catch((err: unknown) =>
              logger.warn('meta', 'meta-publisher', 'enqueue_rejected_status',
                `Falha ao marcar ${contentId} como reprovado_qualidade`, { error: String(err) })
            );
        }

        eventBus.publish(
          EventTopics.MARKETING_CONTENT_REJECTED,
          {
            contentId,
            reasons: gate.reasons,
            score: gate.score,
            metrics: gate.metrics,
            mediaUrl: request.mediaUrl,
            jobId: rec.id,
          },
          'meta_publisher'
        );

        return { queued: false, itemId: '', rejected: true, reasons: gate.reasons, quality: gate, jobId: rec.id };
      }
      if (!gate.pass) {
        logger.warn('meta', 'meta-publisher', 'enqueue_quality_skip',
          `Imagem de ${contentId ?? ''} não pôde ser avaliada (${gate.reasons.join(',')}) — publicando sem bloqueio`, {
            reasons: gate.reasons,
            mediaUrl: request.mediaUrl,
          });
      }
    }

    const item: QueueItem = {
      id: randomUUID(),
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
        payload: request,
        scheduledAt: new Date().toISOString(),
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
      payload: request,
      scheduledAt: new Date().toISOString(),
    };
    this.jobHistory.unshift(rec);
    this.queue.push(item);
    logger.info('meta', 'meta-publisher', 'enqueue', `Publicação ${item.id} enfileirada`);

    // Persist job record to Supabase — fila persistente (restart survival).
    // await garante que o INSERT chegue ao publisher_jobs antes do process() consultar.
    await this.persistJobRecord(rec);

    this.process().catch(() => {});
    return { queued: true, itemId: item.id };
  }

  /**
   * Única via de escrita em publisher_jobs. Mapeia status da aplicação
   * ('retrying'/'delivered'/'rejected'/'failed') para o CHECK constraint da
   * tabela ('pending'/'published'/'blocked'/'failed') e usa as colunas reais
   * do schema (attempt_count, error_detail, job_payload, scheduled_at).
   */
  private persistJobRecord(rec: PublisherJobRecord): Promise<void> {
    if (!this.supabase) return Promise.resolve();

    const statusMap: Record<string, string> = {
      retrying: 'pending',
      delivered: 'published',
      rejected: 'blocked',
      failed: 'failed',
    };
    const dbStatus = statusMap[rec.status] || rec.status;

    return (this.supabase as any)
      .from('publisher_jobs')
      .upsert({
        id: rec.id,
        channel: rec.channel,
        content_id: rec.contentId,
        destination: rec.payload?.destination || rec.channel,
        status: dbStatus,
        attempt_count: rec.attempts,
        scheduled_at: rec.scheduledAt || rec.createdAt,
        published_at: rec.resolvedAt,
        job_payload: rec.payload,
        error_detail: rec.error,
        created_at: rec.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .then(({ error }: any) => {
        if (error) logger.warn('meta', 'meta-publisher', 'persist', `Failed to persist job ${rec.id}`, { error: error.message });
      })
      .catch((err: any) => {
        logger.warn('meta', 'meta-publisher', 'persist', `Error persisting job ${rec.id}: ${err?.message || err}`);
      });
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
      if (!this.supabase) {
        // Fallback: fila em memória (backward compat quando sem Supabase)
        while (true) {
          const now = Date.now();
          const idx = this.queue.findIndex((q) => q.nextRetryAt <= now);
          if (idx === -1) break;
          const item = this.queue[idx];
          this.queue.splice(idx, 1);
          await this.deliver(item);
          if (this.queue.length === 0) break;
        }
        return;
      }

      // Fila persistente: consulta publisher_jobs por jobs pendentes devidos
      const now = new Date().toISOString();
      // publisher_jobs não está nos tipos gerados do Database => cast `any` (mesmo padrão
      // do persistJobRecord baseline). jobs vira any: job_payload/content_id/etc. resolvem.
      const { data: jobs, error } = await (this.supabase as any)
        .from('publisher_jobs')
        .select('*')
        .in('status', ['pending', 'retry'])
        .lte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(30);

      if (error) {
        logger.warn('meta', 'meta-publisher', 'process', `Failed to query pending jobs: ${(error as any).message}`, { error });
        return;
      }

      for (const job of jobs || []) {
        const item: QueueItem = {
          id: job.id,
          request: job.job_payload as MetaPublishRequest,
          contentId: job.content_id,
          attempts: job.attempt_count,
          nextRetryAt: job.scheduled_at ? new Date(job.scheduled_at).getTime() : Date.now(),
          createdAt: job.created_at,
        };

        // Sync fila em memória (remove o job que será processado do cache)
        this.queue = this.queue.filter((q) => q.id !== item.id);

        await this.deliver(item);
      }
    } finally {
      this.processing = false;
    }
  }

  private async deliver(item: QueueItem): Promise<void> {
    item.attempts += 1;

    // rec sempre disponível: recupera do jobHistory (enqueue) ou cria a partir
    // do item (job carregado do publisher_jobs em restart — loadPendingJobs não povoa jobHistory)
    const findOrCreateRec = (): PublisherJobRecord => {
      const existing = this.jobHistory.find((j) => j.id === item.id);
      if (existing) return existing;
      const created: PublisherJobRecord = {
        id: item.id,
        channel: item.request.destination,
        contentId: item.contentId,
        status: 'retrying',
        attempts: item.attempts,
        // Preserva o created_at original do job recuperado do DB (não o horário de delivery)
        createdAt: item.createdAt || new Date().toISOString(),
        payload: item.request,
        scheduledAt: new Date(item.nextRetryAt).toISOString(),
      };
      this.jobHistory.unshift(created);
      return created;
    };

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

      const rec = findOrCreateRec();
      rec.status = 'delivered';
      rec.attempts = item.attempts;
      rec.resolvedAt = new Date().toISOString();
      void this.persistJobRecord(rec);

      logger.info('meta', 'meta-publisher', 'publish', `Publicação ${item.id} entregue`);
    } catch (err: any) {
      const isAuthError =
        err instanceof MetaAuthenticationRequiredError ||
        err?.name === 'MetaAuthenticationRequiredError' ||
        String(err?.message || err).includes('Nenhuma conexão ativa com a Meta') ||
        String(err?.message || err).includes('Token da Meta ausente');

      if (isAuthError) {
        const rec = findOrCreateRec();
        rec.status = 'failed';
        rec.attempts = item.attempts;
        rec.resolvedAt = new Date().toISOString();
        rec.error = err.message || 'Nenhuma conexão ativa com a Meta';
        void this.persistJobRecord(rec);
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
        // Persiste estado de retry na fila persistente (scheduled_at futuro
        // garante que o process() só o re-picka no horário agendado).
        const rec = findOrCreateRec();
        rec.attempts = item.attempts;
        rec.status = 'retrying';
        rec.error = String(err.message || err);
        rec.scheduledAt = new Date(item.nextRetryAt).toISOString();
        void this.persistJobRecord(rec);
      } else {
        const rec = findOrCreateRec();
        rec.status = 'failed';
        rec.attempts = item.attempts;
        rec.resolvedAt = new Date().toISOString();
        rec.error = String(err.message || err);
        void this.persistJobRecord(rec);
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
