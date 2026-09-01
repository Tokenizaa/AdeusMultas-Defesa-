/**
 * @file lei_seca.spec.ts
 * Suíte E2E Determinística — LEI SECA (Art. 165/165-A CTB)
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
  name: 'Lei Seca Teste 6631',
  cpf: '456.123.789-01',
  cnh: '45612378900',
  address: 'Av. Brasil, 2000',
  cityState: 'Porto Alegre/RS',
};

// Lei Seca sem termo de constatação de sinais → vício ARG-025
const infraction = {
  aitNumber: 'AIT-LEISECA-004',
  dateTime: '2026-06-11',
  location: 'Av. Ipiranga, 500',
  autuadorBody: 'DETRAN-RS',
  infractionCode: '516-91',
  ctbArticle: 'Art. 165-A do CTB',
  severity: 'gravissima',
  points: 7,
  fineAmount: 2934.70,
  hasPsychomotorTerm: false,
  refusedTest: true,
};

test.describe('E2E Determinístico — Lei Seca', () => {
  test('pipeline completo para autuação de recusa ao bafômetro', async () => {
    registerRefinementProvider({});

    const analysis = ExpertRuleEngine.evaluate('case-leiseca-004', infraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-025')).toBe(true);
    const flaw = analysis.detectedFlaws?.find((f) => f.argumentId === 'ARG-025');
    expect(flaw).toBeDefined();
    expect(flaw!.ruleId).toBe('RULE_LEI_SECA_TERMO_432');
    expect(validateAnalysis(analysis).valid).toBe(true);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-leiseca-004',
      procedureType: 'suspensao_cnh',
      infraction,
      vehicle: { plate: 'RSX-5566', model: 'Onix' },
      applicant,
      analysis,
    });

    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(draft.validation?.isValid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);

    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
    expect(result.draft.fullDraftText).toContain('AIT-LEISECA-004');
  });

  test('negativo: dados obrigatórios ausentes → DATA_GAP, sem vício presumido', async () => {
    // failsafe: sem info sobre o termo → DATA_GAP, não pode concluir ARG-025
    const gapInfraction = { ...infraction, hasPsychomotorTerm: undefined };
    const analysis = ExpertRuleEngine.evaluate('case-leiseca-dg', gapInfraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-025')).toBe(false);
    expect(analysis.dataGaps?.some((g) => g.ruleId === 'RULE_LEI_SECA_TERMO_432')).toBe(true);
  });
});
