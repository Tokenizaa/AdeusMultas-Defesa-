import { describe, expect, it } from 'vitest';
import { ARGUMENTS_CATALOG } from '../../src/core/arguments/arguments-catalog';
import { permittedTheses } from '../../src/core/ai/ai-orchestrator';
import type { CaseAnalysis } from '../../src/types';

describe('FASE 3.3 — Analysis → Arguments integrity', () => {
  const baseAnalysis = (recommendedArguments: any[]): CaseAnalysis => ({
    id: 'anl-33',
    caseId: 'case-33',
    overallSuccessRate: 90,
    detectedInconsistencies: [],
    selectedArguments: recommendedArguments.map((argument) => argument.id),
    recommendedArguments,
    recommendedProcedure: 'recurso_jari',
    competentBody: 'DETRAN-SP',
    summaryReasoning: 'Teste de integridade.',
    createdAt: new Date().toISOString(),
    engineVersion: 'test',
    evaluatedRules: [],
    integrityScore: 100,
    dataGaps: [],
  });

  it('preserva somente argumentos cuja identidade existe no catálogo canônico', () => {
    const canonical = ARGUMENTS_CATALOG.find((argument) => argument.id === 'ARG-001');
    const result = permittedTheses(
      baseAnalysis([
        canonical,
        {
          ...canonical,
          id: 'ARG-FAKE',
          code: 'FAKE_ARGUMENT',
          title: 'Argumento inexistente',
        },
      ])
    );

    expect(result.map((argument) => argument.id)).toEqual(['ARG-001']);
  });

  it('não inventa argumento quando a análise não possui recomendações', () => {
    expect(permittedTheses(baseAnalysis([]))).toEqual([]);
  });

  it('não altera a ordem dos argumentos autorizados pela análise', () => {
    const arg1 = ARGUMENTS_CATALOG.find((argument) => argument.id === 'ARG-001');
    const arg2 = ARGUMENTS_CATALOG.find((argument) => argument.id === 'ARG-003');

    const result = permittedTheses(baseAnalysis([arg2, arg1]));

    expect(result.map((argument) => argument.id)).toEqual(['ARG-003', 'ARG-001']);
  });
});
