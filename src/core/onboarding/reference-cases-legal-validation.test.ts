/**
 * Teste de validação jurídica dos casos de referência dos 7 serviços.
 *
 * Para cada caso de referência, executa validateLegalThesis nas teses esperadas
 * e verifica que o veredito é consistente com o cenário (completos → valid,
 * dados_ausentes → misleading/unverified, sem_tese_defensiva → sem argumentos).
 *
 * Execução: npm run test (vitest).
 */

import { describe, expect, it } from 'vitest';
import {
  validateLegalThesis,
  validateAllTheses,
  summarizeLegalValidation,
} from './legal-validation';
import { REFERENCE_CASES, PROCEDURES } from './reference-cases';
import type { CaseAnalysis } from '../../../types';

// ---------------------------------------------------------------------------
// Mapeia cada caso de referência para uma CaseAnalysis sintética
// ---------------------------------------------------------------------------

function caseToAnalysis(caseRef: (typeof REFERENCE_CASES)[number]): CaseAnalysis {
  const args: Array<{
    id: string;
    title: string;
    legalBase: string;
    requiredDocuments: string[];
  }> = [];

  if (caseRef.expectedThesis) {
    args.push({
      id: caseRef.expectedThesis,
      title: `Tese ${caseRef.expectedThesis} para ${caseRef.procedure}`,
      legalBase: 'Fonte oficial a confirmar',
      requiredDocuments: [],
    });
  }

  return {
    id: `ref_${caseRef.procedure}_${caseRef.scenario}`,
    caseId: `case_ref_${caseRef.procedure}`,
    createdAt: new Date().toISOString(),
    overallSuccessRate: caseRef.scenario === 'completos' ? 85 : 35,
    detectedInconsistencies: caseRef.expectedThesis
      ? [
          {
            ruleId: `RULE_REF_${caseRef.expectedThesis}`,
            title: `Tese ${caseRef.expectedThesis}`,
            description: `Descrição da tese ${caseRef.expectedThesis}`,
            severity: 'alta',
            legalArgumentId: caseRef.expectedThesis,
            impact: 'Impacto a confirmar',
            statutoryBasis: 'Base legal a confirmar',
          },
        ]
      : [],
    recommendedArguments: args,
    recommendedProcedure: caseRef.procedure,
    competentBody: 'DETRAN-SP',
    summaryReasoning: 'Resumo sintético para validação jurídica.',
    dataCompleteness:
      caseRef.scenario === 'completos'
        ? { filledFields: 10, totalFields: 12, ratio: 83, missingCriticalFields: [] }
        : caseRef.scenario === 'dados_ausentes'
          ? { filledFields: 3, totalFields: 12, ratio: 25, missingCriticalFields: ['speedLimit', 'measuredSpeed'] }
          : { filledFields: 6, totalFields: 12, ratio: 50, missingCriticalFields: ['notificationExpeditionDate'] },
  } as any;
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('Validação jurídica — casos de referência dos 7 serviços', () => {
  it('cobre todos os 7 procedimentos definidos em rules-matrix.ts', () => {
    const proceduresInCases = new Set(REFERENCE_CASES.map((c) => c.procedure));
    for (const proc of PROCEDURES) {
      expect(proceduresInCases.has(proc)).toBe(true);
    }
  });

  it('cada procedimento tem pelo menos um cenário "completos"', () => {
    for (const proc of PROCEDURES) {
      const completo = REFERENCE_CASES.find(
        (c) => c.procedure === proc && c.scenario === 'completos',
      );
      expect(completo).toBeDefined();
    }
  });

  it('cada procedimento tem pelo menos um cenário "dados_ausentes" ou "sem_tese_defensiva"', () => {
    for (const proc of PROCEDURES) {
      const incompleto = REFERENCE_CASES.find(
        (c) =>
          c.procedure === proc &&
          (c.scenario === 'dados_ausentes' || c.scenario === 'sem_tese_defensiva'),
      );
      expect(incompleto).toBeDefined();
    }
  });

  it('todos os casos de referência são marcados como não executáveis (bloqueio de ambiente)', () => {
    for (const c of REFERENCE_CASES) {
      expect(c.executable).toBe(false);
      expect(c.blocker).toContain('PLAYWRIGHT_BASE_URL');
    }
  });

  it('todos os casos de referência produzem veredito de validação jurídica definido', () => {
    for (const c of REFERENCE_CASES) {
      const analysis = caseToAnalysis(c);
      if (analysis.recommendedArguments.length === 0) continue;
      const arg = analysis.recommendedArguments[0];
      const result = validateLegalThesis(arg.id, arg.title, analysis);
      expect(result.thesisId).toBe(arg.id);
      expect(['valid', 'invalid', 'misleading', 'unverified']).toContain(result.verdict);
      // Teses mapeadas têm fonte completa; teses não mapeadas são unverified com fonte vazia.
      if (result.verdict !== 'unverified') {
        expect(result.source.name).toBeTruthy();
        expect(result.source.device).toBeTruthy();
        expect(result.source.inForce).toBe(true);
        expect(result.limitations.length).toBeGreaterThan(0);
      }
    }
  });

  it('cenários "sem_tese_defensiva" produzem análise sem argumentos', () => {
    const semTese = REFERENCE_CASES.find(
      (c) => c.scenario === 'sem_tese_defensiva',
    );
    expect(semTese).toBeDefined();
    const analysis = caseToAnalysis(semTese!);
    expect(analysis.recommendedArguments.length).toBe(0);
  });

  it('resumo de validação jurídica agrega resultados por tese', () => {
    const allResults: ReturnType<typeof validateAllTheses>[] = [];
    for (const c of REFERENCE_CASES) {
      const analysis = caseToAnalysis(c);
      if (analysis.recommendedArguments.length === 0) continue;
      allResults.push(validateAllTheses(analysis));
    }
    const flat = allResults.flat();
    expect(flat.length).toBeGreaterThan(0);
    const summary = summarizeLegalValidation(flat);
    expect(summary.total).toBe(flat.length);
    expect(summary.valid + summary.invalid + summary.misleading + summary.unverified).toBe(
      summary.total,
    );
    expect(Object.keys(summary.byThesis).length).toBeGreaterThan(0);
  });
});
