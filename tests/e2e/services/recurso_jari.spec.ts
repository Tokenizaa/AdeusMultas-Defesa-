/**
 * @file recurso_jari.spec.ts
 * Suíte E2E Determinística — RECURSO ORDINÁRIO À JARI (Art. 285 CTB)
 *
 * Valida a cadeia completa: Onboarding → Dados → Regra → Vício → Tese → Bloco →
 * Assembly → IntegrityValidator → Documento (sem IA).
 */
import { test, expect } from '@playwright/test';
import { ExpertRuleEngine } from '../../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../../src/core/documents/document-assembly-engine';
import { validateAnalysis, validateDraft } from '../../../src/core/validation/integrity-validator';
import { runControlledPipeline, registerRefinementProvider } from '../../../src/core/ai/ai-orchestrator';

const applicant = {
  name: 'Jari Teste 9921',
  cpf: '999.888.777-66',
  cnh: '99887766554',
  address: 'Av. dos Recursos, 500',
  cityState: 'Belo Horizonte/MG',
};

// Teste positivo de alcoolemia (Art. 165) com termo presente: não presumir vício de recusa
const infraction = {
  aitNumber: 'AIT-JARI-002',
  dateTime: '2026-03-05',
  location: 'Av. Contorno, 1000',
  autuadorBody: 'DETRAN-MG',
  infractionCode: '516-91',
  ctbArticle: 'Art. 165 do CTB',
  severity: 'gravissima',
  points: 0,
  fineAmount: 2934.70,
  hasPsychomotorTerm: true,
  refusedTest: false,
};

test.describe('E2E Determinístico — Recurso JARI', () => {
  test('pipeline completo para alcoolemia com teste positivo', async () => {
    registerRefinementProvider({});

    const analysis = ExpertRuleEngine.evaluate('case-jari-002', infraction);
    // A regra de termo só se aplica a recusa classificada sob Art. 165.
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-025')).toBe(false);
    expect(validateAnalysis(analysis).valid).toBe(true);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-jari-002',
      procedureType: 'recurso_jari',
      infraction,
      vehicle: { plate: 'MGX-1122', model: 'Gol' },
      applicant,
      analysis,
    });

    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(draft.validation?.isValid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);

    // IA offline
    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
    expect(result.draft.fullDraftText).toContain('AIT-JARI-002');
  });
});
