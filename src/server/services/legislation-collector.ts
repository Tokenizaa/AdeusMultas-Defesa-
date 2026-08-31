/**
 * @file legislation-collector.ts
 * Collector for official legislation sources (CONTRAN, SENATRAN, DOU, etc.)
 * Implements retry, timeout, error handling, content hashing, and idempotency.
 */

import { KnowledgeSource, KnowledgeSnapshot, KnowledgeChange, ChangeType, RiskLevel, ReviewStatus } from '../../core/knowledge/types';
import { calculateSha256Sync } from '../../core/knowledge/monitoring/hash-generator';
import { CanonicalKnowledgeRegistry } from '../../core/knowledge/registry/canonical-registry';
import { TemporalKnowledgeEngine } from '../../core/knowledge/temporal-engine';
import { logger } from '../../server/observability/logger';
import { configService } from '../config/config-service';

export class LegislationCollector {
  private readonly source: KnowledgeSource;
  private readonly intervalSeconds: number;
  private intervalId: NodeJS.Timeout | null;
  private readonly httpTimeout: number = 15000; // 15 seconds
  private readonly maxRetries: number = 3;

  constructor(source: KnowledgeSource, intervalSeconds: number = 86400) { // default: 24 hours
    this.source = source;
    this.intervalSeconds = intervalSeconds;
    this.intervalId = null;
    logger.info('knowledge', 'legislation-collector', 'collector_initialized', `Legislation collector initialized for source ${this.source.id}`, {
      sourceId: this.source.id,
      intervalSeconds,
    });
  }

  /**
   * Start the periodic collection loop (idempotent: no-op if already running).
   */
  start(): void {
    if (this.intervalId) {
      logger.info('knowledge', 'legislation-collector', 'collector_already_running', `Collector already running for source ${this.source.id}`, {
        sourceId: this.source.id,
      });
      return;
    }
    this.intervalId = setInterval(async () => {
      await this.collectAndProcess();
    }, this.intervalSeconds * 1000);
    logger.info('knowledge', 'legislation-collector', 'collector_started', `Legislation collector started for source ${this.source.id}`, {
      sourceId: this.source.id,
      intervalSeconds: this.intervalSeconds,
    });
  }

  /**
   * Stop the collector
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('knowledge', 'legislation-collector', 'collector_stopped', `Legislation collector stopped for source ${this.source.id}`, {
        sourceId: this.source.id,
      });
    }
  }

  /**
   * Main collection loop: fetch, hash, detect changes, create snapshot, validate, version.
   */
  private async collectAndProcess(): Promise<void> {
    logger.info('knowledge', 'legislation-collector', 'collection_started', `Starting collection for ${this.source.title}`, {
      sourceId: this.source.id,
    });

    let retries = 0;
    let lastError: unknown = null;
    let responseData: string | null = null;
    let httpStatus: number = 0;

    while (retries <= this.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.httpTimeout);

        // Use fetch (Node.js v18+)
        const response = await fetch(this.source.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DefesaAi-LegislationCollector/1.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        clearTimeout(timeoutId);
        httpStatus = response.status;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        responseData = await response.text();
        break; // success
      } catch (err) {
        lastError = err;
        retries++;
        logger.warn('knowledge', 'legislation-collector', 'collection_attempt_failed', `Collection attempt ${retries} failed for ${this.source.title}`, {
          sourceId: this.source.id,
          attempt: retries,
          error: err instanceof Error ? err.message : String(err),
        });
        if (retries <= this.maxRetries) {
          // wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }

    if (responseData === null) {
      // All retries failed
      logger.error('knowledge', 'legislation-collector', 'collection_failed', `Failed to collect ${this.source.title} after ${this.maxRetries + 1} attempts`, {
        sourceId: this.source.id,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        httpStatus,
      });
      // Update source with failure status
      await this.updateSourceStatus(false, httpStatus, lastError);
      return;
    }

    // Compute hash of the content
    const contentHash = this.hashContent(responseData);

    // Check if content changed compared to last known hash
    const lastKnownHash = this.source.contentHash ?? '';
    const contentChanged = contentHash !== lastKnownHash;

    // Create snapshot regardless of change (for audit)
    const snapshot: KnowledgeSnapshot = {
      id: `snap_${this.source.id}_${Date.now()}`,
      sourceId: this.source.id,
      url: this.source.url,
      uf: this.source.uf,
      fetchedAt: new Date().toISOString(),
      httpStatus,
      contentLength: responseData.length,
      contentHash,
      normalizedText: this.normalizeContent(responseData), // simple normalization: trim whitespace
      rawSample: responseData.slice(0, 500), // first 500 chars for sample
    };

    // Store snapshot (in a real system, persist to DB; here we just log)
    logger.info('knowledge', 'legislation-collector', 'snapshot_created', `Snapshot created for ${this.source.title}`, {
      snapshotId: snapshot.id,
      contentHash,
      contentLength: snapshot.contentLength,
    });

    if (!contentChanged) {
      logger.info('knowledge', 'legislation-collector', 'content_unchanged', `Content unchanged for ${this.source.title}`, {
        sourceId: this.source.id,
        contentHash,
      });
      // Update source with successful fetch but no change
      await this.updateSourceStatus(true, httpStatus, null, contentHash, false);
      return;
    }

    // Content changed: determine change type and risk level
    const changeInfo = this.detectChangeType(responseData, this.source);
    const change: KnowledgeChange = {
      id: `chg_${this.source.id}_${Date.now()}`,
      sourceId: this.source.id,
      sourceUrl: this.source.url,
      uf: this.source.uf,
      organId: this.source.organId,
      discoveredAt: new Date().toISOString(),
      changeType: changeInfo.changeType,
      riskLevel: changeInfo.riskLevel,
      title: changeInfo.title,
      description: changeInfo.description,
      previousValue: changeInfo.previousValue,
      newValue: changeInfo.newValue,
      previousHash: changeInfo.previousHash ?? lastKnownHash,
      newHash: contentHash,
      diffSummary: changeInfo.diffSummary,
      status: 'PENDING_REVIEW', // requires human review unless auto-safe
    };

    logger.info('knowledge', 'legislation-collector', 'change_detected', `Change detected for ${this.source.title}`, {
      changeId: change.id,
      changeType: change.changeType,
      riskLevel: change.riskLevel,
    });

    // ===== Fase 7: NUNCA auto-aplicar mudança na base de conhecimento =====
    // Uma página ter mudado NÃO autoriza alterar tese jurídica. Toda mudança
    // (inclusive P3_INFO) vai à esteira de revisão humana (PENDING_REVIEW).
    // Aplicação somente após validação e aprovação explícita (REQUIRES_HUMAN_REVIEW).
    logger.warn('knowledge', 'legislation-collector', 'change_requires_review', `Change detected requires human review for ${this.source.title}`, {
      changeId: change.id,
      changeType: change.changeType,
      riskLevel: change.riskLevel,
    });
    // TODO(monitoring): persistir `change` na fila de revisão (review-queue-service)
    // para aprovação humana antes de qualquer applyChangeToKnowledgeBase.

    // Update source with successful fetch and new hash
    await this.updateSourceStatus(true, httpStatus, null, contentHash, true);
  }

  /**
   * Hash determinístico SHA-256 do conteúdo normalizado.
   * NUNCA usa timestamp: hash instável faria todo fetch parecer mudança.
   */
  private hashContent(content: string): string {
    return calculateSha256Sync(this.normalizeContent(content));
  }

  /**
   * Normalize content for comparison (e.g., trim whitespace, normalize line endings)
   */
  private normalizeContent(content: string): string {
    return content.trim().replace(/\r\n/g, '\n');
  }

  /**
   * Detect change type based on content diff (simplified).
   * In a real system, we would compute a diff and analyze.
   */
  private detectChangeType(newContent: string, source: KnowledgeSource): {
    changeType: ChangeType;
    riskLevel: RiskLevel;
    title: string;
    description: string;
    previousValue: string;
    newValue: string;
    previousHash?: string;
    newHash: string;
    diffSummary: string;
    autoApplySafe: boolean;
  } {
    // Placeholder logic: assume any change is a NEW_REGULATION with P0 risk (requires review)
    // In reality, we would parse the document and compare with previous version.
    return {
      changeType: 'NEW_REGULATION',
      riskLevel: 'P0_LEGAL_CRITICAL',
      title: `New${source.title.split('-').pop() || ''} regulation detected`,
      description: `The content of ${source.title} has changed. Requires legal review to determine impact on defenses.`,
      previousValue: '(previous content hash: ' + (this.source.contentHash ?? 'unknown') + ')',
      newValue: '(new content hash: computed)',
      previousHash: this.source.contentHash,
      newHash: this.hashContent(newContent), // will be recomputed but okay
      diffSummary: 'Content changed; diff not computed in this prototype.',
      autoApplySafe: false,
    };
  }

  /**
   * Update source metadata after fetch attempt.
   */
  private async updateSourceStatus(
    success: boolean,
    httpStatus: number,
    error: unknown | null,
    contentHash?: string,
    contentChanged: boolean = false
  ): Promise<void> {
    // In a real system, we would update the source in the registry or DB.
    // Here we just log.
    logger.info('knowledge', 'legislation-collector', 'source_status_updated', `Source status updated for ${this.source.title}`, {
      sourceId: this.source.id,
      success,
      httpStatus,
      error: error instanceof Error ? error.message : String(error),
      contentHash: contentHash ?? this.source.contentHash,
      contentChanged,
    });
  }

  /**
   * Apply approved change to the knowledge base (e.g., add new resolution, update argument).
   * This is a placeholder; real implementation would modify the appropriate knowledge arrays.
   */
  private async applyChangeToKnowledgeBase(change: KnowledgeChange, newContent: string): Promise<void> {
    logger.info('knowledge', 'legislation-collector', 'applying_change', `Applying change to knowledge base (placeholder) for ${this.source.title}`, {
      changeId: change.id,
    });
    // TODO: Implement actual application:
    // - Parse newContent for new resolutions, laws, etc.
    // - Update INFRACTION_CATALOG, LEGAL_ARGUMENTS, PROCEDURES_CATALOG, etc. as needed.
    // - Ensure temporal validity (validFrom/v Until) based on publication date.
    // - Add to appropriate knowledge arrays (mutate the imported constants).
    // For now, we just log.
  }
}

// Example usage: create collectors for prioritized sources and export them.
// In a real system, we would read the OFFICIAL_SOURCES_REGISTRY and create collectors for each.
// For now, we create a single example collector for CONTRAN resolutions.

const CONTRAN_SOURCE: KnowledgeSource = {
  id: 'SRC_FED_CONTRAN_RESOLUCOES',
  uf: 'FEDERAL',
  organId: undefined,
  tier: 'TIER_1_GOV_PRIMARY',
  title: 'Conselho Nacional de Trânsito (CONTRAN) - Resoluções',
  url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran',
  category: 'legislation',
  lastCheckedAt: undefined,
  lastSuccessfulFetchAt: undefined,
  httpStatus: undefined,
  contentHash: undefined,
  isActive: true,
  fetchErrorCount: 0,
  lastErrorMessage: undefined,
};

export const contranCollector = new LegislationCollector(CONTRAN_SOURCE, 86400); // daily interval

// Start the collector (in production, this would be started by a scheduler service)
// contranCollector.start();

// Export for use in server startup
export default {
  contranCollector,
  // Add other collectors here
};