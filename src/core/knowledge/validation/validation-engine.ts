/**
 * @file validation-engine.ts
 * Motor de Validação e Roteamento de Segurança de Alterações.
 * Garante que NENHUMA alteração jurídica crítica (P0) seja aplicada automaticamente sem validação humana.
 */

import { KnowledgeChange, ReviewQueueItem, RiskLevel } from '../types';
import { ImpactClassifier } from './impact-classifier';
import { ConflictDetector } from './conflict-detector';

export interface ValidationResult {
  validatedChanges: KnowledgeChange[];
  itemsForHumanReview: ReviewQueueItem[];
  autoAppliedChanges: KnowledgeChange[];
}

export class ValidationEngine {
  /**
   * Processa uma lista de alterações detectadas, aplicando classificação, detecção de conflitos
   * e separação estrita entre Fila de Revisão Humana e Atualizações Seguras.
   */
  public static validateAndRoute(changes: KnowledgeChange[]): ValidationResult {
    // 1. Refina classificação de risco
    const classifiedChanges = changes.map((c) => ({
      ...c,
      riskLevel: ImpactClassifier.classify(c),
    }));

    // 2. Detecta conflitos entre fontes
    const conflictsChecked = ConflictDetector.detectConflicts(classifiedChanges);

    const itemsForHumanReview: ReviewQueueItem[] = [];
    const autoAppliedChanges: KnowledgeChange[] = [];
    const validatedChanges: KnowledgeChange[] = [];

    for (const chg of conflictsChecked) {
      // REGRA DE OURO: P0, P1, Conflitos e Qualquer mudança jurídica EXIGEM revisão humana.
      const requiresHumanReview =
        chg.riskLevel === 'P0_LEGAL_CRITICAL' ||
        chg.riskLevel === 'P1_OPERATIONAL_HIGH' ||
        chg.isConflicting ||
        chg.changeType === 'NEW_REGULATION' ||
        chg.changeType === 'REVOCATION' ||
        chg.changeType === 'DEADLINE_CHANGE' ||
        chg.changeType === 'COMPETENCE_CHANGE';

      if (requiresHumanReview) {
        chg.status = 'PENDING_REVIEW';
        validatedChanges.push(chg);

        itemsForHumanReview.push({
          id: `REV_${chg.id}`,
          changeId: chg.id,
          uf: chg.uf,
          organId: chg.organId,
          organName: chg.organId || chg.uf,
          sourceTitle: chg.title,
          sourceUrl: chg.sourceUrl,
          changeType: chg.changeType,
          riskLevel: chg.riskLevel,
          discoveredAt: chg.discoveredAt,
          summary: chg.description,
          impact: this.getImpactDescription(chg.riskLevel, chg.changeType),
          legalBasis: chg.changeType === 'DEADLINE_CHANGE' ? 'Art. 281/282 CTB' : undefined,
          diff: {
            previous: chg.previousValue,
            current: chg.newValue,
          },
          status: 'PENDING_REVIEW',
        });
      } else {
        // Apenas mudanças P3 de baixíssimo risco sem impacto legal podem ser auto-registradas
        chg.status = 'AUTO_APPLIED_SAFE';
        chg.appliedAt = new Date().toISOString();
        autoAppliedChanges.push(chg);
        validatedChanges.push(chg);
      }
    }

    return {
      validatedChanges,
      itemsForHumanReview,
      autoAppliedChanges,
    };
  }

  private static getImpactDescription(risk: RiskLevel, type: string): string {
    if (risk === 'P0_LEGAL_CRITICAL') {
      return 'ALTO IMPACTO JURÍDICO: Afeta validade de teses, contagem de prazos ou competência de julgamento.';
    }
    if (risk === 'P1_OPERATIONAL_HIGH') {
      return 'IMPACTO OPERACIONAL: Pode impedir o envio de petições pelo condutor devido a link ou canal desatualizado.';
    }
    return 'MANUTENÇÃO: Atualização cadastral e de dados complementares.';
  }
}
