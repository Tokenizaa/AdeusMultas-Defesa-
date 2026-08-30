/**
 * @file review-queue-service.ts
 * Serviço de Fila de Revisão Humana (Human-in-the-Loop) para o SNM-JO.
 * Permite aprovação, rejeição, ajuste e aplicação de mudanças normativas e operacionais.
 */

import { ReviewQueueItem, ReviewStatus, KnowledgeOrgan } from '../types';
import { NATIONAL_ORGANS_DB, getNationalOrganById } from '../national-registry';

export class ReviewQueueService {
  private static queue: Map<string, ReviewQueueItem> = new Map();

  /**
   * Adiciona itens à fila de revisão.
   */
  public static enqueueItems(items: ReviewQueueItem[]): void {
    for (const item of items) {
      if (!this.queue.has(item.id)) {
        this.queue.set(item.id, item);
      }
    }
  }

  /**
   * Obtém todos os itens pendentes de revisão.
   */
  public static getPending(): ReviewQueueItem[] {
    return Array.from(this.queue.values()).filter((item) => item.status === 'PENDING_REVIEW');
  }

  /**
   * Retorna a quantidade de itens pendentes de revisão.
   */
  public static getPendingCount(): number {
    return this.getPending().length;
  }

  /**
   * Obtém todos os itens da fila (pendentes, aprovados, rejeitados).
   */
  public static getAll(): ReviewQueueItem[] {
    return Array.from(this.queue.values());
  }

  /**
   * Obtém item específico por ID.
   */
  public static getById(id: string): ReviewQueueItem | null {
    return this.queue.get(id) || null;
  }

  /**
   * Aprova uma alteração, aplicando-a ao registro canônico ativo com versionamento temporal.
   */
  public static approve(
    id: string,
    reviewer: string = 'Especialista Jurídico',
    notes: string = 'Aprovado após conferência com fonte primária'
  ): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    item.status = 'APPROVED';

    // Aplica no registro canônico se for relacionado a um órgão
    if (item.organId) {
      this.applyApprovedChangeToOrgan(item);
    }

    return true;
  }

  /**
   * Rejeita uma alteração.
   */
  public static reject(
    id: string,
    reviewer: string = 'Especialista Jurídico',
    reason: string = 'Alteração rejeitada'
  ): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    item.status = 'REJECTED';
    return true;
  }

  /**
   * Ajusta e aprova uma alteração com dados corrigidos pelo revisor.
   */
  public static adjustAndApprove(
    id: string,
    adjustedData: Partial<KnowledgeOrgan>,
    reviewer: string = 'Especialista Jurídico',
    notes: string = 'Ajustado manualmente'
  ): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    item.status = 'ADJUSTED';

    if (item.organId) {
      const organ = getNationalOrganById(item.organId);
      if (organ) {
        Object.assign(organ, adjustedData);
        organ.version += 1;
        organ.lastVerifiedAt = new Date().toISOString().split('T')[0];
      }
    }

    return true;
  }

  /**
   * Marca uma detecção como falso positivo (ruído de crawler).
   */
  public static markFalsePositive(id: string, notes: string = 'Falso positivo'): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    item.status = 'FALSE_POSITIVE';
    return true;
  }

  /**
   * Aplica a mudança aprovada ao órgão no banco de dados canônico em memória.
   */
  private static applyApprovedChangeToOrgan(item: ReviewQueueItem): void {
    if (!item.organId) return;
    const organ = getNationalOrganById(item.organId);
    if (!organ) return;

    // Atualiza metadados de versão
    organ.version += 1;
    organ.lastVerifiedAt = new Date().toISOString().split('T')[0];

    // Se a alteração envolver URL de portal
    if (item.changeType === 'PORTAL_URL_CHANGE') {
      const urlMatch = item.diff.current.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        organ.onlinePortalUrl = urlMatch[0];
        if (organ.protocolChannels) {
          organ.protocolChannels.digitalPortalUrl = urlMatch[0];
        }
      }
    }

    // Se a alteração envolver novo endereço físico
    if (item.changeType === 'ADDRESS_CHANGE') {
      organ.physicalAddress = item.diff.current.slice(0, 200);
    }
  }

  /**
   * Limpa a fila (para testes).
   */
  public static clear(): void {
    this.queue.clear();
  }
}
