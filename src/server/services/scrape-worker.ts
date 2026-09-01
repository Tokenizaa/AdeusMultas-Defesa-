/**
 * @file scrape-worker.ts
 * Worker assíncrono para processamento de jobs de scraping do Google Maps.
 * Utiliza BullMQ quando Redis está disponível e fornece fallback resiliente
 * acoplado ao Supabase (collection_runs) para ambientes sem Redis.
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../scraper-prospecting/supabase';
import { logger } from '../../scraper-prospecting/logger';
import { SearchConfig, ScrapeResult, ScraperProgress } from '../../scraper-prospecting/types';

export type ScrapeJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScrapeJobData {
  jobId: string;
  config: SearchConfig;
  collectionRunId: string;
}

export type ScrapeJobProgress = ScraperProgress;

export interface ScrapeJobRecord {
  id: string;
  status: ScrapeJobStatus;
  config: SearchConfig;
  progress: ScrapeJobProgress;
  error?: string;
  collectionRunId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
}

export class ScrapeWorkerService {
  private static instance: ScrapeWorkerService | null = null;
  private queue: Queue<ScrapeJobData> | null = null;
  private worker: Worker<ScrapeJobData> | null = null;
  private redisConnection: Redis | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private isProcessingFallback = false;
  private isBullMqActive = false;
  private readonly POLL_INTERVAL_MS = 4000;
  private readonly QUEUE_NAME = 'google-maps-scrape-jobs';

  static getInstance(): ScrapeWorkerService {
    if (!ScrapeWorkerService.instance) {
      ScrapeWorkerService.instance = new ScrapeWorkerService();
    }
    return ScrapeWorkerService.instance;
  }

  constructor() {
    this.initBullMQ();
  }

  private initBullMQ(): void {
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    if (redisUrl || redisHost) {
      try {
        this.redisConnection = redisUrl
          ? new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
          : new Redis({
              host: redisHost,
              port: redisPort,
              password: process.env.REDIS_PASSWORD || undefined,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            });

        this.redisConnection.on('error', (err) => {
          logger.warn('Aviso de conexão Redis (BullMQ Scraper):', { error: err.message });
        });

        this.queue = new Queue<ScrapeJobData>(this.QUEUE_NAME, {
          connection: this.redisConnection,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: false,
            removeOnFail: false,
          },
        });

        this.worker = new Worker<ScrapeJobData>(
          this.QUEUE_NAME,
          async (job: Job<ScrapeJobData>) => {
            return this.processJob(job.data.jobId, job.data.config, job.data.collectionRunId);
          },
          {
            connection: this.redisConnection,
            concurrency: 1, // Single headless browser at a time for stability and resource sanity
          }
        );

        this.worker.on('completed', (job) => {
          logger.info('BullMQ Scrape Job concluído com sucesso', { jobId: job.data.jobId });
        });

        this.worker.on('failed', (job, err) => {
          logger.error('BullMQ Scrape Job falhou', { jobId: job?.data.jobId, error: err.message });
        });

        this.isBullMqActive = true;
        logger.info('BullMQ Scrape Worker inicializado com sucesso.');
      } catch (err) {
        logger.warn('Não foi possível conectar ao Redis, utilizando engine de fila de banco:', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.isBullMqActive = false;
      }
    } else {
      logger.info('Redis não configurado. Utilizando engine resiliente via Supabase.');
      this.isBullMqActive = false;
    }
  }

  /**
   * Enfileira um novo job de scraping e retorna o registro inicial.
   */
  async createJob(config: SearchConfig): Promise<ScrapeJobRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const jobRecord: ScrapeJobRecord = {
      id,
      status: 'queued',
      config,
      progress: {
        phase: 'discovery',
        discovered: 0,
        processed: 0,
        persisted: 0,
        duplicates: 0,
        errors: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persistir no Supabase como collection_run com status 'queued'
    const { error } = await supabaseAdmin.from('collection_runs').insert({
      id,
      status: 'queued',
      queries: config.queries,
      cities: config.cities || [],
      states: config.states || [],
      limit_per_query: config.limitPerQuery || 10,
      results_found: 0,
      new_leads: 0,
      duplicates: 0,
      rejected: 0,
      errors: [],
      queries_executed: [],
      started_at: now,
    });

    if (error) {
      logger.error('Erro ao persistir collection_run no banco', { error: error.message, id });
      throw new Error(`Falha ao registrar job no banco: ${error.message}`);
    }

    // 2. Se BullMQ estiver ativo, enfileirar no BullMQ
    if (this.isBullMqActive && this.queue) {
      try {
        await this.queue.add(
          'scrape',
          { jobId: id, config, collectionRunId: id },
          { jobId: id }
        );
        logger.info('Job enfileirado no BullMQ', { id });
      } catch (err) {
        logger.warn('Falha ao enfileirar no BullMQ, processamento será feito pelo worker DB:', {
          id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('Job de scraping registrado com sucesso', { id, config });
    return jobRecord;
  }

  /**
   * Obtém status detalhado de um job pelo ID.
   */
  async getJob(id: string): Promise<ScrapeJobRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('collection_runs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return this.mapDBToJobRecord(data);
  }

  /**
   * Lista histórico de jobs de scraping.
   */
  async listJobs(limit = 20): Promise<ScrapeJobRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('collection_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((d) => this.mapDBToJobRecord(d));
  }

  /**
   * Cancelamento cooperativo de um job de scraping.
   */
  async cancelJob(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job) return false;

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return false;
    }

    const { error } = await supabaseAdmin
      .from('collection_runs')
      .update({
        status: 'cancelled',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('Erro ao cancelar job no banco', { id, error: error.message });
      return false;
    }

    // Se estiver no BullMQ, tentar cancelar
    if (this.isBullMqActive && this.queue) {
      try {
        const bullJob = await this.queue.getJob(id);
        if (bullJob) {
          await bullJob.remove().catch(() => undefined);
        }
      } catch {
        // Ignora erro de remoção BullMQ se já em execução
      }
    }

    logger.info('Job de scraping cancelado com sucesso', { id });
    return true;
  }

  /**
   * Inicia o worker loop de background.
   */
  start(): void {
    if (this.fallbackTimer) return;

    this.fallbackTimer = setInterval(() => this.processNextDBJob(), this.POLL_INTERVAL_MS);
    // Dispara checagem imediata
    this.processNextDBJob();

    logger.info('ScrapeWorker background loop iniciado.');
  }

  /**
   * Para o worker loop.
   */
  stop(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.worker) {
      this.worker.close().catch(() => undefined);
    }
    if (this.queue) {
      this.queue.close().catch(() => undefined);
    }
    logger.info('ScrapeWorker background loop parado.');
  }

  /**
   * Checa periodicamente por jobs 'queued' ou órfãos 'running' no Supabase.
   */
  private async processNextDBJob(): Promise<void> {
    if (this.isProcessingFallback) return;

    try {
      // Buscar próximo job 'queued' ou 'running' órfão
      const { data, error } = await supabaseAdmin
        .from('collection_runs')
        .select('*')
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !data || data.length === 0) return;

      const dbJob = data[0];
      const jobRecord = this.mapDBToJobRecord(dbJob);

      // Se status é 'running', checar se está órfão (sem heartbeat há mais de 2 minutos)
      if (jobRecord.status === 'running') {
        const lastUpdated = new Date(dbJob.updated_at || dbJob.started_at).getTime();
        const now = Date.now();
        if (now - lastUpdated > 2 * 60 * 1000) {
          logger.warn('Job órfão detectado pelo ScrapeWorker, retomando execução:', { id: jobRecord.id });
        } else {
          // Job ainda ativo em execução, não interferir
          return;
        }
      }

      this.isProcessingFallback = true;
      await this.processJob(jobRecord.id, jobRecord.config, jobRecord.id);
    } catch (err) {
      logger.error('Erro no loop do ScrapeWorker:', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.isProcessingFallback = false;
    }
  }

  /**
   * Executa um job de scraping completo de forma assíncrona.
   */
  private async processJob(jobId: string, config: SearchConfig, collectionRunId: string): Promise<ScrapeResult> {
    const nowIso = new Date().toISOString();
    logger.info('Iniciando processamento do job de scraping:', { jobId, collectionRunId });

    // Atualizar status para running e registrar heartbeat inicial
    await supabaseAdmin
      .from('collection_runs')
      .update({
        status: 'running',
        started_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', collectionRunId);

    const cancelFlag = { cancelled: false };
    const cancelChecker = setInterval(async () => {
      if (cancelFlag.cancelled) return;
      const { data } = await supabaseAdmin
        .from('collection_runs')
        .select('status')
        .eq('id', collectionRunId)
        .maybeSingle();

      if (data?.status === 'cancelled') {
        cancelFlag.cancelled = true;
        logger.info('Cancelamento cooperativo identificado durante execução', { jobId });
      }
    }, 2500);

    try {
      const { runScrapeAsJob } = await import('../../scraper-prospecting/persister');

      const result = await runScrapeAsJob(
        config,
        {
          onProgress: async (progress) => {
            await this.updateProgressInDB(collectionRunId, progress);
          },
          onCheckCancel: () => cancelFlag.cancelled,
          onDriverCrash: () => {
            logger.warn('Driver crash reportado pelo scraper, o job se recuperará automaticamente.', { jobId });
          },
        },
        collectionRunId
      );

      const finalStatus = cancelFlag.cancelled
        ? 'cancelled'
        : result.hasBlockingError
          ? 'error'
          : 'completed';

      await supabaseAdmin
        .from('collection_runs')
        .update({
          status: finalStatus,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          results_found: result.totalFound,
          new_leads: result.inserted,
          duplicates: result.duplicates,
          rejected: result.rejected,
          errors: result.errors,
          queries_executed: result.queriesExecuted,
        })
        .eq('id', collectionRunId);

      logger.info('Processamento de job finalizado com sucesso:', {
        jobId,
        status: finalStatus,
        totalFound: result.totalFound,
        newLeads: result.inserted,
      });

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('Falha fatal durante execução do scrape job:', { jobId, error: errorMsg });

      await supabaseAdmin
        .from('collection_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          errors: [errorMsg],
        })
        .eq('id', collectionRunId);

      throw err;
    } finally {
      clearInterval(cancelChecker);
    }
  }

  /**
   * Salva progresso periódico no banco de dados com atualização de heartbeat.
   */
  private async updateProgressInDB(collectionRunId: string, progress: ScraperProgress): Promise<void> {
    try {
      await supabaseAdmin
        .from('collection_runs')
        .update({
          results_found: progress.discovered,
          new_leads: progress.persisted,
          duplicates: progress.duplicates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collectionRunId);
    } catch (err) {
      logger.warn('Falha ao atualizar heartbeat de progresso:', { collectionRunId, error: err });
    }
  }

  private mapDBToJobRecord(data: any): ScrapeJobRecord {
    const dbToStatus: Record<string, ScrapeJobStatus> = {
      queued: 'queued',
      running: 'running',
      completed: 'completed',
      partial: 'running',
      error: 'failed',
      cancelled: 'cancelled',
    };

    return {
      id: data.id,
      status: dbToStatus[data.status] || 'queued',
      config: {
        queries: Array.isArray(data.queries) ? data.queries : [],
        cities: Array.isArray(data.cities) ? data.cities : [],
        states: Array.isArray(data.states) ? data.states : [],
        limitPerQuery: data.limit_per_query || 10,
      },
      progress: {
        phase: data.status === 'completed' ? 'completed' : data.status === 'running' ? 'details' : 'discovery',
        discovered: data.results_found || 0,
        processed: (data.new_leads || 0) + (data.duplicates || 0) + (data.rejected || 0),
        persisted: data.new_leads || 0,
        duplicates: data.duplicates || 0,
        errors: Array.isArray(data.errors) ? data.errors.length : 0,
      },
      error: Array.isArray(data.errors) && data.errors.length > 0 ? data.errors[data.errors.length - 1] : undefined,
      collectionRunId: data.id,
      createdAt: data.created_at || data.started_at,
      startedAt: data.started_at,
      finishedAt: data.finished_at || undefined,
      updatedAt: data.updated_at || data.created_at,
    };
  }
}

export const scrapeWorker = ScrapeWorkerService.getInstance();
