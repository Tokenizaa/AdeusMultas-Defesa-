/**
 * @file ingestion-service.test.ts
 * Testes de persistência e recuperação do histórico de ingestão
 * (tabela knowledge_ingestions).
 *
 * Valida:
 * - Persistência com sucesso no Supabase (upsert)
 * - Falha de rede na persistência (observável, não silenciada)
 * - Idempotência: mesmo conteúdo não duplica versão
 * - Configuração ausente do Supabase (apenas memória)
 * - Histórico em memória
 * - Diferença entre ingestão concluída e falha de persistência
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IngestionService, IngestionPersistenceResult } from '../../server/knowledge/ingestion-service';
import { vectorStore } from '../../server/knowledge/vector-store';

// ---------------------------------------------------------------------------
// Mock do Supabase
// Variáveis declaradas no topo para evitar TDZ com vi.mock (hoisted).
// Valores iniciais dummy permitem que createClient (mockado) retorne algo
// mesmo antes de buildMocks() ser executado.
// ---------------------------------------------------------------------------

let mockUpsert: ReturnType<typeof vi.fn>;
let mockSelect: ReturnType<typeof vi.fn>;
let mockOrder: ReturnType<typeof vi.fn>;
let mockLimit: ReturnType<typeof vi.fn>;
let mockFrom: ReturnType<typeof vi.fn>;
let supabaseShouldFail = false;
let supabasePersistedData: any[] = [];
let mockSupabaseClient: any = { from: () => ({ upsert: vi.fn(), select: vi.fn() }) };

function buildMocks() {
  mockUpsert = vi.fn();
  mockSelect = vi.fn();
  mockOrder = vi.fn();
  mockLimit = vi.fn();

  mockSelect.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue({ data: supabasePersistedData, error: null });

  mockFrom = vi.fn((table: string) => {
    if (table === 'knowledge_ingestions') {
      return {
        upsert: vi.fn(async (row: any) => {
          if (supabaseShouldFail) {
            throw new Error('Falha de rede no Supabase');
          }
          supabasePersistedData.push(row);
          return { error: null };
        }),
        select: mockSelect,
      };
    }
    return { upsert: vi.fn() };
  });

  mockSupabaseClient = { from: mockFrom };
}

// Inicializa mocks antes de qualquer import que use createClient
buildMocks();

vi.mock('../../server/config/config-service', () => ({
  configService: {
    get: vi.fn((key: string) => {
      if (key === 'VITE_SUPABASE_URL') return 'https://test.supabase.co';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key';
      if (key === 'SUPABASE_SECRET_KEY') return undefined;
      return undefined;
    }),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

function resetMocks() {
  buildMocks(); // reconstrói mocks para evitar estado entre testes
  supabaseShouldFail = false;
  supabasePersistedData = [];
  vectorStore.clear();
}

describe('IngestionService — persistência de histórico (knowledge_ingestions)', () => {
  beforeEach(() => {
    resetMocks();
    (IngestionService as any).instance = undefined;
  });

  it('grava registro de ingestão em memória e no Supabase com sucesso', async () => {
    const service = IngestionService.getInstance();
    expect(service.isSupabaseConfigured()).toBe(true);

    const result = await service.ingestDocument({
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_TEST_001',
      title: 'Documento Teste',
      documentType: 'LEI',
      content: 'Conteúdo de teste para ingestão',
      jurisdiction: 'BR_FEDERAL',
    });

    expect(result.status).toBe('PROCESSED');
    expect(result.chunksCount).toBeGreaterThan(0);
    expect(mockFrom).toHaveBeenCalled();
    expect(result.persistenceResult.persistedToMemory).toBe(true);
    expect(result.persistenceResult.persistedToSupabase).toBe(true);
    expect(result.persistenceResult.supabaseError).toBeUndefined();
    expect(supabasePersistedData.length).toBeGreaterThan(0);
  });

  it('idempotência: mesmo conteúdo não duplica versão e grava SKIPPED', async () => {
    const service = IngestionService.getInstance();
    const content = 'Conteúdo idempotente para teste de repetição';

    const r1 = await service.ingestDocument({
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_IDEMPOTENT',
      title: 'Documento Idempotente',
      documentType: 'LEI',
      content,
      jurisdiction: 'BR_FEDERAL',
    });

    const r2 = await service.ingestDocument({
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_IDEMPOTENT',
      title: 'Documento Idempotente',
      documentType: 'LEI',
      content,
      jurisdiction: 'BR_FEDERAL',
    });

    expect(r1.status).toBe('PROCESSED');
    expect(r2.status).toBe('SKIPPED');
    expect(r2.versionId).toBe(r1.versionId);
    expect(r2.chunksCount).toBe(0);
    expect(r2.persistenceResult.persistedToSupabase).toBe(true);
  });

  it('falha de rede na persistência do Supabase é observável, não silenciada como sucesso', async () => {
    supabaseShouldFail = true;

    const service = IngestionService.getInstance();
    const result = await service.ingestDocument({
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_NETWORK_FAIL',
      title: 'Documento Falha de Rede',
      documentType: 'LEI',
      content: 'Conteúdo para teste de falha de rede',
      jurisdiction: 'BR_FEDERAL',
    });

    expect(result.status).toBe('PROCESSED');
    expect(result.persistenceResult.persistedToMemory).toBe(true);
    expect(result.persistenceResult.persistedToSupabase).toBe(false);
    expect(result.persistenceResult.supabaseError).toBe('Falha de rede no Supabase');
  });

  it('upsert com mesmo recordId é idempotente (mesmo correlationId)', async () => {
    const service = IngestionService.getInstance();

    const payloadBase = {
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_UPSERT_CONFLICT',
      title: 'Documento Upsert',
      documentType: 'LEI',
      content: 'Conteúdo para teste de upsert',
      jurisdiction: 'BR_FEDERAL',
    };

    const r1 = await service.ingestDocument(payloadBase, { correlationId: 'corr_same' });
    const r2 = await service.ingestDocument({ ...payloadBase, content: 'Conteúdo alterado para upsert' }, { correlationId: 'corr_same' });

    expect(r1.persistenceResult.recordId).toBe('ing_corr_same');
    expect(r2.persistenceResult.recordId).toBe('ing_corr_same');
    // Mesmo recordId → upsert idempotente
    expect(mockFrom).toHaveBeenCalled();
  });

  it('getHistory retorna registros em memória após ingestão', async () => {
    const service = IngestionService.getInstance();
    const initialSize = service.getHistory().length;

    await service.ingestDocument({
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_HISTORY',
      title: 'Documento History',
      documentType: 'LEI',
      content: 'Conteúdo para histórico',
      jurisdiction: 'BR_FEDERAL',
    });

    const history = service.getHistory();
    expect(history.length).toBe(initialSize + 1);
    expect(history[0].details.documentId).toBe('DOC_HISTORY');
    expect(history[0].status).toBe('COMPLETED');
  });

  it('getPersistedIngestions recupera dados persistidos no Supabase', async () => {
    // Configura o mock para retornar dados fixos
    mockLimit.mockResolvedValue({
      data: [{
        id: 'ing_persisted_1',
        started_at: '2026-10-23T10:00:00Z',
        completed_at: '2026-10-23T10:00:05Z',
        status: 'COMPLETED',
        total_files: 1,
        processed_documents: 1,
        skipped_documents: 0,
        created_chunks: 5,
        generated_embeddings: 5,
        failed_count: 0,
        duration_ms: 5000,
        provider_used: 'IngestionService',
        model_used: 'sha256-content-hash',
        triggered_by: 'INGEST_DOCUMENT',
        error_message: null,
        details: { documentId: 'DOC_PERSISTED', perDocument: true },
      }],
      error: null,
    });

    const service = IngestionService.getInstance();
    const ingestions = await service.getPersistedIngestions();

    expect(mockSelect).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalledWith('started_at', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(ingestions.length).toBe(1);
    expect(ingestions[0].id).toBe('ing_persisted_1');
    expect(ingestions[0].status).toBe('COMPLETED');
    expect(ingestions[0].details.documentId).toBe('DOC_PERSISTED');
  });

  it('distingue ingestão concluída de falha de persistência', async () => {
    // Ingestão normal (sucesso)
    const rOk = await serviceFromFreshInstance();
    expect(rOk.status).toBe('PROCESSED');
    expect(rOk.persistenceResult.persistedToSupabase).toBe(true);

    // Ingestão com falha de rede
    supabaseShouldFail = true;
    (IngestionService as any).instance = undefined;
    const serviceFail = IngestionService.getInstance();
    const rFail = await serviceFail.ingestDocument({
      sourceId: 'SRC_TEST',
      sourceName: 'Fonte Teste',
      authority: 'Autoridade Teste',
      sourceType: 'LAW',
      sourceUrl: 'https://exemplo.com/fonte',
      documentId: 'DOC_DISTINGUIR',
      title: 'Documento Distinguir',
      documentType: 'LEI',
      content: 'Conteúdo para distinguir',
      jurisdiction: 'BR_FEDERAL',
    });
    expect(rFail.status).toBe('PROCESSED');
    expect(rFail.persistenceResult.persistedToSupabase).toBe(false);
    expect(rFail.persistenceResult.supabaseError).toBe('Falha de rede no Supabase');
  });
});

function serviceFromFreshInstance() {
  (IngestionService as any).instance = undefined;
  return IngestionService.getInstance().ingestDocument({
    sourceId: 'SRC_TEST',
    sourceName: 'Fonte Teste',
    authority: 'Autoridade Teste',
    sourceType: 'LAW',
    sourceUrl: 'https://exemplo.com/fonte',
    documentId: 'DOC_DISTINGUIR_OK',
    title: 'Documento OK',
    documentType: 'LEI',
    content: 'Conteúdo OK',
    jurisdiction: 'BR_FEDERAL',
  }) as Promise<{ status: string; persistenceResult: IngestionPersistenceResult; chunksCount: number }>;
}
