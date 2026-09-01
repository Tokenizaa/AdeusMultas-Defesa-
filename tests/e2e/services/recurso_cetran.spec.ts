/**
 * @file recurso_cetran.spec.ts
 * Suíte E2E Determinística — RECURSO ESPECIAL AO CETRAN (2ª Instância Final)
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
  name: 'Cetran Teste 7742',
  cpf: '123.987.654-32',
  cnh: '12345678900',
  address: 'Rua do Conselho, 10',
  cityState: 'Curitiba/PR',
};

// Radar com aferição vencida (>12 meses) → vício ARG-001
const infraction = {
  aitNumber: 'AIT-CETRAN-003',
  dateTime: '2026-07-20',
  inmetroAferitionDate: '2025-01-15', // >12 meses
  speedLimit: 80,
  speedMeasured: 96,
  speedConsidered: 89,
  radarEquipmentId: 'RAD-777',
  location: 'BR-116, km 100',
  autuadorBody: 'PRF',
  infractionCode: '746-50',
  ctbArticle: 'Art. 218, II do CTB',
  severity: 'grave',
  points: 5,
  fineAmount: 195.23,
};

test.describe('E2E Determinístico — Recurso CETRAN', () => {
  test('pipeline completo para radar com aferição vencida', async () => {
    registerRefinementProvider({});

    const analysis = ExpertRuleEngine.evaluate('case-cetran-003', infraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-001')).toBe(true);
    const flaw = analysis.detectedFlaws?.find((f) => f.argumentId === 'ARG-001');
    expect(flaw).toBeDefined();
    expect(flaw!.ruleId).toBe('RULE_RADAR_CALIBRACAO_12M');
    expect(validateAnalysis(analysis).valid).toBe(true);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-cetran-003',
      procedureType: 'recurso_cetran',
      infraction,
      vehicle: { plate: 'PRX-3344', model: 'HRV' },
      applicant,
      analysis,
    });

    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    expect(draft.fullDraftText.match(/\{\{[^}]+\}\}/g)).toBeNull();
    expect(draft.validation?.isValid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);

    const result = await runControlledPipeline({ analysis, draft });
    expect(result.aiUses).toBe('deterministic');
    expect(result.draft.fullDraftText).toContain('AIT-CETRAN-003');
  });
});
