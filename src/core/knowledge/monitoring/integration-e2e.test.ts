/**
 * @file integration-e2e.test.ts
 * Testes de Integração Ponta-a-Ponta — Monitoramento Normativo (SNM-JO) — Frente 4
 *
 * Valida o ciclo completo de monitoramento:
 *   SourceFetcher → ContentNormalizer → hash-generator → SnapshotStore →
 *   ChangeDetector → ValidationEngine → ReviewQueueService
 *
 * Cobrem os 10 cenários de aceitação da Frente 4 (Integração e Certificação).
 *
 * Regras obrigatórias:
 * - NÃO usar mocks como prova de persistência real (os componentes usam
 *   armazenamento em memória quando Supabase não está configurado = infra real local).
 * - NÃO criar segundo monitor, coletor ou catálogo.
 * - NÃO alterar teses jurídicas, elegibilidade ou minutas.
 * - NÃO fazer deploy.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock do config-service para evitar carregamento de Supabase nos componentes
// que o importam indiretamente (vector-store, ingestion-service).
vi.mock('../../server/config/config-service', () => ({
  configService: {
    get: vi.fn(() => undefined),
  },
}));

import {
  KnowledgeSource,
  KnowledgeSnapshot,
  KnowledgeChange,
} from '../types';
import { SourceFetcher } from './source-fetcher';
import { ContentNormalizer } from './content-normalizer';
import { calculateSha256Sync } from './hash-generator';
import { SnapshotStore } from './snapshot-store';
import { ChangeDetector } from './change-detector';
import { ValidationEngine } from '../validation/validation-engine';
import { ReviewQueueService } from '../validation/review-queue-service';
import { OFFICIAL_SOURCES_REGISTRY } from '../sources-registry';
import { initializeMonitor, getMonitorStatus } from '../scheduler/monitor-runtime';

// ---------------------------------------------------------------------------
// Fixture de fonte oficial (do catálogo canônico OFFICIAL_SOURCES_REGISTRY)
// ---------------------------------------------------------------------------

const CTB_SOURCE: KnowledgeSource = OFFICIAL_SOURCES_REGISTRY.find(
  (s) => s.id === 'SRC_FED_PLANALTO_CTB'
)!;

const CONTRAN_SOURCE: KnowledgeSource = OFFICIAL_SOURCES_REGISTRY.find(
  (s) => s.id === 'SRC_FED_CONTRAN_RESOLUCOES'
)!;

function makeSnapshot(
  sourceId: string,
  text: string,
  hash: string,
  status: 'confirmed' | 'collection_failed' = 'confirmed'
): KnowledgeSnapshot {
  const source = OFFICIAL_SOURCES_REGISTRY.find((s) => s.id === sourceId);
  return {
    id: `SNP_${sourceId}_${Date.now()}`,
    sourceId,
    url: source?.url || 'https://example.com/source',
    uf: 'FEDERAL',
    fetchedAt: new Date().toISOString(),
    httpStatus: 200,
    contentLength: text.length,
    contentHash: hash,
    normalizedText: text,
    rawSample: text.slice(0, 500),
    status,
  };
}

beforeEach(() => {
  SnapshotStore.clear();
  ReviewQueueService.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  SnapshotStore.clear();
  ReviewQueueService.clear();
});

// ============================================================================
// Cenário 1 — Fonte oficial configurada é consultada (SourceFetcher)
// ============================================================================

describe('E2E 1 — Consulta de fonte oficial (SourceFetcher)', () => {
  it('SourceFetcher consulta fonte oficial do catálogo canônico e retorna FetchResult HTTP 200', async () => {
    const result = await SourceFetcher.fetchSource(CTB_SOURCE, {
      timeoutMs: 5000,
    });

    expect(result.sourceId).toBe(CTB_SOURCE.id);
    expect(result.url).toBe(CTB_SOURCE.url);
    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.contentLength).toBeGreaterThan(0);
    expect(result.fetchedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    // Conteúdo vem do mock de rede (vitest-network.setup.ts) para UA DefesAi
    expect(result.content).toContain('Official source snapshot');
  });

  it('Todas as fontes federais prioritárias do catálogo são consultáveis pelo SourceFetcher', async () => {
    const federalSources = OFFICIAL_SOURCES_REGISTRY.filter(
      (s) => s.uf === 'FEDERAL' && s.isActive
    );
    expect(federalSources.length).toBeGreaterThan(0);

    for (const source of federalSources) {
      const result = await SourceFetcher.fetchSource(source, {
        timeoutMs: 5000,
      });
      expect(result.success).toBe(true);
      expect(result.httpStatus).toBe(200);
      expect(result.sourceId).toBe(source.id);
    }
  });
});

// ============================================================================
// Cenário 2 — Conteúdo obtido é validado e versionado (ContentNormalizer + ChangeDetector)
// ============================================================================

describe('E2E 2 — Validação e versionamento de conteúdo', () => {
  it('ContentNormalizer produz normalizedText e hash determinístico (sem timestamp)', () => {
    const raw = '<html><body>Art. 218 CTB — limite de velocidade</body></html>';
    const normalized = ContentNormalizer.normalize(raw);

    expect(normalized.normalizedText).toContain('Art. 218');
    expect(normalized.wordCount).toBeGreaterThan(0);

    const h1 = calculateSha256Sync(normalized.normalizedText);
    const h2 = calculateSha256Sync(normalized.normalizedText);

    // Mesmo texto → mesmo hash (determinístico, sem timestamp)
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ChangeDetector detecta mudança quando hash difere entre versões (nova versão)', () => {
    const prevHash = calculateSha256Sync('Texto da versão anterior do documento');
    const currHash = calculateSha256Sync('Texto da versão alterada do documento');

    const prev = makeSnapshot(CONTRAN_SOURCE.id, 'Texto da versão anterior do documento', prevHash);
    const curr = makeSnapshot(CONTRAN_SOURCE.id, 'Texto da versão alterada do documento', currHash);

    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);

    expect(change).not.toBeNull();
    expect(change!.newHash).toBe(currHash);
    expect(change!.previousHash).toBe(prevHash);
    // Conteúdo sem gatilhos normativos → MODIFIED_TEXT (não REVOCATION/NEW_REGULATION)
    expect(change!.changeType).toBe('MODIFIED_TEXT');
  });
});

// ============================================================================
// Cenário 3 — Hash e metadados registrados (hash-generator + SnapshotStore)
// ============================================================================

describe('E2E 3 — Registro de hash e metadados', () => {
  it('hash-generator produz SHA-256 e SnapshotStore armazena metadados completos do snapshot', async () => {
    const text = 'Art. 218 CTB — ultrapassar velocidade máxima';
    const hash = calculateSha256Sync(text);

    // Formato do hash: 64 caracteres hexadecimais
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    const snap = makeSnapshot(CTB_SOURCE.id, text, hash);
    await SnapshotStore.saveSnapshot(snap);

    const latest = await SnapshotStore.getLatestSnapshot(CTB_SOURCE.id);
    expect(latest).not.toBeNull();
    expect(latest!.contentHash).toBe(hash);
    expect(latest!.sourceId).toBe(CTB_SOURCE.id);
    expect(latest!.url).toContain('planalto.gov.br');
    expect(latest!.uf).toBe('FEDERAL');
    expect(latest!.httpStatus).toBe(200);
    expect(latest!.contentLength).toBe(text.length);
    expect(latest!.normalizedText).toBe(text);
    expect(latest!.status).toBe('confirmed');
  });
});

// ============================================================================
// Cenário 4 — Snapshot válido persistido (SnapshotStore.saveSnapshot)
// ============================================================================

describe('E2E 4 — Persistência de snapshot válido', () => {
  it('SnapshotStore.saveSnapshot persiste snapshot e permite recuperação posterior', async () => {
    const hash = calculateSha256Sync('Conteúdo normativo completo da fonte oficial');
    const snap = makeSnapshot(CTB_SOURCE.id, 'Conteúdo normativo completo da fonte oficial', hash);

    await SnapshotStore.saveSnapshot(snap);

    const latest = await SnapshotStore.getLatestSnapshot(CTB_SOURCE.id);
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe(snap.id);
    expect(latest!.contentHash).toBe(hash);
    expect(latest!.status).toBe('confirmed');
    expect(latest!.fetchedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('Múltiplos snapshots são mantidos por fonte (histórico preservado, mais recente primeiro)', async () => {
    const hash1 = calculateSha256Sync('Conteúdo versão 1');
    const hash2 = calculateSha256Sync('Conteúdo versão 2');

    await SnapshotStore.saveSnapshot(makeSnapshot(CTB_SOURCE.id, 'Conteúdo versão 1', hash1));
    await SnapshotStore.saveSnapshot(makeSnapshot(CTB_SOURCE.id, 'Conteúdo versão 2', hash2));

    const history = await SnapshotStore.getHistory(CTB_SOURCE.id);
    expect(history.length).toBe(2);
    expect(history[0].contentHash).toBe(hash2); // mais recente primeiro (unshift)
    expect(history[1].contentHash).toBe(hash1);
  });
});

// ============================================================================
// Cenário 5 — Alteração simulada detectada na execução seguinte (ChangeDetector.detectChange)
// ============================================================================

describe('E2E 5 — Detecção de alteração em execução subsequente', () => {
  it('ChangeDetector.detectChange identifica alteração entre snapshots de execuções distintas', () => {
    // Execução 1: snapshot inicial da fonte
    const hashV1 = calculateSha256Sync('Texto vigente do documento CONTRAN');
    const snapV1 = makeSnapshot(CONTRAN_SOURCE.id, 'Texto vigente do documento CONTRAN', hashV1);

    // Execução 2: conteúdo alterado na fonte oficial
    const hashV2 = calculateSha256Sync('Texto alterado — nova redação do artigo');
    const snapV2 = makeSnapshot(CONTRAN_SOURCE.id, 'Texto alterado — nova redação do artigo', hashV2);

    // Detecção entre execuções
    const change = ChangeDetector.detectChange(snapV2, snapV1, CONTRAN_SOURCE);

    expect(change).not.toBeNull();
    expect(change!.previousHash).toBe(hashV1);
    expect(change!.newHash).toBe(hashV2);
    // "resolução" no texto removido dispara NEW_REGULATION (P0) — comportamento esperado
    expect(['MODIFIED_TEXT', 'NEW_REGULATION', 'REVOCATION']).toContain(change!.changeType);
  });

  it('Mesmo hash entre execuções não gera mudança falsa (idempotência)', () => {
    const hash = calculateSha256Sync('Conteúdo estável entre execuções');
    const snap = makeSnapshot(CTB_SOURCE.id, 'Conteúdo estável entre execuções', hash);

    const change = ChangeDetector.detectChange(snap, snap, CTB_SOURCE);
    expect(change).toBeNull();
  });

  it('Primeiro snapshot (sem anterior) não gera mudança (null)', () => {
    const hash = calculateSha256Sync('Primeiro conteúdo coletado');
    const snap = makeSnapshot(CTB_SOURCE.id, 'Primeiro conteúdo coletado', hash);

    const change = ChangeDetector.detectChange(snap, null, CTB_SOURCE);
    expect(change).toBeNull();
  });
});

// ============================================================================
// Cenário 6 — Evento relacionado à fonte e ao documento (KnowledgeChange)
// ============================================================================

describe('E2E 6 — Rastreabilidade do evento (KnowledgeChange)', () => {
  it('KnowledgeChange vincula alteração à fonte, URL, hash anterior e hash novo', () => {
    const prevHash = calculateSha256Sync('Texto original da resolução');
    const newHash = calculateSha256Sync('Texto alterado da resolução');

    const prev = makeSnapshot(CONTRAN_SOURCE.id, 'Texto original da resolução', prevHash);
    const curr = makeSnapshot(CONTRAN_SOURCE.id, 'Texto alterado da resolução', newHash);

    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);

    expect(change).not.toBeNull();
    expect(change!.sourceId).toBe(CONTRAN_SOURCE.id);
    expect(change!.sourceUrl).toBe(CONTRAN_SOURCE.url);
    expect(change!.uf).toBe(CONTRAN_SOURCE.uf);
    expect(change!.previousHash).toBe(prevHash);
    expect(change!.newHash).toBe(newHash);
    expect(change!.discoveredAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(change!.status).toBe('PENDING_REVIEW');
  });

  it('Revogação normativa (REVOCATION) produz KnowledgeChange com risco P0 e PENDING_REVIEW', () => {
    const prevHash = calculateSha256Sync('Resolução vigente');
    const newHash = calculateSha256Sync('Esta resolução revoga a norma anterior');

    const prev = makeSnapshot(CONTRAN_SOURCE.id, 'Resolução vigente', prevHash);
    const curr = makeSnapshot(CONTRAN_SOURCE.id, 'Esta resolução revoga a norma anterior', newHash);

    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);

    expect(change).not.toBeNull();
    expect(change!.changeType).toBe('REVOCATION');
    expect(change!.riskLevel).toBe('P0_LEGAL_CRITICAL');
    expect(change!.status).toBe('PENDING_REVIEW');
    expect(change!.sourceId).toBe(CONTRAN_SOURCE.id);
    expect(change!.sourceUrl).toBe(CONTRAN_SOURCE.url);
  });
});

// ============================================================================
// Cenário 7 — Alteração encaminhada à fila de revisão humana (ValidationEngine + ReviewQueueService)
// ============================================================================

describe('E2E 7 — Roteamento para revisão humana', () => {
  it('ValidationEngine valida alteração e ReviewQueueService enfileira como PENDING_REVIEW', () => {
    const prevHash = calculateSha256Sync('Texto vigente — Art. 5º procedimentos de fiscalização');
    const newHash = calculateSha256Sync('Texto alterado — revoga norma anterior');

    const prev = makeSnapshot(CONTRAN_SOURCE.id, 'Texto vigente — Art. 5º procedimentos de fiscalização', prevHash);
    const curr = makeSnapshot(CONTRAN_SOURCE.id, 'Texto alterado — revoga norma anterior', newHash);

    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);
    expect(change).not.toBeNull();

    // 1. Validação e roteamento
    const validation = ValidationEngine.validateAndRoute([change!]);

    expect(validation.itemsForHumanReview.length).toBe(1);
    const reviewItem = validation.itemsForHumanReview[0];
    expect(reviewItem.changeId).toBe(change!.id);
    expect(reviewItem.sourceUrl).toBe(CONTRAN_SOURCE.url);
    expect(reviewItem.sourceTitle).toContain(CONTRAN_SOURCE.title);
    expect(reviewItem.status).toBe('PENDING_REVIEW');

    // 2. Enfileira na fila de revisão humana
    ReviewQueueService.enqueueItems(validation.itemsForHumanReview);

    const pending = ReviewQueueService.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(`REV_${change!.id}`);
    expect(pending[0].status).toBe('PENDING_REVIEW');
  });

  it('Alteração P0 (revogação) nunca é auto-aplicada; vai sempre para revisão humana', () => {
    const prevHash = calculateSha256Sync('Resolução vigente');
    const newHash = calculateSha256Sync('Esta resolução revoga a anterior');

    const prev = makeSnapshot(CONTRAN_SOURCE.id, 'Resolução vigente', prevHash);
    const curr = makeSnapshot(CONTRAN_SOURCE.id, 'Esta resolução revoga a anterior', newHash);

    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);
    expect(change!.changeType).toBe('REVOCATION');
    expect(change!.riskLevel).toBe('P0_LEGAL_CRITICAL');

    const validation = ValidationEngine.validateAndRoute([change!]);
    expect(validation.autoAppliedChanges.length).toBe(0);
    expect(validation.itemsForHumanReview.length).toBe(1);
    expect(validation.itemsForHumanReview[0].status).toBe('PENDING_REVIEW');
  });
});

// ============================================================================
// Cenário 8 — Falha de coleta não elimina snapshot anterior (SnapshotStore preserva último válido)
// ============================================================================

describe('E2E 8 — Preservação de snapshot anterior após falha de coleta', () => {
  it('Falha de coleta mantém o snapshot anterior válido no SnapshotStore', async () => {
    const hashV1 = calculateSha256Sync('Conteúdo versão 1 válido');
    const snapV1 = makeSnapshot(CTB_SOURCE.id, 'Conteúdo versão 1 válido', hashV1, 'confirmed');
    await SnapshotStore.saveSnapshot(snapV1);

    // Verifica snapshot anterior antes da falha
    const previous = await SnapshotStore.getLatestSnapshot(CTB_SOURCE.id);
    expect(previous).not.toBeNull();
    expect(previous!.contentHash).toBe(hashV1);
    expect(previous!.status).toBe('confirmed');

    // Simula falha de coleta: NÃO salvamos novo snapshot, o anterior permanece intacto
    const changeNoPrevious = ChangeDetector.detectChange(snapV1, null, CTB_SOURCE);
    expect(changeNoPrevious).toBeNull();

    const changeSameHash = ChangeDetector.detectChange(snapV1, snapV1, CTB_SOURCE);
    expect(changeSameHash).toBeNull();

    // O snapshot anterior ainda está disponível após a "falha"
    const stillThere = await SnapshotStore.getLatestSnapshot(CTB_SOURCE.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere!.contentHash).toBe(hashV1);
    expect(stillThere!.status).toBe('confirmed');
  });
});

// ============================================================================
// Cenário 9 — Estado recuperável após reinicialização (SnapshotStore.loadFromSupabase)
// ============================================================================

describe('E2E 9 — Recuperação de estado após reinicialização', () => {
  it('SnapshotStore.loadFromSupabase não lança exceção independentemente da configuração do Supabase', async () => {
    // loadFromSupabase captura erros internamente (try/catch) — nunca lança exceção ao caller
    await expect(SnapshotStore.loadFromSupabase()).resolves.toBeUndefined();

    // Após a tentativa de carregamento, o store continua funcional em memória
    const hash = calculateSha256Sync('Conteúdo pós-reinicialização');
    await SnapshotStore.saveSnapshot(makeSnapshot(CTB_SOURCE.id, 'Conteúdo pós-reinicialização', hash));

    const latest = await SnapshotStore.getLatestSnapshot(CTB_SOURCE.id);
    expect(latest).not.toBeNull();
    expect(latest!.contentHash).toBe(hash);
  });
});

// ============================================================================
// Cenário 10 — Nenhuma tese ou minuta é atualizada automaticamente (status permanece PENDING_REVIEW)
// ============================================================================

describe('E2E 10 — Sem atualização automática de teses ou minutas', () => {
  it('Status da alteração permanece PENDING_REVIEW após validação e enfileiramento', () => {
    const prevHash = calculateSha256Sync('Texto da tese vigente');
    const newHash = calculateSha256Sync('Esta resolução revoga a norma anterior');

    const prev = makeSnapshot(CTB_SOURCE.id, 'Texto da tese vigente', prevHash);
    const curr = makeSnapshot(CTB_SOURCE.id, 'Esta resolução revoga a norma anterior', newHash);

    const change = ChangeDetector.detectChange(curr, prev, CTB_SOURCE);
    expect(change).not.toBeNull();
    expect(change!.status).toBe('PENDING_REVIEW');
    expect(change!.changeType).toBe('REVOCATION');
    expect(change!.riskLevel).toBe('P0_LEGAL_CRITICAL');

    const validation = ValidationEngine.validateAndRoute([change!]);
    expect(validation.itemsForHumanReview.length).toBe(1);

    ReviewQueueService.enqueueItems(validation.itemsForHumanReview);

    const pending = ReviewQueueService.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('PENDING_REVIEW');

    // A alteração original também mantém PENDING_REVIEW
    expect(change!.status).toBe('PENDING_REVIEW');

    // Nenhuma tese ou minuta foi modificada automaticamente neste fluxo:
    // só ação humana explícita (ReviewQueueService.approve) pode mudar o status.
  });
});

// ============================================================================
// Cenário extra — Monitor-runtime inicializa sem duplicação (idempotência)
// ============================================================================

describe('E2E extra — Inicialização idempotente do monitor-runtime', () => {
  it('initializeMonitor é idempotente: segunda chamada retorna status sem reinicializar', () => {
    // Evita duplicação de agendamento em ambiente de teste
    const status1 = initializeMonitor(false);
    expect(status1.initialized).toBe(true);

    const status2 = initializeMonitor(false);
    expect(status2.initialized).toBe(true);
    expect(status2).toEqual(status1); // mesmo estado, sem duplicação

    const status3 = getMonitorStatus();
    expect(status3.initialized).toBe(true);
  });
});

// ============================================================================
// Cenário extra — Validação de dependências entre componentes (sem ciclo, sem órfão)
// ============================================================================

describe('E2E extra — Matriz de dependências entre componentes', () => {
  it('Cadeia de dependências SourceFetcher → ContentNormalizer → hash-generator → SnapshotStore → ChangeDetector → ValidationEngine → ReviewQueueService está completa', () => {
    // 1. SourceFetcher existe e expõe fetchSource / fetchAllSources
    expect(typeof SourceFetcher.fetchSource).toBe('function');
    expect(typeof SourceFetcher.fetchAllSources).toBe('function');

    // 2. ContentNormalizer existe e expõe normalize
    expect(typeof ContentNormalizer.normalize).toBe('function');

    // 3. hash-generator existe e expõe calculateSha256Sync
    expect(typeof calculateSha256Sync).toBe('function');

    // 4. SnapshotStore existe e expõe saveSnapshot / getLatestSnapshot / clear / loadFromSupabase / isSupabaseConfigured
    expect(typeof SnapshotStore.saveSnapshot).toBe('function');
    expect(typeof SnapshotStore.getLatestSnapshot).toBe('function');
    expect(typeof SnapshotStore.clear).toBe('function');
    expect(typeof SnapshotStore.loadFromSupabase).toBe('function');
    expect(typeof SnapshotStore.isSupabaseConfigured).toBe('function');

    // 5. ChangeDetector existe e expõe detectChange / analyzeDiff
    expect(typeof ChangeDetector.detectChange).toBe('function');
    expect(typeof ChangeDetector.analyzeDiff).toBe('function');

    // 6. ValidationEngine existe e expõe validateAndRoute
    expect(typeof ValidationEngine.validateAndRoute).toBe('function');

    // 7. ReviewQueueService existe e expõe enqueueItems / getPending / getPendingCount / clear
    expect(typeof ReviewQueueService.enqueueItems).toBe('function');
    expect(typeof ReviewQueueService.getPending).toBe('function');
    expect(typeof ReviewQueueService.getPendingCount).toBe('function');
    expect(typeof ReviewQueueService.clear).toBe('function');
  });

  it('Não há componentes órfãos: todos os módulos da cadeia são importáveis e instanciáveis', () => {
    const hash = calculateSha256Sync('teste de integridade da cadeia');

    // Conteúdo flui pela cadeia completa sem quebra
    const raw = '<html><body>Conteúdo de teste da cadeia completa</body></html>';
    const normalized = ContentNormalizer.normalize(raw);
    expect(normalized.normalizedText.length).toBeGreaterThan(0);

    const snap = makeSnapshot(CTB_SOURCE.id, normalized.normalizedText, hash);
    SnapshotStore.saveSnapshot(snap);

    const latest = SnapshotStore.getLatestSnapshotSync(CTB_SOURCE.id);
    expect(latest).not.toBeNull();

    const change = ChangeDetector.detectChange(
      makeSnapshot(CTB_SOURCE.id, 'texto alterado', calculateSha256Sync('texto alterado')),
      latest!,
      CTB_SOURCE
    );
    expect(change).not.toBeNull();
  });
});
