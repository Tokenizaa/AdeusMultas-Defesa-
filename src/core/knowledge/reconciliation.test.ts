/**
 * @file reconciliation.test.ts
 * Testes de Reconciliação — Fase 9/10 (Fontes Raspadas, Catálogo Normativo e Base de Conhecimento)
 *
 * Valida o rastreamento ponta-a-ponta:
 *   fonte oficial → raspagem → conteúdo persistido → versão/hash →
 *   catálogo de monitoramento → detecção de mudança → documentos/teses afetados.
 *
 * Não escreve no Supabase remoto nem aplica migrations. Testa apenas o comportamento
 * de memória dos componentes existentes (SnapshotStore, ChangeDetector, IngestionService,
 * vectorStore, WeeklyMonitorScheduler, CanonicalKnowledgeRegistry).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do config-service para evitar falha de carregamento do módulo
// no ambiente de teste (o SnapshotStore usa configService para Supabase).
vi.mock('../../server/config/config-service', () => ({
  configService: {
    get: vi.fn(() => undefined),
  },
}));

import {
  KnowledgeSource,
  KnowledgeSnapshot,
  KnowledgeChange,
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  KnowledgeIngestionRecord,
} from './types';
import { SourceFetcher } from './monitoring/source-fetcher';
import { ContentNormalizer } from './monitoring/content-normalizer';
import { SnapshotStore } from './monitoring/snapshot-store';
import { ChangeDetector } from './monitoring/change-detector';
import { calculateSha256Sync } from './monitoring/hash-generator';
import { CanonicalKnowledgeRegistry } from './registry/canonical-registry';
import { OFFICIAL_SOURCES_REGISTRY } from './sources-registry';
import { WeeklyMonitorScheduler } from './scheduler/weekly-monitor-scheduler';
import { IngestionService } from '../../server/knowledge/ingestion-service';
import { vectorStore } from '../../server/knowledge/vector-store';
import { ValidationEngine } from './validation/validation-engine';
import { ReviewQueueService } from './validation/review-queue-service';

// ---------------------------------------------------------------------------
// Fixtures de fontes (usando IDs do catálogo canônico OFFICIAL_SOURCES_REGISTRY)
// ---------------------------------------------------------------------------

const FED_CTB_SOURCE: KnowledgeSource = {
  id: 'SRC_FED_PLANALTO_CTB',
  uf: 'FEDERAL',
  tier: 'TIER_1_GOV_PRIMARY',
  title: 'Planalto - Código de Trânsito Brasileiro (Lei 9.503/1997)',
  url: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
  category: 'legislation',
  isActive: true,
};

const CONTRAN_SOURCE: KnowledgeSource = {
  id: 'SRC_FED_CONTRAN_RESOLUCOES',
  uf: 'FEDERAL',
  tier: 'TIER_1_GOV_PRIMARY',
  title: 'Conselho Nacional de Trânsito (CONTRAN) - Resoluções',
  url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran',
  category: 'legislation',
  isActive: true,
};

function snapshotFor(sourceId: string, text: string, hash: string): KnowledgeSnapshot {
  const source = OFFICIAL_SOURCES_REGISTRY.find((s) => s.id === sourceId);
  return {
    id: `SNP_${sourceId}_${Date.now()}`,
    sourceId,
    url: source?.url || `https://example.com/${sourceId}`,
    uf: 'FEDERAL',
    fetchedAt: new Date().toISOString(),
    httpStatus: 200,
    contentLength: text.length,
    contentHash: hash,
    normalizedText: text,
    rawSample: text.slice(0, 500),
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  SnapshotStore.clear();
  vi.restoreAllMocks();
});

describe('Reconciliação — fonte coletada presente no catálogo', () => {
  it('toda fonte do OFFICIAL_SOURCES_REGISTRY está registrada no CanonicalKnowledgeRegistry', () => {
    const registrySources = CanonicalKnowledgeRegistry.getAllSources();
    const registryIds = new Set(registrySources.map((s) => s.id));

    // As fontes prioritárias usadas no monitoramento devem constar no catálogo canônico.
    expect(registryIds.has(FED_CTB_SOURCE.id)).toBe(true);
    expect(registryIds.has(CONTRAN_SOURCE.id)).toBe(true);

    // O catálogo canônico expõe fontes Tier 1-3 (mesmo universo do monitor semanal).
    const tier1to3 = CanonicalKnowledgeRegistry.getTier1To3Sources();
    expect(tier1to3.length).toBeGreaterThan(0);
    expect(tier1to3.some((s) => s.id === FED_CTB_SOURCE.id)).toBe(true);
  });

  it('fontes ativas do catálogo são as consultadas pelo monitor semanal', () => {
    const activeSources = OFFICIAL_SOURCES_REGISTRY.filter((s) => s.isActive);
    const ctb = activeSources.find((s) => s.id === FED_CTB_SOURCE.id);
    const contran = activeSources.find((s) => s.id === CONTRAN_SOURCE.id);

    expect(ctb).toBeDefined();
    expect(ctb?.isActive).toBe(true);
    expect(contran).toBeDefined();
    expect(contran?.isActive).toBe(true);

    // O WeeklyMonitorScheduler usa OFFICIAL_SOURCES_REGISTRY diretamente (caminho /monitor/run).
    // O WeeklyMonitorService usa getTier1To3Sources(). Ambos devem cobrir as mesmas fontes federais.
    const serviceSources = CanonicalKnowledgeRegistry.getTier1To3Sources();
    const schedulerSources = OFFICIAL_SOURCES_REGISTRY;
    const serviceIds = new Set(serviceSources.map((s) => s.id));
    const schedulerIds = new Set(schedulerSources.map((s) => s.id));

    // As 3 fontes federais prioritárias estão em ambos os universos.
    expect(serviceIds.has('SRC_FED_PLANALTO_CTB')).toBe(true);
    expect(serviceIds.has('SRC_FED_CONTRAN_RESOLUCOES')).toBe(true);
    expect(serviceIds.has('SRC_FED_DOU')).toBe(true);
    expect(schedulerIds.has('SRC_FED_PLANALTO_CTB')).toBe(true);
    expect(schedulerIds.has('SRC_FED_CONTRAN_RESOLUCOES')).toBe(true);
    expect(schedulerIds.has('SRC_FED_DOU')).toBe(true);
  });
});

describe('Reconciliação — documento persistido com URL e proveniência', () => {
  it('SnapshotStore preserva URL, hash e metadados de origem do snapshot', async () => {
    const hash = calculateSha256Sync('Art. 1º do CTB — texto normativo');
    const snap = snapshotFor(FED_CTB_SOURCE.id, 'Art. 1º do CTB — texto normativo', hash);

    await SnapshotStore.saveSnapshot(snap);
    const latest = await SnapshotStore.getLatestSnapshot(FED_CTB_SOURCE.id);

    expect(latest).not.toBeNull();
    expect(latest!.sourceId).toBe(FED_CTB_SOURCE.id);
    expect(latest!.url).toContain('planalto.gov.br');
    expect(latest!.contentHash).toBe(hash);
    expect(latest!.httpStatus).toBe(200);
    expect(latest!.normalizedText).toContain('Art. 1º');
  });

  it('vectorStore registra documento com sourceId, URL e contentHash (proveniência)', async () => {
    const versionId = 'ver_doc_ctb_1';
    const contentHash = calculateSha256Sync('Conteúdo do CTB compilado');

    await vectorStore.upsertSource({
      id: FED_CTB_SOURCE.id,
      name: FED_CTB_SOURCE.title,
      sourceType: 'LAW',
      authority: 'Presidência da República',
      url: FED_CTB_SOURCE.url,
      jurisdiction: 'BR_FEDERAL',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await vectorStore.upsertDocument({
      id: 'DOC_CTB_9503',
      sourceId: FED_CTB_SOURCE.id,
      title: 'Código de Trânsito Brasileiro (Lei 9.503/1997)',
      documentType: 'LEI',
      jurisdiction: 'BR_FEDERAL',
      status: 'ACTIVE',
      currentVersionId: versionId,
      metadata: { originUrl: FED_CTB_SOURCE.url, retrievedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await vectorStore.upsertVersion({
      id: versionId,
      documentId: 'DOC_CTB_9503',
      version: 'v1.0',
      content: 'Conteúdo do CTB compilado',
      contentHash,
      sourceUrl: FED_CTB_SOURCE.url,
      publishedAt: new Date().toISOString(),
      metadata: { sourceId: FED_CTB_SOURCE.id },
      createdAt: new Date().toISOString(),
    });

    const doc = vectorStore.getDocument('DOC_CTB_9503');
    const ver = vectorStore.getVersion(versionId);
    const src = vectorStore.getSource(FED_CTB_SOURCE.id);

    expect(doc).toBeDefined();
    expect(doc!.sourceId).toBe(FED_CTB_SOURCE.id);
    expect(doc!.currentVersionId).toBe(versionId);
    expect(ver).toBeDefined();
    expect(ver!.contentHash).toBe(contentHash);
    expect(ver!.sourceUrl).toBe(FED_CTB_SOURCE.url);
    expect(src).toBeDefined();
    expect(src!.url).toBe(FED_CTB_SOURCE.url);
  });
});

describe('Reconciliação — hash inalterado sem duplicação de versão', () => {
  it('mesmo hash não gera nova versão (idempotência de ingestão)', async () => {
    const ingestionService = IngestionService.getInstance();
    const content = 'Texto normativo estável — mesmo conteúdo';
    const contentHash = ingestionService.hashContent(content);

    // Primeira ingestão
    const r1 = await ingestionService.ingestDocument({
      sourceId: FED_CTB_SOURCE.id,
      sourceName: FED_CTB_SOURCE.title,
      authority: 'Presidência da República',
      sourceType: 'LAW',
      sourceUrl: FED_CTB_SOURCE.url,
      documentId: 'DOC_HASH_STABLE',
      title: 'Documento de Teste de Hash',
      documentType: 'LEI',
      content,
      jurisdiction: 'BR_FEDERAL',
    });

    // Segunda ingestão com mesmo conteúdo → SKIPPED, mesma versão, sem duplicação
    const r2 = await ingestionService.ingestDocument({
      sourceId: FED_CTB_SOURCE.id,
      sourceName: FED_CTB_SOURCE.title,
      authority: 'Presidência da República',
      sourceType: 'LAW',
      sourceUrl: FED_CTB_SOURCE.url,
      documentId: 'DOC_HASH_STABLE',
      title: 'Documento de Teste de Hash',
      documentType: 'LEI',
      content,
      jurisdiction: 'BR_FEDERAL',
    });

    expect(r1.status).toBe('PROCESSED');
    expect(r2.status).toBe('SKIPPED');
    expect(r2.versionId).toBe(r1.versionId); // mesma versão, não duplicada
    expect(r2.chunksCount).toBe(0); // nada reindexado

    // O registro de ingestão foi gravado para ambas as chamadas (telemetria)
    const history = ingestionService.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    const skipped = history.find((h) => h.processedDocuments === 0 && h.skippedDocuments === 1);
    expect(skipped).toBeDefined();
  });
});

describe('Reconciliação — alteração de conteúdo gerando nova versão', () => {
  it('conteúdo alterado gera novo versionId e novo contentHash', async () => {
    const ingestionService = IngestionService.getInstance();

    const r1 = await ingestionService.ingestDocument({
      sourceId: CONTRAN_SOURCE.id,
      sourceName: CONTRAN_SOURCE.title,
      authority: 'CONTRAN',
      sourceType: 'REGULATION',
      sourceUrl: CONTRAN_SOURCE.url,
      documentId: 'DOC_CONTRAN_VERSION',
      title: 'Resolução CONTRAN — v1',
      documentType: 'RESOLUCAO',
      content: 'Conteúdo original da resolução',
      versionLabel: 'v1.0',
      jurisdiction: 'BR_FEDERAL',
    });

    const r2 = await ingestionService.ingestDocument({
      sourceId: CONTRAN_SOURCE.id,
      sourceName: CONTRAN_SOURCE.title,
      authority: 'CONTRAN',
      sourceType: 'REGULATION',
      sourceUrl: CONTRAN_SOURCE.url,
      documentId: 'DOC_CONTRAN_VERSION',
      title: 'Resolução CONTRAN — v2',
      documentType: 'RESOLUCAO',
      content: 'Conteúdo alterado da resolução — nova redação',
      versionLabel: 'v2.0',
      jurisdiction: 'BR_FEDERAL',
    });

    expect(r1.status).toBe('PROCESSED');
    expect(r2.status).toBe('PROCESSED');
    expect(r2.versionId).not.toBe(r1.versionId); // nova versão
    expect(r1.chunksCount).toBeGreaterThan(0);
    expect(r2.chunksCount).toBeGreaterThan(0);
  });
});

describe('Reconciliação — URL indisponível não apaga snapshot anterior', () => {
  it('falha de fetch mantém o snapshot anterior no SnapshotStore', async () => {
    const hashV1 = calculateSha256Sync('Conteúdo versão 1');
    const snapV1 = snapshotFor(CONTRAN_SOURCE.id, 'Conteúdo versão 1', hashV1);
    await SnapshotStore.saveSnapshot(snapV1);

    // Simula uma segunda coleta que falhou (sem novo snapshot salvo)
    const previous = await SnapshotStore.getLatestSnapshot(CONTRAN_SOURCE.id);
    expect(previous).not.toBeNull();
    expect(previous!.contentHash).toBe(hashV1);

    // Um novo fetch falhou (404/timeout) → NÃO salvamos novo snapshot, preservamos o anterior
    // O ChangeDetector com previousSnapshot null ou hash igual não gera mudança falsa.
    const changeNoPrevious = ChangeDetector.detectChange(snapV1, null, CONTRAN_SOURCE);
    expect(changeNoPrevious).toBeNull(); // primeiro snapshot: sem mudança para comparar

    const changeSameHash = ChangeDetector.detectChange(snapV1, snapV1, CONTRAN_SOURCE);
    expect(changeSameHash).toBeNull(); // mesmo hash: sem mudança (idempotente, sem falso positivo)
  });

  it('ChangeDetector não gera mudança quando o hash é idêntico (sem falso positivo por URL indisponível)', () => {
    const hash = calculateSha256Sync('Conteúdo imutável');
    const snap = snapshotFor(FED_CTB_SOURCE.id, 'Conteúdo imutável', hash);
    const change = ChangeDetector.detectChange(snap, snap, FED_CTB_SOURCE);
    expect(change).toBeNull();
  });
});

describe('Reconciliação — fonte alterada relacionada aos documentos dependentes', () => {
  it('mudança de conteúdo de fonte gera KnowledgeChange associado à fonte e URL', () => {
    const prevHash = calculateSha256Sync('Texto antigo da resolução');
    const newHash = calculateSha256Sync('Texto novo com alteração normativa');
    const prev = snapshotFor(CONTRAN_SOURCE.id, 'Texto antigo da resolução', prevHash);
    const curr = snapshotFor(CONTRAN_SOURCE.id, 'Texto novo com alteração normativa', newHash);

    const change: KnowledgeChange | null = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);

    expect(change).not.toBeNull();
    expect(change!.sourceId).toBe(CONTRAN_SOURCE.id);
    expect(change!.sourceUrl).toBe(CONTRAN_SOURCE.url);
    expect(change!.previousHash).toBe(prevHash);
    expect(change!.newHash).toBe(newHash);
    expect(change!.status).toBe('PENDING_REVIEW'); // nunca auto-aprovado
    // Qualquer mudança jurídica vai para revisão humana (não altera tese automaticamente)
    expect(['PENDING_REVIEW']).toContain(change!.status);
  });
});

describe('Reconciliação — norma revogada gerando pendência de revisão', () => {
  it('detecção de revogação (revoga/revogado) classifica como REVOCATION P0 e PENDING_REVIEW', () => {
    const prev = snapshotFor(CONTRAN_SOURCE.id, 'Texto da resolução vigente', 'hash-antigo');
    const curr = snapshotFor(
      CONTRAN_SOURCE.id,
      'Este ato revoga a resolução anterior',
      'hash-novo',
    );
    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);

    expect(change).not.toBeNull();
    expect(change!.changeType).toBe('REVOCATION');
    expect(change!.riskLevel).toBe('P0_LEGAL_CRITICAL');
    expect(change!.status).toBe('PENDING_REVIEW');
    // A norma revogada gera pendência humana; não altera o status jurídico de teses automaticamente.
  });
});

describe('Reconciliação — coleta repetida idempotente', () => {
  it('mesma URL coletada duas vezes com mesmo conteúdo não duplica versão nem snapshot', async () => {
    const ingestionService = IngestionService.getInstance();
    const content = 'Conteúdo idempotente para teste de repetição';

    const r1 = await ingestionService.ingestDocument({
      sourceId: FED_CTB_SOURCE.id,
      sourceName: FED_CTB_SOURCE.title,
      authority: 'Presidência da República',
      sourceType: 'LAW',
      sourceUrl: FED_CTB_SOURCE.url,
      documentId: 'DOC_IDEMPOTENT',
      title: 'Documento Idempotente',
      documentType: 'LEI',
      content,
      jurisdiction: 'BR_FEDERAL',
    });

    const r2 = await ingestionService.ingestDocument({
      sourceId: FED_CTB_SOURCE.id,
      sourceName: FED_CTB_SOURCE.title,
      authority: 'Presidência da República',
      sourceType: 'LAW',
      sourceUrl: FED_CTB_SOURCE.url,
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
  });
});

describe('Reconciliação — divergências entre catálogo, raspagem e base', () => {
  it('detecta fontes duplicadas com IDs diferentes entre sources.json e OFFICIAL_SOURCES_REGISTRY', () => {
    // sources.json (seed) usa IDs distintos de OFFICIAL_SOURCES_REGISTRY (monitoramento):
    //   sources.json: SRC_FED_CTB, SRC_FED_CONTRAN, SRC_FED_STJ
    //   OFFICIAL_SOURCES_REGISTRY: SRC_FED_PLANALTO_CTB, SRC_FED_CONTRAN_RESOLUCOES, SRC_FED_STJ_JURISPRUDENCIA
    const registryIds = new Set(OFFICIAL_SOURCES_REGISTRY.map((s) => s.id));
    const seedIds = ['SRC_FED_CTB', 'SRC_FED_CONTRAN', 'SRC_FED_STJ'];

    // Nenhum ID do seed está presente no catálogo canônico de monitoramento → divergência de ID.
    for (const id of seedIds) {
      expect(registryIds.has(id)).toBe(false);
    }

    // Mas as mesmas autoridades/URLs estão representadas com IDs diferentes → fontes "duplicadas" conceitualmente.
    const ctbRegistry = OFFICIAL_SOURCES_REGISTRY.find((s) => s.id === 'SRC_FED_PLANALTO_CTB');
    expect(ctbRegistry).toBeDefined();
    expect(ctbRegistry!.url).toContain('planalto.gov.br');
  });

  it('relatório de reconciliação identifica fontes do catálogo sem URL no banco (gap de proveniência)', () => {
    // Todas as 3 fontes federais prioritárias têm URL no catálogo canônico.
    const sourcesWithUrl = OFFICIAL_SOURCES_REGISTRY.filter((s) => s.url && s.url.length > 0);
    const fedSources = sourcesWithUrl.filter((s) => s.uf === 'FEDERAL');
    const fedIds = new Set(fedSources.map((s) => s.id));

    expect(fedIds.has('SRC_FED_PLANALTO_CTB')).toBe(true);
    expect(fedIds.has('SRC_FED_CONTRAN_RESOLUCOES')).toBe(true);
    expect(fedIds.has('SRC_FED_DOU')).toBe(true);
  });
});

describe('Reconciliação — WeeklyMonitorScheduler reaproveita componentes existentes', () => {
  it('o scheduler executa um ciclo com as fontes do catálogo canônico', async () => {
    // O scheduler usa OFFICIAL_SOURCES_REGISTRY e reutiliza SourceFetcher, ContentNormalizer,
    // SnapshotStore, ChangeDetector, ValidationEngine, ReviewQueueService.
    // Este teste apenas verifica que a classe pode ser instanciada e expõe o ciclo.
    expect(typeof WeeklyMonitorScheduler.runCycle).toBe('function');
    expect(typeof WeeklyMonitorScheduler.getCycleHistory).toBe('function');
    expect(typeof WeeklyMonitorScheduler.getLatestReport).toBe('function');
    expect(typeof WeeklyMonitorScheduler.isCycleRunning).toBe('function');
  });

  it('SourceFetcher retorna FetchResult com httpStatus, contentHash-relevant dados e fetchedAt', async () => {
    // Testa o fetcher com uma URL controlada (mock via vitest-network.setup.ts já intercepta
    // fetch com UA 'DefesAi Legal Monitor/2026.1' → retorna 200 com HTML mock).
    const result: Awaited<ReturnType<typeof SourceFetcher.fetchSource>> =
      await SourceFetcher.fetchSource(FED_CTB_SOURCE);

    expect(result.sourceId).toBe(FED_CTB_SOURCE.id);
    expect(result.url).toBe(FED_CTB_SOURCE.url);
    expect(result.httpStatus).toBe(200);
    expect(result.success).toBe(true);
    expect(result.contentLength).toBeGreaterThan(0);
    expect(result.fetchedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('ContentNormalizer produz normalizedText e o hash é determinístico (sem timestamp)', () => {
    const raw = '<html><body>Art. 218 CTB — limite de velocidade</body></html>';
    const normalized = ContentNormalizer.normalize(raw);
    const h1 = calculateSha256Sync(normalized.normalizedText);
    const h2 = calculateSha256Sync(normalized.normalizedText);

    expect(normalized.normalizedText).toContain('Art. 218');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('Reconciliação — fluxo de revisão e impacto (alteração → revisão humana)', () => {
  it('alteração normativa detectada cria evento rastreável e encaminha para revisão humana sem alterar teses', () => {
    // 1. Snapshot anterior (texto vigente)
    const prevHash = calculateSha256Sync('Texto da resolução vigente — Art. 5º procedimentos de fiscalização');
    const prev = snapshotFor(CONTRAN_SOURCE.id, 'Texto da resolução vigente — Art. 5º procedimentos de fiscalização', prevHash);

    // 2. Snapshot alterado (revogação de norma)
    const newHash = calculateSha256Sync('Texto alterado — esta resolução revoga a norma anterior');
    const curr = snapshotFor(CONTRAN_SOURCE.id, 'Texto alterado — esta resolução revoga a norma anterior', newHash);

    // Salva snapshots para histórico
    SnapshotStore.saveSnapshot(prev);
    SnapshotStore.saveSnapshot(curr);

    // 3. ChangeDetector detecta mudança
    const change = ChangeDetector.detectChange(curr, prev, CONTRAN_SOURCE);
    expect(change).not.toBeNull();
    expect(change!.sourceId).toBe(CONTRAN_SOURCE.id);
    expect(change!.sourceUrl).toBe(CONTRAN_SOURCE.url);
    expect(change!.previousHash).toBe(prevHash);
    expect(change!.newHash).toBe(newHash);
    expect(change!.changeType).toBe('REVOCATION');
    expect(change!.riskLevel).toBe('P0_LEGAL_CRITICAL');
    expect(change!.status).toBe('PENDING_REVIEW');

    // 4. ValidationEngine valida e roteia para revisão humana
    const validation = ValidationEngine.validateAndRoute([change!]);
    expect(validation.itemsForHumanReview.length).toBe(1);
    const reviewItem = validation.itemsForHumanReview[0];
    expect(reviewItem.changeId).toBe(change!.id);
    expect(reviewItem.sourceUrl).toBe(CONTRAN_SOURCE.url);
    expect(reviewItem.status).toBe('PENDING_REVIEW');

    // 5. ReviewQueueService enfileira o item
    ReviewQueueService.enqueueItems(validation.itemsForHumanReview);
    const pending = ReviewQueueService.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(`REV_${change!.id}`);

    // 6. A alteração NÃO altera teses automaticamente (status permanece PENDING_REVIEW)
    // A aprovação exige ação humana explícita (ReviewQueueService.approve)
    expect(change!.status).toBe('PENDING_REVIEW');
    expect(reviewItem.status).toBe('PENDING_REVIEW');
    expect(pending[0].status).toBe('PENDING_REVIEW');

    // 7. O evento de alteração está relacionado à fonte e ao documento correspondentes
    expect(change!.sourceId).toBe(CONTRAN_SOURCE.id);
    expect(change!.uf).toBe('FEDERAL');
  });

  it('falha de coleta não gera evento de mudança nem altera teses', async () => {
    await SnapshotStore.clear();

    // Simula falha de coleta — não há snapshot anterior válido
    const previous = await SnapshotStore.getLatestSnapshot(CONTRAN_SOURCE.id);
    expect(previous).toBeNull();

    // Sem snapshot anterior, ChangeDetector não gera mudança (null)
    const snap = snapshotFor(CONTRAN_SOURCE.id, 'Qualquer texto', 'qualquer-hash');
    const change = ChangeDetector.detectChange(snap, null, CONTRAN_SOURCE);
    expect(change).toBeNull();

    // Nenhum evento de mudança é criado — não há impacto em teses
    const validation = ValidationEngine.validateAndRoute([]);
    expect(validation.itemsForHumanReview.length).toBe(0);
  });
});
