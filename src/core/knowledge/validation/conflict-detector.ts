/**
 * @file conflict-detector.ts
 * Detector de Conflitos e Inconsistências entre Múltiplas Fontes Oficiais.
 */

import { KnowledgeChange } from '../types';

export class ConflictDetector {
  /**
   * Analisa um conjunto de alterações e marca as que apresentarem contradições ou divergências.
   */
  public static detectConflicts(changes: KnowledgeChange[]): KnowledgeChange[] {
    const organMap = new Map<string, KnowledgeChange[]>();

    for (const chg of changes) {
      if (chg.organId) {
        const list = organMap.get(chg.organId) || [];
        list.push(chg);
        organMap.set(chg.organId, list);
      }
    }

    return changes.map((chg) => {
      if (!chg.organId) return chg;

      const organChanges = organMap.get(chg.organId) || [];
      if (organChanges.length > 1) {
        // Verifica se há tipos de mudança conflitantes
        const hasMultipleDifferentChanges = organChanges.some(
          (other) => other.id !== chg.id && other.changeType !== chg.changeType
        );

        if (hasMultipleDifferentChanges) {
          return {
            ...chg,
            isConflicting: true,
            conflictNotes: `Detectadas múltiplas alterações concorrentes para o órgão ${chg.organId} (${organChanges.length} eventos). Requer resolução humana.`,
          };
        }
      }

      return chg;
    });
  }
}
