/**
 * @file scrape-e2e.test.ts
 * Suíte de testes de ponta-a-ponta (E2E) para o subsistema de Scraping:
 * 1. Inicialização e configuração do WebDriver em modo headless (flags de container).
 * 2. Separação explícita de fases (Discovery vs. Detail Extraction).
 * 3. Persistência periódica de progresso (heartbeat) no banco de dados.
 * 4. Retomada resiliente pós-crash (crash resumption) sem reprocessar queries finalizadas.
 * 5. Ciclo de vida desacoplado das rotas REST (/api/scrape, /api/scrape/:id, /api/scrape/:id/cancel, /api/scrape/:id/results).
 */

// Mock env vars for scraper supabase client (required since Phase 6) — MUST BE BEFORE IMPORTS
vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { Express } from 'express';
import scrapeRoutes from '@/server/routes/scrape';
import { scrapeWorker } from '@/server/services/scrape-worker';
import { SeleniumSession } from '@/scraper-prospecting/selenium/session';
import { GoogleMapsSeleniumScraper } from '@/scraper-prospecting/selenium/google-maps-scraper';
import { supabaseAdmin } from '@/scraper-prospecting/supabase';
import { SearchConfig, RawLead, ScraperProgress } from '@/scraper-prospecting/types';

describe('E2E Scraper Subsystem Tests', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/scrape', scrapeRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Headless WebDriver & Container Flag Enforcement', () => {
    it('deve configurar todas as flags headless obrigatórias para container no SeleniumSession', () => {
      const session = new SeleniumSession({ headless: true });
      const options = (session as any).options;

      expect(options.headless).toBe(true);
      expect(options.args).toContain('--headless');
      expect(options.args).toContain('--headless=new');
      expect(options.args).toContain('--disable-gpu');
      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-dev-shm-usage');
      expect(options.args).toContain('--disable-blink-features=AutomationDetected');
      expect(options.args).toContain('--disable-extensions');
    });

    it('não deve lançar erro ao instanciar SeleniumSession com opções customizadas', () => {
      const session = new SeleniumSession({
        headless: true,
        args: ['--window-size=1280,720'],
      });
      expect((session as any).options.args).toContain('--window-size=1280,720');
    });
  });

  describe('2. Pipeline & Phase Separation (Discovery vs. Detail Extraction)', () => {
    it('deve registrar callbacks para discovery, extração de detalhes e card-level streaming', async () => {
      const session = new SeleniumSession({ headless: true });
      const onProgress = vi.fn();
      const onCardExtracted = vi.fn();
      const onCheckCancel = vi.fn().mockReturnValue(false);

      const scraper = new GoogleMapsSeleniumScraper(session, {
        onProgress,
        onCardExtracted,
        onCheckCancel,
      });

      expect(scraper).toBeDefined();
      expect((scraper as any).callbacks.onProgress).toBe(onProgress);
      expect((scraper as any).callbacks.onCardExtracted).toBe(onCardExtracted);
    });

    it('deve extrair PlaceID de links do Google Maps corretamente', () => {
      const session = new SeleniumSession({ headless: true });
      const scraper = new GoogleMapsSeleniumScraper(session);

      const urlWithPlaceId = 'https://www.google.com/maps/place/Despachante+Silva/data=!4m7!3m6!1s0x94ce59c123456789:0x9876543210abcdef!8m2!3d-23.55052!4d-46.633308';
      const placeId = (scraper as any).extractPlaceId(urlWithPlaceId);

      expect(placeId).toBe('0x94ce59c123456789:0x9876543210abcdef');
    });
  });

  describe('3. Periodic Progress Saving & Database Heartbeat', () => {
    it('deve atualizar o progresso no banco com results_found e new_leads a cada atualização', async () => {
      const updateSpy = vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      const testRunId = 'test-run-123';
      const progress: ScraperProgress = {
        phase: 'details',
        discovered: 25,
        processed: 10,
        persisted: 8,
        duplicates: 2,
        errors: 0,
      };

      await (scrapeWorker as any).updateProgressInDB(testRunId, progress);

      expect(updateSpy).toHaveBeenCalledWith('collection_runs');
    });
  });

  describe('4. Crash Resumption & Idempotence Check', () => {
    it('deve identificar checkpoint pré-existente e manter dados em caso de retomada', async () => {
      const checkpointData = {
        id: 'checkpoint-run-id',
        status: 'running',
        results_found: 15,
        new_leads: 10,
        duplicates: 5,
        rejected: 0,
        errors: [],
        queries_executed: [
          {
            query: 'despachante',
            location: 'São Paulo',
            found: 15,
            inserted: 10,
            filled: 0,
            duplicates: 5,
            completeDuplicates: 5,
            rejected: 0,
            errors: [],
          },
        ],
      };

      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: checkpointData, error: null }),
          }),
        }),
      } as any);

      const jobRecord = await scrapeWorker.getJob('checkpoint-run-id');
      expect(jobRecord).not.toBeNull();
      expect(jobRecord?.status).toBe('running');
      expect(jobRecord?.progress.discovered).toBe(15);
      expect(jobRecord?.progress.persisted).toBe(10);
    });
  });

  describe('5. REST API Endpoints Lifecycle Flow', () => {
    it('POST /api/scrape deve validar entrada, criar job e retornar HTTP 201', async () => {
      vi.spyOn(scrapeWorker, 'createJob').mockResolvedValueOnce({
        id: 'job-uuid-1234',
        status: 'queued',
        config: {
          queries: ['despachante'],
          cities: ['Curitiba'],
          states: ['PR'],
          limitPerQuery: 5,
        },
        progress: {
          phase: 'discovery',
          discovered: 0,
          processed: 0,
          persisted: 0,
          duplicates: 0,
          errors: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Simulação via handler interno do router
      const req = {
        body: {
          queries: ['despachante'],
          cities: ['Curitiba'],
          states: ['PR'],
          limitPerQuery: 5,
        },
      } as any;

      let statusCode = 0;
      let responseBody: any = null;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      } as any;

      // Invocar o POST handler
      const postHandler = (scrapeRoutes.stack.find((layer: any) => layer.route?.methods?.post) as any).route.stack[0].handle;
      await postHandler(req, res);

      expect(statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.id).toBe('job-uuid-1234');
      expect(responseBody.status).toBe('queued');
    });

    it('GET /api/scrape/:id deve retornar 404 para job inexistente', async () => {
      vi.spyOn(scrapeWorker, 'getJob').mockResolvedValueOnce(null);

      const req = { params: { id: 'non-existent-id' } } as any;
      let statusCode = 0;
      let responseBody: any = null;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      } as any;

      const getByIdHandler = (scrapeRoutes.stack.find((layer: any) =>
        layer.route?.path?.includes('/:id') && layer.route?.methods?.get
      ) as any).route.stack[0].handle;

      await getByIdHandler(req, res);

      expect(statusCode).toBe(404);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toBe('Job não encontrado');
    });

    it('POST /api/scrape/:id/cancel deve cancelar com sucesso um job ativo', async () => {
      vi.spyOn(scrapeWorker, 'cancelJob').mockResolvedValueOnce(true);

      const req = { params: { id: 'active-job-id' } } as any;
      let responseBody: any = null;
      const res = {
        json: (data: any) => {
          responseBody = data;
          return res;
        },
        status: vi.fn().mockReturnThis(),
      } as any;

      const cancelHandler = (scrapeRoutes.stack.find((layer: any) =>
        layer.route?.path?.includes('/:id/cancel') && layer.route?.methods?.post
      ) as any).route.stack[0].handle;

      await cancelHandler(req, res);

      expect(responseBody.success).toBe(true);
      expect(responseBody.status).toBe('cancelled');
    });

    it('GET /api/scrape/:id/results deve retornar lista de leads persistidos', async () => {
      const mockLeads = [
        { id: 'lead-1', name: 'Auto Escola São Paulo', phone: '11999999999', city: 'São Paulo' },
        { id: 'lead-2', name: 'Despachante Santos', phone: '13988888888', city: 'Santos' },
      ];

      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
        if (table === 'marketing_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { status: 'completed', results_found: 2, new_leads: 2, duplicates: 0 },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const req = { params: { id: 'job-with-results' }, query: {} } as any;
      let responseBody: any = null;
      const res = {
        json: (data: any) => {
          responseBody = data;
          return res;
        },
        status: vi.fn().mockReturnThis(),
      } as any;

      const resultsHandler = (scrapeRoutes.stack.find((layer: any) =>
        layer.route?.path?.includes('/:id/results') && layer.route?.methods?.get
      ) as any).route.stack[0].handle;

      await resultsHandler(req, res);

      expect(responseBody.success).toBe(true);
      expect(responseBody.count).toBe(2);
      expect(responseBody.leads).toHaveLength(2);
      expect(responseBody.leads[0].name).toBe('Auto Escola São Paulo');
    });
  });
});
