import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContentNormalizer,
  calculateSha256Sync,
  SnapshotStore,
  ChangeDetector,
  ValidationEngine,
  ReviewQueueService,
  NotificationAlertService,
  WeeklyReportGenerator,
  WeeklyMonitorScheduler,
  KnowledgeSource,
  KnowledgeSnapshot,
} from '../../../src/core/knowledge';

describe('SNM-JO Monitoring & Crawler Pipeline', () => {
  beforeEach(() => {
    SnapshotStore.clear();
    ReviewQueueService.clear();
    NotificationAlertService.clear();
  });

  it('must normalize HTML and strip dynamic tokens, scripts, and timestamps', () => {
    const rawHtml = `
      <html>
        <head><script>var token = 'abc1234567890abcdef1234567890abcdef';</script></head>
        <body>
          <style>.banner { color: red; }</style>
          <h1>DETRAN-SP - Protocolo de Recursos</h1>
          <p>Horário de geração: 14:32:05</p>
          <p>O prazo para apresentação de recurso à JARI é de 30 dias contados da notificação, nos termos do Art. 282 do CTB.</p>
          <a href="https://www.detran.sp.gov.br/recursos">Acessar Sistema</a>
        </body>
      </html>
    `;

    const normalized = ContentNormalizer.normalize(rawHtml);
    expect(normalized.normalizedText).toContain('DETRAN-SP - Protocolo de Recursos');
    expect(normalized.normalizedText).toContain('O prazo para apresentação de recurso');
    expect(normalized.normalizedText).not.toContain('<script>');
    expect(normalized.normalizedText).not.toContain('14:32:05');
    expect(normalized.extractedDeadlines.length).toBeGreaterThan(0);
    expect(normalized.extractedArticles.length).toBeGreaterThan(0);
    expect(normalized.extractedUrls).toContain('https://www.detran.sp.gov.br/recursos');
  });

  it('must generate deterministic SHA-256 hashes', () => {
    const text1 = 'Regulamento de Trânsito 2026';
    const text2 = 'Regulamento de Trânsito 2026';
    const text3 = 'Regulamento de Trânsito 2027';

    const hash1 = calculateSha256Sync(text1);
    const hash2 = calculateSha256Sync(text2);
    const hash3 = calculateSha256Sync(text3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('must store snapshots and retrieve latest and previous snapshots', () => {
    const snap1: KnowledgeSnapshot = {
      id: 'SNP_001',
      sourceId: 'SRC_DETRAN_SP_PORTAL',
      url: 'https://detran.sp.gov.br',
      uf: 'SP',
      fetchedAt: '2026-08-01T10:00:00Z',
      httpStatus: 200,
      contentLength: 500,
      contentHash: 'hash1',
      normalizedText: 'Versão 1 do portal',
    };

    const snap2: KnowledgeSnapshot = {
      id: 'SNP_002',
      sourceId: 'SRC_DETRAN_SP_PORTAL',
      url: 'https://detran.sp.gov.br',
      uf: 'SP',
      fetchedAt: '2026-08-08T10:00:00Z',
      httpStatus: 200,
      contentLength: 520,
      contentHash: 'hash2',
      normalizedText: 'Versão 2 do portal com novo link',
    };

    SnapshotStore.saveSnapshot(snap1);
    expect(SnapshotStore.getLatestSnapshot('SRC_DETRAN_SP_PORTAL')?.id).toBe('SNP_001');

    SnapshotStore.saveSnapshot(snap2);
    expect(SnapshotStore.getLatestSnapshot('SRC_DETRAN_SP_PORTAL')?.id).toBe('SNP_002');
    expect(SnapshotStore.getPreviousSnapshot('SRC_DETRAN_SP_PORTAL')?.id).toBe('SNP_001');
  });

  it('must detect P0 Legal Critical changes (revocation, deadline change, resolutions)', () => {
    const dummySource: KnowledgeSource = {
      id: 'SRC_CONTRAN_PORTAL',
      organId: 'CONTRAN_FEDERAL',
      title: 'Portal Oficial CONTRAN',
      url: 'https://www.gov.br/transportes/contran',
      sphere: 'federal',
      tier: 1,
      uf: 'FEDERAL',
      frequency: 'weekly',
      isActive: true,
      lastCheckedAt: '2026-08-20T00:00:00Z',
    };

    const snap1: KnowledgeSnapshot = {
      id: 'SNP_01',
      sourceId: dummySource.id,
      url: dummySource.url,
      uf: dummySource.uf,
      fetchedAt: '2026-08-10T10:00:00Z',
      httpStatus: 200,
      contentLength: 100,
      contentHash: 'hash_old',
      normalizedText: 'Resolução CONTRAN nº 798/2020 em vigor sobre medidores de velocidade.',
    };

    const snap2: KnowledgeSnapshot = {
      id: 'SNP_02',
      sourceId: dummySource.id,
      url: dummySource.url,
      uf: dummySource.uf,
      fetchedAt: '2026-08-17T10:00:00Z',
      httpStatus: 200,
      contentLength: 120,
      contentHash: 'hash_new',
      normalizedText: 'Fica revogado o artigo da Resolução CONTRAN e alterado o prazo para 45 dias.',
    };

    const change = ChangeDetector.detectChange(snap2, snap1, dummySource);
    expect(change).not.toBeNull();
    expect(change?.riskLevel).toBe('P0_LEGAL_CRITICAL');
    expect(change?.changeType).toBe('REVOCATION');
  });

  it('must route P0 changes strictly to Human-in-the-Loop Review Queue and dispatch alerts', () => {
    const dummyChange = {
      id: 'CHG_001',
      sourceId: 'SRC_DETRAN_RJ_PORTAL',
      sourceUrl: 'https://detran.rj.gov.br',
      uf: 'RJ',
      organId: 'DETRAN_RJ',
      discoveredAt: new Date().toISOString(),
      changeType: 'DEADLINE_CHANGE' as const,
      riskLevel: 'P0_LEGAL_CRITICAL' as const,
      title: 'Alteração de Prazo Processual RJ',
      description: 'Prazo de defesa alterado para 15 dias',
      previousValue: 'Prazo 30 dias',
      newValue: 'Prazo 15 dias',
      previousHash: 'h1',
      newHash: 'h2',
      diffSummary: '+ Prazo 15 dias\n- Prazo 30 dias',
      status: 'PENDING_REVIEW' as const,
    };

    const validation = ValidationEngine.validateAndRoute([dummyChange]);
    expect(validation.itemsForHumanReview.length).toBe(1);
    expect(validation.autoAppliedChanges.length).toBe(0);

    ReviewQueueService.enqueueItems(validation.itemsForHumanReview);
    const pending = ReviewQueueService.getPending();
    expect(pending.length).toBe(1);

    const alerts = NotificationAlertService.dispatchAlertsForReviewItems(validation.itemsForHumanReview);
    expect(alerts.length).toBe(1);
    expect(alerts[0].level).toBe('CRITICAL');

    // Admin approves the change
    const approved = ReviewQueueService.approve(pending[0].id, 'Auditor Chefe');
    expect(approved).toBe(true);
    expect(ReviewQueueService.getPending().length).toBe(0);
  });

  it('must generate a comprehensive weekly markdown report', () => {
    const summary = {
      cycleId: 'CYC_TEST_001',
      startedAt: '2026-08-20T10:00:00Z',
      completedAt: '2026-08-20T10:02:00Z',
      totalSources: 35,
      successfulFetches: 35,
      failedFetches: 0,
      snapshotsCreated: 35,
      changesDetected: 1,
      changesByRisk: {
        P0_LEGAL_CRITICAL: 0,
        P1_OPERATIONAL_HIGH: 1,
        P2_MAINTENANCE: 0,
        P3_INFO: 0,
      },
      sentToReviewQueue: 1,
      autoAppliedSafe: 0,
      conflictsDetected: 0,
      alertsTriggered: 1,
    };

    const report = WeeklyReportGenerator.generateMarkdownReport(summary, [], [], []);
    expect(report).toContain('RELATÓRIO NACIONAL DE MONITORAMENTO JURÍDICO-OPERACIONAL');
    expect(report).toContain('CYC_TEST_001');
    expect(report).toContain('COBERTURA DAS 27 UNIDADES FEDERATIVAS');
    expect(report).toContain('FILA DE REVISÃO HUMANA');
  });

  it('must run a simulated cycle via WeeklyMonitorScheduler with custom mock sources', async () => {
    const mockSources: KnowledgeSource[] = [
      {
        id: 'SRC_MOCK_1',
        organId: 'DETRAN_SP',
        title: 'Mock Detran SP',
        url: 'https://httpbin.org/status/200',
        sphere: 'estadual',
        tier: 2,
        uf: 'SP',
        frequency: 'weekly',
        isActive: true,
      },
    ];

    const result = await WeeklyMonitorScheduler.runCycle(mockSources, 1000);
    expect(result.summary).toBeDefined();
    expect(result.reportMarkdown).toBeDefined();
    expect(WeeklyMonitorScheduler.getCycleHistory().length).toBeGreaterThan(0);
  });
});
