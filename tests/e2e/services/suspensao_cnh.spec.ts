/**
 * @file suspensao_cnh.spec.ts
 * Suíte E2E Determinística — SUSPENSÃO DA CNH / PSDD
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
  name: 'Suspensao Teste 3313',
  cpf: '654.987.321-00',
  cnh: '65498732100',
  address: 'Rua da Suspensão, 8',
  cityState: 'Recife/PE',
};

// Lei Seca mandatória autossuspensiva
const infraction = {
  aitNumber: 'AIT-SUSP-007',
  dateTime: '2026-08-09',
  location: 'Av. Agamenon, 300',
  autuadorBody: 'DETRAN-PE',
  infractionCode: '516-91',
  ctbArticle: 'Art. 165-A do CTB',
  severity: 'gravissima',
  points: 7,
  fineAmount: 2934.70,
  hasPsychomotorTerm: false,
};

test.describe('E2E Determinístico — Suspensão da CNH', () => {
  test('pipeline completo para PSDD (Lei Seca)', async () => {
    registerRefinementProvider({});

    const analysis = ExpertRuleEngine.evaluate('case-susp-007', infraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-025')).toBe(true);
    expect(validateAnalysis(analysis).valid).toBe(true);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-susp-007',
      procedureType: 'suspensao_cnh',
      infraction,
      vehicle: { plate: 'PEX-2233', model: 'HB20' },
      applicant,
      analysis,
      processNumbers: { psddNumber: 'PSDD-2026-004455', suspensionMonths: 12 },
    });

    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(draft.validation?.isValid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);

    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
  });
});
