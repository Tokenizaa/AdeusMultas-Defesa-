/**
 * @file indicacao_condutor.spec.ts
 * Suíte E2E Determinística — INDICAÇÃO DE CONDUTOR (Art. 257 §7º/§8º CTB)
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
  name: 'Indicacao Teste 4402',
  cpf: '321.654.987-00',
  cnh: '32165498700',
  address: 'Av. das Empresas, 50',
  cityState: 'Goiânia/GO',
};

const nominatedDriver = {
  name: 'Real Condutor Teste',
  cpf: '111.222.333-44',
  cnh: '11122233344',
};

// Radnum NIC PJ — empresa indicou condutor (sem reincidência assumida)
const infraction = {
  aitNumber: 'AIT-IND-006',
  dateTime: '2026-05-01',
  location: 'Av. Anhanguera, 700',
  autuadorBody: 'DETRAN-GO',
  infractionCode: '502-91',
  ctbArticle: 'Art. 218, I do CTB',
  severity: 'gravissima',
  points: 7,
  fineAmount: 880.41,
};

test.describe('E2E Determinístico — Indicação de Condutor', () => {
  test('pipeline completo para FARI com condutor indicado', async () => {
    registerRefinementProvider({});

    const analysis = ExpertRuleEngine.evaluate('case-ind-006', infraction);
    expect(validateAnalysis(analysis).valid).toBe(true);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-ind-006',
      procedureType: 'indicacao_condutor',
      infraction,
      vehicle: { plate: 'GOX-9900', model: 'S10' },
      applicant,
      nominatedDriver,
      analysis,
    });

    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(draft.validation?.isValid).toBe(true);
    expect(draft.fullDraftText).toContain('Real Condutor Teste');
    expect(validateDraft(draft).valid).toBe(true);

    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
  });
});
