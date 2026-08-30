/**
 * @file impact-classifier.ts
 * Classificador de Impacto e Risco para Alterações Detectadas.
 */

import { KnowledgeChange, RiskLevel } from '../types';

export class ImpactClassifier {
  /**
   * Avalia uma alteração e refina a sua classificação de risco.
   */
  public static classify(change: KnowledgeChange): RiskLevel {
    // 1. Mudanças de Tipo P0 são inegociáveis
    if (
      change.changeType === 'REVOCATION' ||
      change.changeType === 'NEW_REGULATION' ||
      change.changeType === 'DEADLINE_CHANGE' ||
      change.changeType === 'COMPETENCE_CHANGE'
    ) {
      return 'P0_LEGAL_CRITICAL';
    }

    // 2. Mudanças de URL ou interrupção de serviço são P1
    if (
      change.changeType === 'PORTAL_URL_CHANGE' ||
      change.changeType === 'SERVICE_OUTAGE' ||
      change.changeType === 'DOCUMENT_REQUIREMENT_CHANGE'
    ) {
      return 'P1_OPERATIONAL_HIGH';
    }

    // 3. Mudanças de endereço ou dados de contato são P2
    if (change.changeType === 'ADDRESS_CHANGE') {
      return 'P2_MAINTENANCE';
    }

    return 'P3_INFO';
  }
}
