/**
 * @file temporal-engine.ts
 * Motor Canônico de Temporalidade e Versionamento Jurídico-Operacional.
 * Garante que fatos geradores em determinada data sejam analisados estritamente
 * sob as normas e competências vigentes na data do fato.
 */

import {
  KnowledgeOrgan,
  KnowledgeCetran,
  KnowledgeState,
  TemporalQueryContext,
  EffectiveKnowledgeResult,
} from './types';
import {
  NATIONAL_ORGANS_DB,
  NATIONAL_CETRANS_DB,
  NATIONAL_STATES_DB,
  getNationalOrganByAbbreviation,
} from './national-registry';

export class TemporalKnowledgeEngine {
  /**
   * Resolve o conhecimento efetivo (Órgão, CETRAN, Prazos, Competências) para um determinado contexto temporal.
   */
  public static getEffectiveKnowledge(ctx: TemporalQueryContext): EffectiveKnowledgeResult {
    const targetDate = ctx.infractionDate || ctx.notificationDate || new Date().toISOString().split('T')[0];
    const isHistoric = targetDate < '2026-01-01';

    let matchedOrgan: KnowledgeOrgan | null = null;
    let state: KnowledgeState | null = null;
    let cetran: KnowledgeCetran | null = null;

    if (ctx.autuadorBody || ctx.organCode) {
      const candidateKey = ctx.autuadorBody || ctx.organCode || '';
      matchedOrgan = this.findOrganValidAtDate(candidateKey, targetDate);
    }

    if (!matchedOrgan && ctx.uf) {
      const ufUpper = ctx.uf.toUpperCase().trim();
      state = NATIONAL_STATES_DB[ufUpper] || null;
      matchedOrgan = this.findOrganByStateValidAtDate(ufUpper, targetDate);
    } else if (matchedOrgan && matchedOrgan.state && matchedOrgan.state !== 'FEDERAL') {
      state = NATIONAL_STATES_DB[matchedOrgan.state] || null;
    }

    const stateUf = state?.uf || matchedOrgan?.state;
    if (stateUf && stateUf !== 'FEDERAL') {
      cetran = this.findCetranValidAtDate(stateUf, targetDate);
    }

    const standardDeadlineDays = matchedOrgan?.standardDeadlineDays || 30;

    return {
      organ: matchedOrgan,
      cetran,
      state,
      isHistoricRule: isHistoric,
      effectiveDateUsed: targetDate,
      standardDeadlineDays,
      protocolUrl: matchedOrgan?.onlinePortalUrl || null,
      physicalAddress: matchedOrgan?.physicalAddress || null,
      competentBody: matchedOrgan?.jariStructure || null,
    };
  }

  /**
   * Encontra órgão válido na data informada.
   */
  public static findOrganValidAtDate(organIdentifier: string, dateIso: string): KnowledgeOrgan | null {
    const organ = getNationalOrganByAbbreviation(organIdentifier);
    if (!organ) return null;

    if (this.isDateWithinRange(dateIso, organ.validFrom, organ.validUntil)) {
      return organ;
    }

    // Busca versão histórica se houver múltiplas versões
    const historicalMatch = NATIONAL_ORGANS_DB.find(
      (o) =>
        (o.abbreviation.toUpperCase() === organIdentifier.toUpperCase() ||
          o.code === organIdentifier ||
          o.id === organIdentifier) &&
        this.isDateWithinRange(dateIso, o.validFrom, o.validUntil)
    );

    return historicalMatch || organ; // fallback para versão atual se não encontrar versão exata
  }

  /**
   * Encontra órgão estadual válido na data informada.
   */
  public static findOrganByStateValidAtDate(uf: string, dateIso: string): KnowledgeOrgan | null {
    const organ = NATIONAL_ORGANS_DB.find(
      (o) => o.state === uf && o.sphere === 'estadual' && this.isDateWithinRange(dateIso, o.validFrom, o.validUntil)
    );
    return organ || null;
  }

  /**
   * Encontra CETRAN válido na data informada.
   */
  public static findCetranValidAtDate(uf: string, dateIso: string): KnowledgeCetran | null {
    const cetran = NATIONAL_CETRANS_DB.find(
      (c) => c.uf === uf && this.isDateWithinRange(dateIso, c.validFrom, c.validUntil)
    );
    return cetran || null;
  }

  /**
   * Verifica se a data está no intervalo [validFrom, validUntil].
   */
  public static isDateWithinRange(dateIso: string, validFrom: string, validUntil?: string | null): boolean {
    if (!dateIso) return true;
    const target = dateIso.split('T')[0];
    const from = validFrom.split('T')[0];

    if (target < from) return false;
    if (validUntil) {
      const until = validUntil.split('T')[0];
      if (target > until) return false;
    }
    return true;
  }
}
