import { describe, it, expect } from 'vitest';
import { validateAnalysis, validateDraft } from './integrity-validator';
import { ExpertRuleEngine } from '../rules/rule-engine';

function baseAnalysis() {
  return {
    id: 'anl_1',
    caseId: 'case_x',
    overallSuccessRate: 88,
    detectedInconsistencies: [
      {
        title: 'Termo ausente',
        description: 'Sem termo.',
        severity: 'alta' as const,
        legalArgumentId: 'ARG-025',
        impact: 'Anulação.',
      },
    ],
    recommendedArguments: [],
    recommendedProcedure: 'recurso_jari' as const,
    competentBody: 'DETRAN-SP',
    summaryReasoning: 'x',
    createdAt: new Date().toISOString(),
  };
}

describe('IntegrityValidator — Fase 5', () => {
  it('validateAnalysis flags foreign argument as KNOWLEDGE_GAP error', () => {
    const analysis = {
      ...baseAnalysis(),
      detectedInconsistencies: [
        { ...baseAnalysis().detectedInconsistencies[0], legalArgumentId: 'ARG-XXX' },
      ],
    };
    const report = validateAnalysis(analysis as any);
    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.code === 'ARGUMENT_FOREIGN');
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('KNOWLEDGE_GAP');
  });

  it('validateAnalysis flags argument without any legal base (neither inline nor canonical)', () => {
    const analysis = {
      ...baseAnalysis(),
      detectedInconsistencies: [
        { ...baseAnalysis().detectedInconsistencies[0], legalArgumentId: 'ARG-XXX' },
      ],
      recommendedArguments: [
        {
          id: 'ARG-XXX',
          title: 'Tese inventada',
          legalBase: undefined,
        } as any,
      ],
    };
    const report = validateAnalysis(analysis as any);
    // Tese estrangeira e sem base legal verificável => gaps de conhecimento.
    const foreign = report.issues.some((i) => i.code === 'ARGUMENT_FOREIGN');
    expect(foreign).toBe(true);
    expect(report.valid).toBe(false);
  });

  it('validateAnalysis flags inconsistency whose thesis is not recommended (draft would lack foundation)', () => {
    const analysis = baseAnalysis();
    const report = validateAnalysis(analysis as any);
    const issue = report.issues.find((i) => i.code === 'ARGUMENT_NOT_RECOMMENDED');
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('INCONSISTENCY');
  });

  it('validateAnalysis accepts a coherent analysis produced by the engine', () => {
    const infraction: any = {
      aitNumber: 'AIT-99',
      infractionCode: '516-91',
      description: 'Lei seca',
      ctbArticle: 'Art. 165 CTB',
      severity: 'gravissima',
      points: 7,
      fineAmount: 2934.7,
      autuadorBody: 'DETRAN-SP',
      dateTime: '2026-01-15T10:30:00',
      hasPsychomotorTerm: false,
    };
    const analysis = ExpertRuleEngine.evaluate('case_x', infraction);
    const report = validateAnalysis(analysis as any);
    // ARG-025 e ARG-049 são canônicos e estão recomendados => zero erros.
    expect(report.valid).toBe(true);
  });

  it('validateDraft flags empty draft as error without silently fixing it', () => {
    const draft: any = {
      id: 'dft_1',
      caseId: 'case_x',
      procedureType: 'recurso_jari',
      fullDraftText: '',
    };
    const report = validateDraft(draft);
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.code === 'EMPTY_DRAFT')).toBe(true);
  });

  it('validateDraft never mutates the draft (validator has no write access semantics)', () => {
    const draft: any = {
      id: 'dft_1',
      caseId: 'case_x',
      procedureType: 'recurso_jari',
      fullDraftText: 'Conteúdo legítimo da minuta.',
    };
    const snapshot = JSON.stringify(draft);
    validateDraft(draft);
    expect(JSON.stringify(draft)).toBe(snapshot);
  });
});
