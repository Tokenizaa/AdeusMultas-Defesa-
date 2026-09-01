/**
 * @file defesa_previa.spec.ts
 * Suíte E2E Determinística — DEFESA PRÉVIA (Art. 281 CTB)
 *
 * Valida a cadeia completa: Onboarding → Dados canônicos → Regra → Vício →
 * Tese → Bloco → Assembly → IntegrityValidator → Documento (sem IA).
 *
 * Executa contra os módulos canônicos puros (RuleEngine + DocumentAssemblyEngine
 * + IntegrityValidator + AIOrchestrator), sem dependência de banco/stack.
 */
import { test, expect } from '@playwright/test';
import { ExpertRuleEngine } from '../../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../../src/core/documents/document-assembly-engine';
import { validateAnalysis, validateDraft } from '../../../src/core/validation/integrity-validator';
import { runControlledPipeline, registerRefinementProvider } from '../../../src/core/ai/ai-orchestrator';
import { InfractionData, CaseAnalysis, DefenseDraft } from '../../../src/types';

const applicant = {
  name: 'Defesa Previa Teste 8841',
  cpf: '111.222.333-44',
  cnh: '11223344556',
  address: 'Rua das Autuações, 100',
  cityState: 'São Paulo/SP',
};

const infraction: InfractionData = {
  aitNumber: 'AIT-DEF-PREVIA-001',
  dateTime: '2026-02-10',
  notificationExpeditionDate: '2026-04-01', // > 30 dias → decadência
  location: 'Rod. Anhanguera, km 20',
  autuadorBody: 'DER-SP',
  infractionCode: '745-50',
  ctbArticle: 'Art. 218, I do CTB',
  severity: 'media',
  points: 4,
  fineAmount: 130.16,
};

test.describe('E2E Determinístico — Defesa Prévia', () => {
  test('pipeline completo: dados → regra → vício → tese → bloco → documento', async () => {
    registerRefinementProvider({}); // IA offline

    // 1. RuleEngine (dados canônicos → regras → vício)
    const analysis: CaseAnalysis = ExpertRuleEngine.evaluate('case-def-previa-001', infraction);

    // Regra de decadência detectada
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-048')).toBe(true);
    // Cadeia rastreável FACT→RULE→FLAW→ARGUMENT
    const flaw = analysis.detectedFlaws?.find((f) => f.argumentId === 'ARG-048');
    expect(flaw).toBeDefined();
    expect(flaw!.ruleId).toBe('RULE_DECADENCIA_30_DIAS');
    // Avaliação da regra registrada (árvore auditável)
    expect(analysis.evaluatedRules?.some((r) => r.ruleId === 'RULE_DECADENCIA_30_DIAS' && r.status === 'FAIL')).toBe(true);
    // Auditoria
    expect(analysis.engineVersion).toBeDefined();
    expect(analysis.selectedArguments).toContain('ARG-048');
    expect(analysis.integrityScore).toBeGreaterThanOrEqual(0);

    // 2. Validação da análise
    const analysisReport = validateAnalysis(analysis);
    expect(analysisReport.valid).toBe(true);

    // 3. DocumentAssemblyEngine (tese → bloco → documento)
    const draft: DefenseDraft & { validation?: unknown } = DocumentAssemblyEngine.assemble({
      caseId: 'case-def-previa-001',
      procedureType: 'defesa_previa',
      infraction,
      vehicle: { plate: 'ABC-7788', model: 'Civic' },
      applicant,
      analysis,
    });

    // Bloco de rol de documentos anexos presente
    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS QUE INSTRUEM A PRESENTE PEÇA');
    // Zero tags pendentes
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    // Identificação do AIT preservada
    expect(draft.fullDraftText).toContain('AIT-DEF-PREVIA-001');
    // Qualificação do requerente
    expect(draft.fullDraftText).toContain('Defesa Previa Teste 8841');
    expect(draft.validation?.isValid).toBe(true);

    // 4. IntegrityValidator
    const draftReport = validateDraft(draft);
    expect(draftReport.valid).toBe(true);

    // 5. IA offline → documento determinístico completo
    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
    expect(result.draft.fullDraftText).toContain('AIT-DEF-PREVIA-001');
    expect(result.draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
  });

  test('negativo: procedimento incompatível não gera minuta', async () => {
    const analysis = ExpertRuleEngine.evaluate('case-def-previa-neg', infraction);
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'case-def-previa-neg',
      procedureType: 'procedimento_inexistente' as any,
      infraction,
      vehicle: { plate: 'ABC-7788', model: 'Civic' },
      applicant,
      analysis,
    })).toThrow('Procedimento não suportado');
  });
});
