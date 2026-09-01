/**
 * @file conversao_advertencia.spec.ts
 * Suíte E2E Determinística — CONVERSÃO EM ADVERTÊNCIA (Art. 267 CTB)
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
  name: 'Advertencia Teste 5512',
  cpf: '789.456.123-00',
  cnh: '78945612300',
  address: 'Rua do Benefício, 1',
  cityState: 'Salvador/BA',
};

// Infração leve com ficha limpa → conversão compulsória ARG-051
const infraction = {
  aitNumber: 'AIT-ADV-005',
  dateTime: '2026-04-20',
  location: 'Av. Oceânica, 300',
  autuadorBody: 'TRANSPRESV',
  infractionCode: '735-80',
  ctbArticle: 'Art. 210 do CTB',
  severity: 'leve',
  points: 3,
  fineAmount: 88.38,
  hasPreviousInfractionsLast12Months: false,
};

test.describe('E2E Determinístico — Conversão em Advertência', () => {
  test('pipeline completo para conversão de infração leve (ficha limpa)', async () => {
    registerRefinementProvider({});

    const analysis = ExpertRuleEngine.evaluate('case-adv-005', infraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-051')).toBe(true);
    expect(analysis.recommendedProcedure).toBe('conversao_advertencia');
    const flaw = analysis.detectedFlaws?.find((f) => f.argumentId === 'ARG-051');
    expect(flaw).toBeDefined();
    expect(flaw!.ruleId).toBe('RULE_CONVERSAO_ADVERTENCIA_267');
    expect(validateAnalysis(analysis).valid).toBe(true);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-adv-005',
      procedureType: 'conversao_advertencia',
      infraction,
      vehicle: { plate: 'BAX-7788', model: 'Celta' },
      applicant,
      analysis,
    });

    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(draft.validation?.isValid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);

    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
  });
});
