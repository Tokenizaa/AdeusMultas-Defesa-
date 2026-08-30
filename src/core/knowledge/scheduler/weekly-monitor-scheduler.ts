/**
 * @file weekly-monitor-scheduler.ts
 * Orquestrador e Agendador Semanal de Monitoramento Nacional (SNM-JO).
 * Executa o ciclo de coleta, normalização, detecção de mudanças, validação e relatórios.
 */

import {
  KnowledgeSource,
  MonitoringCycleSummary,
  KnowledgeSnapshot,
  KnowledgeChange,
} from '../types';
import { OFFICIAL_SOURCES_REGISTRY } from '../sources-registry';
import { SourceFetcher, FetchResult } from '../monitoring/source-fetcher';
import { ContentNormalizer } from '../monitoring/content-normalizer';
import { calculateSha256Sync } from '../monitoring/hash-generator';
import { SnapshotStore } from '../monitoring/snapshot-store';
import { ChangeDetector } from '../monitoring/change-detector';
import { ValidationEngine } from '../validation/validation-engine';
import { ReviewQueueService } from '../validation/review-queue-service';
import { NotificationAlertService } from './notification-alert-service';
import { WeeklyReportGenerator } from '../reporting/weekly-report-generator';

export class WeeklyMonitorScheduler {
  private static isRunning = false;
  private static cycleHistory: MonitoringCycleSummary[] = [];
  private static latestReportMarkdown: string = '';

  /**
   * Executa um ciclo completo de monitoramento nacional.
   */
  public static async runCycle(
    customSources?: KnowledgeSource[],
    fetchTimeoutMs: number = 6000
  ): Promise<{
    summary: MonitoringCycleSummary;
    reportMarkdown: string;
  }> {
    if (this.isRunning) {
      throw new Error('Um ciclo de monitoramento já está em execução.');
    }

    this.isRunning = true;
    const startedAt = new Date().toISOString();
    const cycleId = `CYC_${Date.now()}`;
    const sources = customSources || OFFICIAL_SOURCES_REGISTRY;

    try {
      // 1. Executa requisições HTTP para as fontes
      const fetchResults: FetchResult[] = await SourceFetcher.fetchAllSources(sources, 5, {
        timeoutMs: fetchTimeoutMs,
      });

      let successfulFetches = 0;
      let failedFetches = 0;
      let snapshotsCreated = 0;
      const detectedChanges: KnowledgeChange[] = [];

      // 2. Processa cada resultado de fetch
      for (const result of fetchResults) {
        const source = sources.find((s) => s.id === result.sourceId);
        if (!source) continue;

        source.lastCheckedAt = result.fetchedAt;
        source.httpStatus = result.httpStatus;

        if (result.success) {
          successfulFetches += 1;
          source.lastSuccessfulFetchAt = result.fetchedAt;

          // Normaliza e calcula Hash
          const normalized = ContentNormalizer.normalize(result.content);
          const hash = calculateSha256Sync(normalized.normalizedText);
          source.contentHash = hash;

          const snapshot: KnowledgeSnapshot = {
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

          // Compara com snapshot anterior
          const previousSnapshot = SnapshotStore.getLatestSnapshot(source.id);
          if (previousSnapshot) {
            const change = ChangeDetector.detectChange(snapshot, previousSnapshot, source);
            if (change) {
              detectedChanges.push(change);
            }
          }

          // Salva novo snapshot
          SnapshotStore.saveSnapshot(snapshot);
          snapshotsCreated += 1;
        } else {
          failedFetches += 1;
          source.fetchErrorCount = (source.fetchErrorCount || 0) + 1;
          source.lastErrorMessage = result.errorMessage;
        }
      }

      // 3. Validação e Roteamento de Alterações (Human Review Gate)
      const validation = ValidationEngine.validateAndRoute(detectedChanges);

      // 4. Enfileira itens que exigem revisão humana
      ReviewQueueService.enqueueItems(validation.itemsForHumanReview);

      // 5. Dispara alertas para P0/P1
      const alerts = NotificationAlertService.dispatchAlertsForReviewItems(validation.itemsForHumanReview);

      // 6. Contabilização de riscos
      const changesByRisk = {
        P0_LEGAL_CRITICAL: validation.validatedChanges.filter((c) => c.riskLevel === 'P0_LEGAL_CRITICAL').length,
        P1_OPERATIONAL_HIGH: validation.validatedChanges.filter((c) => c.riskLevel === 'P1_OPERATIONAL_HIGH').length,
        P2_MAINTENANCE: validation.validatedChanges.filter((c) => c.riskLevel === 'P2_MAINTENANCE').length,
        P3_INFO: validation.validatedChanges.filter((c) => c.riskLevel === 'P3_INFO').length,
      };

      const completedAt = new Date().toISOString();

      const summary: MonitoringCycleSummary = {
        cycleId,
        startedAt,
        completedAt,
        totalSources: sources.length,
        successfulFetches,
        failedFetches,
        snapshotsCreated,
        changesDetected: detectedChanges.length,
        changesByRisk,
        sentToReviewQueue: validation.itemsForHumanReview.length,
        autoAppliedSafe: validation.autoAppliedChanges.length,
        conflictsDetected: validation.validatedChanges.filter((c) => c.isConflicting).length,
        alertsTriggered: alerts.length,
      };

      // 7. Gera Relatório em Markdown
      const reportMarkdown = WeeklyReportGenerator.generateMarkdownReport(
        summary,
        sources,
        validation.validatedChanges,
        ReviewQueueService.getAll()
      );

      this.latestReportMarkdown = reportMarkdown;
      this.cycleHistory.unshift(summary);

      return {
        summary,
        reportMarkdown,
      };
    } finally {
      this.isRunning = false;
    }
  }

  public static getCycleHistory(): MonitoringCycleSummary[] {
    return this.cycleHistory;
  }

  public static getLatestReport(): string {
    return this.latestReportMarkdown;
  }

  public static isCycleRunning(): boolean {
    return this.isRunning;
  }
}
