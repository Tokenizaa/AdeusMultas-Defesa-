/**
 * @file weekly-monitor-service.ts
 * DefesaAI — Serviço de Monitoramento Semanal das 27 UFs (SNM-JO).
 *
 * Realiza a coleta automatizada de dados de fontes oficiais (Tiers 1 a 3)
 * para todas as 27 Unidades Federativas e âmbito Federal, compara snapshots
 * via hash SHA-256, detecta alterações normativas/operacionais e as registra
 * como KnowledgeChange para validação e auditoria humana.
 */

import {
  KnowledgeSource,
  MonitoringCycleSummary,
  KnowledgeSnapshot,
  KnowledgeChange,
  ReviewQueueItem,
} from '../types';
import { CanonicalKnowledgeRegistry } from '../registry/canonical-registry';
import { SourceFetcher, FetchResult } from '../monitoring/source-fetcher';
import { ContentNormalizer } from '../monitoring/content-normalizer';
import { calculateSha256Sync } from '../monitoring/hash-generator';
import { SnapshotStore } from '../monitoring/snapshot-store';
import { ChangeDetector } from '../monitoring/change-detector';
import { ValidationEngine } from '../validation/validation-engine';
import { ReviewQueueService } from '../validation/review-queue-service';
import { NotificationAlertService } from './notification-alert-service';
import { WeeklyReportGenerator } from '../reporting/weekly-report-generator';

export interface MonitorServiceConfig {
  fetchTimeoutMs?: number;
  concurrency?: number;
  autoScheduleIntervalMs?: number;
  onlyTier1To3?: boolean;
}

export class WeeklyMonitorService {
  private static isRunning = false;
  private static timerId: NodeJS.Timeout | null = null;
  private static cycleHistory: MonitoringCycleSummary[] = [];
  private static lastReportMarkdown: string = '';
  private static lastRunTimestamp: string | null = null;
  private static nextRunTimestamp: string | null = null;

  /**
   * Executa o ciclo de monitoramento semanal coletando fontes Tier 1 a 3 das 27 UFs.
   */
  public static async runWeeklyCycle(config?: MonitorServiceConfig): Promise<{
    summary: MonitoringCycleSummary;
    reportMarkdown: string;
    reviewItems: ReviewQueueItem[];
    detectedChanges: KnowledgeChange[];
  }> {
    if (this.isRunning) {
      throw new Error('Um ciclo de monitoramento já está em andamento no momento.');
    }

    this.isRunning = true;
    const startedAt = new Date().toISOString();
    const cycleId = `CYC_WEEKLY_${Date.now()}`;
    const timeoutMs = config?.fetchTimeoutMs || 5000;
    const concurrency = config?.concurrency || 5;

    try {
      // 1. Obtém as fontes oficiais canônicas Tier 1-3 para todas as 27 UFs + Federal
      const sourcesToMonitor: KnowledgeSource[] =
        config?.onlyTier1To3 === false
          ? CanonicalKnowledgeRegistry.getAllSources()
          : CanonicalKnowledgeRegistry.getTier1To3Sources();

      // 2. Realiza a coleta com controle de concorrência e timeout
      const fetchResults: FetchResult[] = await SourceFetcher.fetchAllSources(
        sourcesToMonitor,
        concurrency,
        { timeoutMs }
      );

      let successfulFetches = 0;
      let failedFetches = 0;
      let snapshotsCreated = 0;
      const detectedChanges: KnowledgeChange[] = [];

      // 3. Processa e compara cada snapshot usando SHA-256
      for (const result of fetchResults) {
        const source = sourcesToMonitor.find((s) => s.id === result.sourceId);
        if (!source) continue;

        source.lastCheckedAt = result.fetchedAt;
        source.httpStatus = result.httpStatus;

        if (result.success) {
          successfulFetches += 1;
          source.lastSuccessfulFetchAt = result.fetchedAt;

          // Normalização e extração de Hash SHA-256
          const normalized = ContentNormalizer.normalize(result.content);
          const hash = calculateSha256Sync(normalized.normalizedText);
          source.contentHash = hash;

          const currentSnapshot: KnowledgeSnapshot = {
            id: `SNP_${source.id}_${Date.now()}`,
            sourceId: source.id,
            url: source.url,
            uf: source.uf,
            fetchedAt: result.fetchedAt,
            httpStatus: result.httpStatus,
            contentLength: result.contentLength,
            contentHash: hash,
            normalizedText: normalized.normalizedText,
            rawSample: result.content.slice(0, 500),
          };

          // Compara com o snapshot anterior registrado
          const previousSnapshot = SnapshotStore.getLatestSnapshot(source.id);
          if (previousSnapshot) {
            const change = ChangeDetector.detectChange(currentSnapshot, previousSnapshot, source);
            if (change) {
              detectedChanges.push(change);
            }
          }

          // Armazena novo snapshot
          SnapshotStore.saveSnapshot(currentSnapshot);
          snapshotsCreated += 1;
        } else {
          failedFetches += 1;
          source.fetchErrorCount = (source.fetchErrorCount || 0) + 1;
          source.lastErrorMessage = result.errorMessage;
        }
      }

      // 4. Validação de Regras e Roteamento para Fila de Revisão Humana
      const validation = ValidationEngine.validateAndRoute(detectedChanges);

      // 5. Enfileira itens críticos para validação humana obrigatória
      ReviewQueueService.enqueueItems(validation.itemsForHumanReview);

      // 6. Dispara notificações e alertas para alterações de risco P0/P1
      const dispatchedAlerts = NotificationAlertService.dispatchAlertsForReviewItems(
        validation.itemsForHumanReview
      );

      // 7. Consolida métricas por nível de severidade
      const changesByRisk = {
        P0_LEGAL_CRITICAL: validation.validatedChanges.filter(
          (c) => c.riskLevel === 'P0_LEGAL_CRITICAL'
        ).length,
        P1_OPERATIONAL_HIGH: validation.validatedChanges.filter(
          (c) => c.riskLevel === 'P1_OPERATIONAL_HIGH'
        ).length,
        P2_MAINTENANCE: validation.validatedChanges.filter(
          (c) => c.riskLevel === 'P2_MAINTENANCE'
        ).length,
        P3_INFO: validation.validatedChanges.filter(
          (c) => c.riskLevel === 'P3_INFO'
        ).length,
      };

      const completedAt = new Date().toISOString();

      const summary: MonitoringCycleSummary = {
        cycleId,
        startedAt,
        completedAt,
        totalSources: sourcesToMonitor.length,
        successfulFetches,
        failedFetches,
        snapshotsCreated,
        changesDetected: detectedChanges.length,
        changesByRisk,
        sentToReviewQueue: validation.itemsForHumanReview.length,
        autoAppliedSafe: validation.autoAppliedChanges.length,
        conflictsDetected: validation.validatedChanges.filter((c) => c.isConflicting).length,
        alertsTriggered: dispatchedAlerts.length,
      };

      // 8. Gera o Relatório Consolidado de Monitoramento
      const reportMarkdown = WeeklyReportGenerator.generateMarkdownReport(
        summary,
        sourcesToMonitor,
        validation.validatedChanges,
        ReviewQueueService.getAll()
      );

      this.cycleHistory.unshift(summary);
      if (this.cycleHistory.length > 20) {
        this.cycleHistory = this.cycleHistory.slice(0, 20);
      }
      this.lastReportMarkdown = reportMarkdown;
      this.lastRunTimestamp = completedAt;

      return {
        summary,
        reportMarkdown,
        reviewItems: validation.itemsForHumanReview,
        detectedChanges: validation.validatedChanges,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicia o agendador periódico de monitoramento (padrão: 7 dias em ms).
   */
  public static startScheduledService(intervalMs: number = 7 * 24 * 60 * 60 * 1000): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    const nextRun = new Date(Date.now() + intervalMs);
    this.nextRunTimestamp = nextRun.toISOString();

    this.timerId = setInterval(async () => {
      try {
        await this.runWeeklyCycle();
        const next = new Date(Date.now() + intervalMs);
        this.nextRunTimestamp = next.toISOString();
      } catch (error) {
        console.error('[WeeklyMonitorService] Erro durante ciclo periódico:', error);
      }
    }, intervalMs);
  }

  /**
   * Para o agendador periódico de monitoramento.
   */
  public static stopScheduledService(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      this.nextRunTimestamp = null;
    }
  }

  /**
   * Retorna o status operacional atual do serviço de monitoramento.
   */
  public static getStatus() {
    return {
      isActive: !!this.timerId,
      isRunning: this.isRunning,
      lastRunAt: this.lastRunTimestamp,
      nextRunAt: this.nextRunTimestamp,
      totalCyclesExecuted: this.cycleHistory.length,
      latestCycle: this.cycleHistory[0] || null,
      pendingReviewsCount: ReviewQueueService.getPendingCount(),
    };
  }

  /**
   * Retorna o histórico de ciclos executados.
   */
  public static getCycleHistory(): MonitoringCycleSummary[] {
    return [...this.cycleHistory];
  }

  /**
   * Retorna o último relatório em Markdown gerado.
   */
  public static getLatestReportMarkdown(): string {
    return this.lastReportMarkdown;
  }
}
