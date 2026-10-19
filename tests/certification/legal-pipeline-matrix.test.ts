/**
 * Greenfield legal-pipeline contract matrix.
 *
 * These tests are newly authored from the current domain types and canonical
 * rule/document engines. They do not import the retired E2E fixtures, executor,
 * validator, or test data. They intentionally exercise all current commercial
 * procedure types and validate analysis and document output independently.
 */
import { describe, expect, test } from 'vitest';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { validateAnalysis, validateDraft } from '../../src/core/validation/integrity-validator';
import type { InfractionData, ProcedureType } from '../../src/types';

const procedures: ProcedureType[] = [
  'defesa_previa',
  'recurso_jari',
  'recurso_cetran',
  'suspensao_cnh',
  'cassacao_cnh',
  'indicacao_condutor',
  'conversao_advertencia',
];

function makeInfraction(aitNumber: string): InfractionData {
  return {
    aitNumber,
    infractionCode: '745-50',
    description: 'Excesso de velocidade informado para certificação sintética',
    ctbArticle: 'Art. 218 do CTB',
    severity: 'media',
    points: 4,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2026-03-10T10:30:00-03:00',
    notificationExpeditionDate: '2026-03-18',
    defenseDeadline: '2026-04-20',
    location: 'Rodovia de teste, km 20, São Paulo/SP',
    formalFlawsDetected: [],
    hasPreviousInfractionsLast12Months: false,
    hasR19SignageProof: undefined,
  };
}

const applicant = {
  name: 'Pessoa Sintética de Certificação',
  cpf: '529.982.247-25',
  rg: '44.555.666-7',
  cnh: '12345678901',
  category: 'B',
  address: 'Rua Sintética, 100',
  cityState: 'São Paulo/SP',
};

const vehicle = {
  plate: 'E2E7ABC',
  model: 'Veículo Sintético',
  renavam: '12345678901',
};

describe('greenfield: contrato do motor jurídico e da montagem documental', () => {
  test.each(procedures)('%s: análise e minuta mantêm vínculo com o caso atual', (procedureType) => {
    const caseId = `cert-greenfield-${procedureType}`;
    const infraction = makeInfraction(`AIT-GREENFIELD-${procedureType.toUpperCase()}`);

    const analysis = ExpertRuleEngine.evaluate(caseId, infraction);
    expect(analysis.caseId).toBe(caseId);
    expect(analysis.engineVersion).toBeTruthy();

    const analysisValidation = validateAnalysis(analysis);
    expect(analysisValidation.valid, JSON.stringify(analysisValidation)).toBe(true);

    const processNumbers =
      procedureType === 'suspensao_cnh' || procedureType === 'processo_suspensao'
        ? { psddNumber: 'PSDD-SINTETICO-001', suspensionMonths: 6 }
        : procedureType === 'cassacao_cnh' || procedureType === 'processo_cassacao'
          ? { pcddNumber: 'PCDD-SINTETICO-001' }
          : undefined;

    const draft = DocumentAssemblyEngine.assemble({
      caseId,
      procedureType,
      infraction,
      vehicle,
      applicant,
      analysis,
      processNumbers,
      nominatedDriver: procedureType === 'indicacao_condutor'
        ? {
            name: 'Condutor Sintético Indicado',
            cpf: '111.444.777-35',
            cnh: '10987654321',
            category: 'B',
            uf: 'SP',
          }
        : undefined,
    });

    expect(draft.caseId).toBe(caseId);
    expect(draft.procedureType).toBe(procedureType);
    expect(draft.fullDraftText).toContain(infraction.aitNumber);
    expect(draft.fullDraftText).toContain(applicant.name);
    expect(draft.fullDraftText).toContain(vehicle.plate);
    expect(draft.fullDraftText).not.toMatch(/\{\{[^}]+\}\}/);
    expect(draft.validation.isValid, JSON.stringify(draft.validation)).toBe(true);

    const draftValidation = validateDraft(draft);
    expect(draftValidation.valid, JSON.stringify(draftValidation)).toBe(true);
  });

  test('procedimento inexistente é rejeitado pelo montador canônico', () => {
    const infraction = makeInfraction('AIT-GREENFIELD-INVALID-PROCEDURE');
    const analysis = ExpertRuleEngine.evaluate('cert-greenfield-invalid-procedure', infraction);

    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'cert-greenfield-invalid-procedure',
      procedureType: 'procedimento_inexistente' as ProcedureType,
      infraction,
      vehicle,
      applicant,
      analysis,
    })).toThrow();
  });
});
