/**
 * @file scrape.ts
 * Rotas da API para gerenciamento e orquestração de jobs assíncronos de scraping.
 * Fornece endpoints para criação, consulta de status, cancelamento cooperativo e histórico.
 */

import { Router, Request, Response } from 'express';
import { scrapeWorker } from '../services/scrape-worker';
import { supabaseAdmin } from '../../scraper-prospecting/supabase';
import { SearchConfig } from '../../scraper-prospecting/types';

const router = Router();

/**
 * POST /api/scrape ou POST /api/scrape/
 * Cria e enfileira um novo job de scraping headless do Google Maps.
 */
router.post(['/', '/scrape'], async (req: Request, res: Response) => {
  try {
    const { queries = [], cities = [], states = [], limitPerQuery = 10 } = req.body || {};

    const rawQueries = Array.isArray(queries)
      ? queries.map((q: any) => String(q).trim()).filter(Boolean)
      : typeof queries === 'string' && queries.trim()
        ? [queries.trim()]
        : [];

    const rawCities = Array.isArray(cities)
      ? cities.map((c: any) => String(c).trim()).filter(Boolean)
      : typeof cities === 'string' && cities.trim()
        ? [cities.trim()]
        : [];

    const rawStates = Array.isArray(states)
      ? states.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof states === 'string' && states.trim()
        ? [states.trim()]
        : [];

    const config: SearchConfig = {
      queries: rawQueries.length > 0 ? rawQueries : ['despachante de trânsito', 'advogado direito de trânsito'],
      cities: rawCities,
      states: rawStates,
      limitPerQuery: Math.max(1, Math.min(100, Number(limitPerQuery) || 10)),
    };

    const job = await scrapeWorker.createJob(config);

    res.status(201).json({
      success: true,
      id: job.id,
      jobId: job.id,
      status: job.status,
      config: job.config,
      progress: job.progress,
      createdAt: job.createdAt,
      message: `Job de scraping enfileirado com sucesso. Consulte GET /api/scrape/${job.id} para acompanhar o progresso.`,
    });
  } catch (err: any) {
    console.error('Erro ao criar job de scraping:', err);
    res.status(500).json({
      success: false,
      error: 'Falha ao criar job de scraping',
      message: err?.message || String(err),
    });
  }
});

/**
 * GET /api/scrape ou GET /api/scrape/
 * Lista histórico recente de jobs de scraping.
 */
router.get(['/', '/scrape'], async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const jobs = await scrapeWorker.listJobs(limit);
    res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Falha ao listar jobs de scraping',
      message: err?.message || String(err),
    });
  }
});

/**
 * GET /api/scrape/:id ou GET /api/scrape/scrape/:id
 * Consulta status detalhado, progresso e estatísticas de um job específico.
 */
router.get(['/:id', '/scrape/:id'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await scrapeWorker.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job não encontrado',
        message: `Nenhum job de scraping encontrado com o ID '${id}'.`,
      });
    }

    res.json({
      success: true,
      id: job.id,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      config: job.config,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      updatedAt: job.updatedAt,
      error: job.error,
      collectionRunId: job.collectionRunId,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Falha ao consultar status do job',
      message: err?.message || String(err),
    });
  }
});

/**
 * POST /api/scrape/:id/cancel ou POST /api/scrape/scrape/:id/cancel
 * Solicita cancelamento cooperativo de um job em andamento ou na fila.
 */
router.post(['/:id/cancel', '/scrape/:id/cancel'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cancelled = await scrapeWorker.cancelJob(id);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível cancelar o job',
        message: 'O job não existe ou já foi finalizado/cancelado anteriormente.',
      });
    }

    res.json({
      success: true,
      id,
      jobId: id,
      status: 'cancelled',
      message: 'Job de scraping cancelado com sucesso.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Falha ao cancelar job de scraping',
      message: err?.message || String(err),
    });
  }
});

/**
 * GET /api/scrape/:id/results
 * Retorna os leads coletados e persistidos no banco de dados para este job específico.
 */
router.get(['/:id/results', '/scrape/:id/results'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));

    // Buscar leads associados a este collection_run
    const { data: leads, error } = await supabaseAdmin
      .from('marketing_leads')
      .select('*')
      .eq('collection_run_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const { data: runRow } = await supabaseAdmin
      .from('collection_runs')
      .select('status, results_found, new_leads, duplicates, rejected, errors, started_at, finished_at')
      .eq('id', id)
      .maybeSingle();

    res.json({
      success: true,
      jobId: id,
      status: runRow?.status || 'unknown',
      totalFound: runRow?.results_found || 0,
      newLeads: runRow?.new_leads || (leads ? leads.length : 0),
      duplicates: runRow?.duplicates || 0,
      rejected: runRow?.rejected || 0,
      errors: runRow?.errors || [],
      startedAt: runRow?.started_at,
      finishedAt: runRow?.finished_at,
      count: leads?.length || 0,
      leads: leads || [],
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Falha ao buscar resultados do job',
      message: err?.message || String(err),
    });
  }
});

export default router;
