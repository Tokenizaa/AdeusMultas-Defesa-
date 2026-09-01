/**
 * @file scraper-job-queue.ts
 * Fila assíncrona e resiliente para jobs de scraping do Google Maps.
 * Persiste estado no banco (collection_runs) para sobreviver a reinicializações.
 */

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../scraper-prospecting/supabase';
import { logger } from '../../scraper-prospecting/logger';
import { SearchConfig } from '../../scraper-prospecting/types';

export type ScraperJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ScraperJob {
  id: string;
  status: ScraperJobStatus;
  config: SearchConfig;
  progress: {
    discovered: number;
    processed: number;
    persisted: number;
    duplicates: number;
    errors: number;
  };
  error?: string;
  collectionRunId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
}

interface DBCollectionRun {
  id: string;
  status: string;
  queries: string[];
  cities: string[];
  states: string[];
  limit_per_query: number;
  results_found: number;
  new_leads: number;
  duplicates: number;
  rejected: number;
  errors: string[];
  queries_executed: any[];
  started_at: string;
  finished_at: string | null;
  created_at: string;
  updated_at?: string;
}

export class ScraperJobQueue {
  private static instance: ScraperJobQueue | null = null;
  private workerTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly POLL_INTERVAL_MS = 5000;

  static getInstance(): ScraperJobQueue {
    if (!ScraperJobQueue.instance) {
      ScraperJobQueue.instance = new ScraperJobQueue();
    }
    return ScraperJobQueue.instance;
  }

  /**
   * Cria um novo job de scraping e retorna o ID.
   * O job é inserido no banco com status 'queued'.
   */
  async createJob(config: SearchConfig): Promise<ScraperJob> {
    const id = `scrape_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const job: ScraperJob = {
      id,
      status: 'queued',
      config,
      progress: {
        discovered: 0,
        processed: 0,
        persisted: 0,
        duplicates: 0,
        errors: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Inserir no banco como collection_run com status 'queued'
    const { data, error } = await supabaseAdmin
      .from('collection_runs')
      .insert({
        id,
        status: 'queued',
        queries: config.queries,
        cities: config.cities || [],
        states: config.states || [],
        limit_per_query: config.limitPerQuery,
        results_found: 0,
        new_leads: 0,
        duplicates: 0,
        rejected: 0,
        errors: [],
        queries_executed: [],
        started_at: now,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Erro ao criar job de scraping', { error: error.message, id });
      throw new Error(`Falha ao criar job: ${error.message}`);
    }

    logger.info('Job de scraping criado', { id, config });
    return job;
  }

  /**
   * Obtém um job pelo ID (lendo do banco).
   */
  async getJob(id: string): Promise<ScraperJob | null> {
    const { data, error } = await supabaseAdmin
      .from('collection_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapDBToJob(data);
  }

  /**
   * Lista jobs recentes.
   */
  async listJobs(limit = 20): Promise<ScraperJob[]> {
    const { data, error } = await supabaseAdmin
      .from('collection_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(this.mapDBToJob);
  }

  /**
   * Cancela um job (marca como cancelled no banco).
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
      logger.error('Erro ao cancelar job', { error: error.message, id });
      return false;
    }

    logger.info('Job de scraping cancelado', { id });
    return true;
  }

  /**
   * Inicia o worker de polling (deve ser chamado uma vez no bootstrap do servidor).
   */
  startWorker(): void {
    if (this.workerTimer) return;

    this.workerTimer = setInterval(() => this.processNextJob(), this.POLL_INTERVAL_MS);
    // Executar imediatamente na primeira vez
    this.processNextJob();

    logger.info('Scraper worker iniciado', { intervalMs: this.POLL_INTERVAL_MS });
  }

  /**
   * Para o worker de polling.
   */
  stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
      logger.info('Scraper worker parado');
    }
  }

  /**
   * Processa o próximo job na fila.
   */
  private async processNextJob(): Promise<void> {
    if (this.isProcessing) return;

    try {
      // Buscar próximo job 'queued' ou 'running' órfão (worker morreu no meio)
      const { data, error } = await supabaseAdmin
        .from('collection_runs')
        .select('*')
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !data || data.length === 0) return;

      const dbJob = data[0];
      const job = this.mapDBToJob(dbJob);

      // Se já está 'running', verificar se o worker anterior morreu (job órfão)
      if (job.status === 'running') {
        // Verificar se foi atualizado recentemente (últimos 2 minutos)
        const updatedAt = new Date(dbJob.updated_at || dbJob.started_at).getTime();
        const now = Date.now();
        if (now - updatedAt > 2 * 60 * 1000) {
          logger.warn('Job órfão detectado, retomando', { id: job.id });
        } else {
          // Job ainda ativo em outro worker, pular
          return;
        }
      }

      await this.executeJob(job);
    } catch (err) {
      logger.error('Erro no loop do worker', { error: err instanceof Error ? err.message : err });
    }
  }

  /**
   * Executa um job de scraping completo.
   */
  private async executeJob(job: ScraperJob): Promise<void> {
    this.isProcessing = true;

    // Flag de cancelamento - atualizado periodicamente do DB para ser consultado sincronamente
    const cancelFlag: { cancelled: boolean } = { cancelled: false };
    const CANCEL_CHECK_INTERVAL_MS = 3000;
    const cancelInterval = setInterval(async () => {
      if (cancelFlag.cancelled) return;
      const { data } = await supabaseAdmin
        .from('collection_runs')
        .select('status')
        .eq('id', job.id)
        .single();
      if (data?.status === 'cancelled') {
        cancelFlag.cancelled = true;
        logger.info('Cancelamento detectado via polling', { jobId: job.id });
      }
    }, CANCEL_CHECK_INTERVAL_MS);

    try {
      // Atualizar status para running
      await this.updateJobStatus(job.id, 'running', { started_at: new Date().toISOString() });
      job.status = 'running';
      job.startedAt = new Date().toISOString();

      // Importar o scraper dinamicamente para evitar dependência circular
      const { runScrapeAsJob } = await import('../../scraper-prospecting/persister');

      // Executar o scraping com callbacks de progresso
      const result = await runScrapeAsJob(job.config, {
        onProgress: (progress) => this.updateProgress(job.id, progress),
        onCheckCancel: () => cancelFlag.cancelled,
        onDriverCrash: () => this.handleDriverCrash(job.id),
      }, job.id /* collectionRunId: reuse o mesmo collection_run criado pelo queue */);

      // Marcar como concluído
      await this.updateJobStatus(job.id, result.hasBlockingError ? 'failed' : 'completed', {
        finished_at: new Date().toISOString(),
        results_found: result.totalFound,
        new_leads: result.inserted,
        duplicates: result.duplicates,
        rejected: result.rejected,
        errors: result.errors,
        queries_executed: result.queriesExecuted,
      });

      logger.info('Job de scraping finalizado', {
        id: job.id,
        status: result.hasBlockingError ? 'failed' : 'completed',
        totalFound: result.totalFound,
        inserted: result.inserted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Falha fatal no job de scraping', { id: job.id, error: message });

      await this.updateJobStatus(job.id, 'failed', {
        finished_at: new Date().toISOString(),
        errors: [message],
      });
    } finally {
      clearInterval(cancelInterval);
      this.isProcessing = false;
    }
  }

  private async updateProgress(jobId: string, progress: Partial<ScraperJob['progress']>): Promise<void> {
    // Progresso logado via logger
    logger.info('Progresso do job', { jobId, progress });
  }

  private async checkCancelled(jobId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('collection_runs')
      .select('status')
      .eq('id', jobId)
      .single();

    return data?.status === 'cancelled';
  }

  private async handleDriverCrash(jobId: string): Promise<void> {
    logger.warn('Driver crash detectado, job será retomado', { jobId });
    // O job permanece como 'running', o worker vai retomar na próxima iteração
  }

  private async updateJobStatus(
    jobId: string,
    status: ScraperJobStatus,
    extraFields: Record<string, any> = {}
  ): Promise<void> {
    // Mapear status do ScraperJobStatus para o DB (failed → error)
    const jobToDbStatus: Record<ScraperJobStatus, string> = {
      queued: 'queued',
      running: 'running',
      completed: 'completed',
      failed: 'error',
      cancelled: 'cancelled',
    };
    const { error } = await supabaseAdmin
      .from('collection_runs')
      .update({
        status: jobToDbStatus[status] || status,
        finished_at: ['completed', 'failed', 'cancelled'].includes(status)
          ? new Date().toISOString()
          : undefined,
        updated_at: new Date().toISOString(),
        ...extraFields,
      })
      .eq('id', jobId);

    if (error) {
      logger.error('Erro ao atualizar status do job', { jobId, error: error.message });
    }
  }

  private mapDBToJob(data: DBCollectionRun): ScraperJob {
    // Mapear status do DB para o tipo ScraperJobStatus
    const dbToJobStatus: Record<string, ScraperJobStatus> = {
      queued: 'queued',
      running: 'running',
      completed: 'completed',
      partial: 'running', // partial → tratar como running para retomar
      error: 'failed',
      cancelled: 'cancelled',
    };
    const lastQuery = data.queries_executed?.[data.queries_executed.length - 1] || {};
    return {
      id: data.id,
      status: dbToJobStatus[data.status] || 'queued',
      config: {
        queries: data.queries,
        cities: data.cities,
        states: data.states,
        limitPerQuery: data.limit_per_query,
      },
      progress: {
        discovered: data.results_found,
        processed: data.new_leads + data.duplicates + data.rejected,
        persisted: data.new_leads,
        duplicates: data.duplicates,
        errors: data.errors?.length || 0,
      },
      error: data.errors?.[data.errors.length - 1],
      collectionRunId: data.id,
      createdAt: data.created_at,
      startedAt: data.started_at,
      finishedAt: data.finished_at || undefined,
      updatedAt: data.updated_at || data.started_at,
    };
  }
}

export const scraperJobQueue = ScraperJobQueue.getInstance();