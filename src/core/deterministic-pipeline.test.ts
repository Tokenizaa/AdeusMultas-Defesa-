/**
 * @file deterministic-pipeline.test.ts
 * Testes de Integridade E2E e Validação da Arquitetura Jurídica Determinística
 */

import { describe, it, expect } from 'vitest';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { runControlledPipeline, registerRefinementProvider } from '../../src/core/ai/ai-orchestrator';
import { InfractionData } from '../../src/types';

describe('Arquitetura Jurídica Determinística — Pipeline E2E', () => {
  const applicantWatermark = {
    name: 'Netto Teste 84721',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    cnh: '98765432100',
    category: 'AB',
    address: 'Av. Paulista, 1000, Bela Vista',
    cityState: 'São Paulo/SP',
  };

  it('deve avaliar deterministricamente a decadência do Art. 281 CTB (>30 dias)', () => {
    const infraction: InfractionData = {
      aitNumber: 'AIT-DEC-9988',
      dateTime: '2026-01-01',
      notificationExpeditionDate: '2026-02-15', // 45 dias depois
      location: 'Av. das Américas, 500',
      autuadorBody: 'DETRAN-RJ',
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, I do CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    const analysis = ExpertRuleEngine.evaluate('case-dec-01', infraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-048')).toBe(true);
    expect(analysis.overallSuccessRate).toBeGreaterThanOrEqual(95);
  });

  it('deve avaliar deterministricamente radar com aferição vencida (>12 meses)', () => {
    const infraction: InfractionData = {
      aitNumber: 'AIT-RAD-1234',
      dateTime: '2026-08-01',
      inmetroAferitionDate: '2025-06-01', // >12 meses antes do fato
      speedLimit: 60,
      speedMeasured: 78,
      speedConsidered: 71,
      radarEquipmentId: 'RAD-999',
      location: 'Marginal Pinheiros, km 12',
      autuadorBody: 'CET-SP',
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, I do CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    const analysis = ExpertRuleEngine.evaluate('case-rad-01', infraction);
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-001')).toBe(true);
  });

  it('deve montar a minuta determinística com marca d\'água do requerente sem alucinações', () => {
    const infraction: InfractionData = {
      aitNumber: 'AIT-RAD-1234',
      dateTime: '2026-08-01',
      inmetroAferitionDate: '2025-06-01',
      speedLimit: 60,
      speedMeasured: 78,
      speedConsidered: 71,
      radarEquipmentId: 'RAD-999',
      location: 'Marginal Pinheiros, km 12',
      autuadorBody: 'CET-SP',
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, I do CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    const analysis = ExpertRuleEngine.evaluate('case-rad-01', infraction);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-rad-01',
      procedureType: 'defesa_previa',
      infraction,
      vehicle: {
        plate: 'XYZ-9988',
        model: 'Honda Civic',
      },
      applicant: applicantWatermark,
      analysis,
    });

    expect(draft.fullDraftText).toContain('Netto Teste 84721');
    expect(draft.fullDraftText).toContain('123.456.789-00');
    expect(draft.fullDraftText).toContain('XYZ-9988');
    expect(draft.fullDraftText).toContain('AIT-RAD-1234');
    expect(draft.fullDraftText).toContain('Art. 218, I do CTB');
    expect(draft.validation.isValid).toBe(true);
  });

  it('deve aplicar runControlledPipeline e rejeitar texto corrompido que exclua dados obrigatórios', async () => {
    const infraction: InfractionData = {
      aitNumber: 'AIT-RAD-1234',
      dateTime: '2026-08-01',
      inmetroAferitionDate: '2025-06-01',
      location: 'Marginal Pinheiros',
      autuadorBody: 'CET-SP',
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, I do CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    const analysis = ExpertRuleEngine.evaluate('case-rad-01', infraction);

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-rad-01',
      procedureType: 'defesa_previa',
      infraction,
      vehicle: {
        plate: 'XYZ-9988',
        model: 'Honda Civic',
      },
      applicant: applicantWatermark,
      analysis,
    });

    // Simula uma IA rebelde que tenta apagar o AIT ou o requerente
    registerRefinementProvider({
      refineProse: async () => {
        return 'Texto genérico inventado pela IA sem AIT e sem requerente.';
      },
    });

    const pipelineResult = await runControlledPipeline({
      analysis,
      draft,
    });

    // Como o validador de integridade rejeitou, o pipeline deve manter a minuta determinística original
    expect(pipelineResult.aiUses).toBe('deterministic');
    expect(pipelineResult.controlled.reason).toBe('REFINED_REJECTED');
    expect(pipelineResult.draft.fullDraftText).toContain('Netto Teste 84721');
    expect(pipelineResult.draft.fullDraftText).toContain('AIT-RAD-1234');
  });
});
