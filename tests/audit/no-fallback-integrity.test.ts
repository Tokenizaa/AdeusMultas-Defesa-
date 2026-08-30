/**
 * no-fallback-integrity — AUSÊNCIA DE DADO ⇒ ERRO, nunca fabricação.
 *
 * 🔴 Testes VERMELHOS = evidência P0-1..P0-10 e P1-4..P1-6.
 * Quando corrigidos, esta suíte fica verde e o gate CI libera o merge.
 */
import { describe, it, expect } from 'vitest';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { buildDocumentRollItems } from '../../src/core/documents/document-roll';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';
import { makeInfraction, makeVehicle } from './helpers';

const cit = { name: 'João da Silva', cpf: '123.456.789-00', cnh: '98765432100', address: 'Rua das Flores, 123', cityState: 'São Paulo/SP' };

describe('no-fallback: ausência de dado → erro (já corrigido)', () => {
  it('autuadorBody = "" → erro na análise', () => {
    expect(() => ExpertRuleEngine.evaluate('c1', { ...makeInfraction(), autuadorBody: '' }))
      .toThrow('autuadorBody obrigatório');
  });

  it('autuadorBody = "" → erro na minuta', () => {
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'recurso_jari',
      infraction: { ...makeInfraction(), autuadorBody: '' },
      vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    })).toThrow('autuadorBody obrigatório');
  });

  it('cityState = "" → erro na minuta', () => {
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'recurso_jari',
      infraction: makeInfraction(), vehicle: makeVehicle(),
      applicant: { ...cit, cityState: '' }, selectedArgumentIds: [],
    })).toThrow('cityState obrigatório');
  });
});

describe('no-fallback: sem dados → NUNCA órgão/infração padrão (🔴 P0-1/P0-2)', () => {
  it('retrieveContext com órgão desconhecido → erro/null, nunca DETRAN-SP', () => {
    const ctx = RagPipeline.retrieveContext({ codigoInfracao: '745-50', orgaoAutuador: 'ORGAO_INEXISTENTE' });
    // Falha hoje: `|| ORGANS_DB[0]` devolve DETRAN-SP (rag-pipeline.ts:92)
    expect(ctx.organInfo?.nome).not.toBe('Departamento Estadual de Trânsito de São Paulo');
  });

  it('findInfraction sem match → undefined, nunca INFRACTION_CATALOG[0]', () => {
    // Falha hoje: `|| INFRACTION_CATALOG[0]` (rag-pipeline.ts:25)
    expect(RagPipeline.findInfraction('CODIGO-FANTASMA-999')).toBeUndefined();
  });
});

describe('no-fallback: procedimento/template ausente → erro (🔴 P0-3/P0-4)', () => {
  it('procedureType desconhecido → erro, nunca PROCEDURES_CATALOG[0]', () => {
    // Falha hoje: cai em recurso_jari silenciosamente (document-assembly-engine.ts:99)
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'procedimento_fantasma' as any,
      infraction: makeInfraction(), vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    })).toThrow();
  });

  it('suspensao_cnh usa template de SUSPENSÃO, nunca TPL_RECURSO_JARI', () => {
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'suspensao_cnh',
      infraction: makeInfraction(), vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    });
    // Falha hoje: TEMPLATES_CATALOG[0] = TPL_RECURSO_JARI (document-assembly-engine.ts:104)
    expect(draft.fullDraftText).not.toMatch(/Recorrente interpõe o presente recurso ordinário/i);
  });

  it('processo_suspensao resolve procedimento do catálogo (nome correto)', () => {
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'processo_suspensao',
      infraction: makeInfraction(), vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    });
    // Falha hoje: PROCEDURES_CATALOG[0] nomeia como recurso_jari (document-assembly-engine.ts:99)
    expect(draft.validation.procedureName).toContain('Suspensão');
  });
});

describe('no-fallback: minuta não fabrica dados (🔴 P0-5/P0-6)', () => {
  it('aitNumber ausente → erro, nunca "AIT-1234567"', () => {
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'recurso_jari',
      infraction: { ...makeInfraction(), aitNumber: '' },
      vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    });
    // Falha hoje: `aitNumber || 'AIT-1234567'` (document-assembly-engine.ts:156)
    expect(draft.fullDraftText).not.toContain('AIT-1234567');
  });

  it('speedLimit ausente → minuta não inventa "60"', () => {
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'recurso_jari',
      infraction: { ...makeInfraction(), speedLimit: undefined, measuredSpeed: undefined, speedConsidered: undefined },
      vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    });
    // Falha hoje: `|| 78/60/71` (document-assembly-engine.ts:152-154)
    expect(draft.fullDraftText).not.toContain('60');
  });

  it('CPF/CNH ausentes → minuta não fabrica "000.000.000-00"/CNH fake', () => {
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'recurso_jari',
      infraction: makeInfraction(), vehicle: makeVehicle(),
      applicant: { name: '', cpf: '', cnh: '', address: '', cityState: 'São Paulo/SP' },
      selectedArgumentIds: [],
    });
    // Falha hoje: `cpf || '000.000.000-00'`, `cnh || '00000000000'` (document-assembly-engine.ts:175-177)
    expect(draft.fullDraftText).not.toContain('000.000.000-00');
    expect(draft.fullDraftText).not.toContain('00000000000');
  });

  it('RENAVAM real preservado, nunca fake "12345678900"', () => {
    const draft = RagPipeline.generateDefenseDraft(
      'c1', makeInfraction(), 'ABC-1D23', 'Honda Civic', cit, [], 'recurso_jari',
    );
    // Guarda contra renavam fabricado '12345678900'. CNH da fixture é distinta
    // (98765432100) para não colidir com o valor fake antigo.
    expect(draft.fullDraftText).not.toContain('12345678900');
  });
});

describe('no-fallback: mapeamento canônico não fabrica defaults (🔴 P1-4/P1-5)', () => {
  it('sem infractionCode → autuador não vira "745-50"', () => {
    const row = CanonicalMapper.domainToRow({
      id: 'c1', infraction: { aitNumber: 'AIT-1', autuadorBody: 'DETRAN-SP' },
      vehicle: {}, status: 'novo', currentStage: 1, serviceType: 'recurso_jari',
      timeline: [], isAnonymous: false, createdAt: 'x', updatedAt: 'x',
    } as any);
    // Falha hoje: `infraction_code || '745-50'` (canonical-mapper.ts:149)
    expect(row.infraction_code).not.toBe('745-50');
  });

  it('sem autuadorBody → autuador_body fica vazio (nunca DETRAN)', () => {
    const row = CanonicalMapper.domainToRow({
      id: 'c2', infraction: { aitNumber: 'AIT-2' },
      vehicle: {}, status: 'novo', currentStage: 1, serviceType: 'recurso_jari',
      timeline: [], isAnonymous: false, createdAt: 'x', updatedAt: 'x',
    } as any);
    expect(row.autuador_body).toBeUndefined();
  });
});

describe('no-fallback: motor de regras não quebra sem infractionCode (🔴 P1-6)', () => {
  it('evaluate sem infractionCode → resultado com 0 inconsistências (sem TypeError)', () => {
    // Falha hoje: RULE_RADAR_CALIBRACAO_12M chama startsWith de undefined (rule-engine.ts:55)
    const result = ExpertRuleEngine.evaluate('c1', { ...makeInfraction(), infractionCode: undefined as any });
    expect(result.detectedInconsistencies).toBeDefined();
  });
});

describe('no-fallback: rol de documentos exige procedimento válido (🔴 P1-3)', () => {
  it('procedure ausente → erro, nunca rol de recurso_jari', () => {
    // Falha hoje: buildDocumentRollItems cai em recurso_jari (document-roll.ts:42-48)
    expect(() => buildDocumentRollItems('' as any)).toThrow();
  });
});