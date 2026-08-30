/**
 * defesa-previa-vs-recurso — fase inicial (Notificação de Autuação, Art. 281)
 * é DEFESA, não RECURSO. Documento na fase NA não pode ser intitulado
 * "Recurso Ordinário" (🔴 confluência reconhecida na rules-matrix.ts:104-113).
 */
import { describe, it, expect } from 'vitest';
import { USER_PROCESS_STAGES, USER_SITUATIONS } from '../../src/core/onboarding/rules-matrix';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { makeInfraction, makeVehicle, makeApplicant } from './helpers';

const cit = { name: 'João da Silva', cpf: '123.456.789-00', cnh: '12345678900', address: 'Rua das Flores, 123', cityState: 'São Paulo/SP' };

describe('defesa-previa-vs-recurso: mapeamento de estágios', () => {
  it('estágios existem conforme rules-matrix (fonte única)', () => {
    const ids = USER_PROCESS_STAGES.map((s) => s.id);
    expect(ids).toContain('primeira_notificacao');
    expect(ids).toContain('notificacao_penalidade');
    expect(ids).toContain('recurso_jari_negado');
  });

  it('primeira_notificacao NÃO pode ser mapeada como recurso (🔴)', () => {
    const stage = USER_PROCESS_STAGES.find((s) => s.id === 'primeira_notificacao')!;
    // Falha hoje: mappedProcedure = 'recurso_jari' (rules-matrix.ts:106)
    expect(stage.mappedProcedure).not.toBe('recurso_jari');
  });

  it('notificacao_penalidade (NIP) → recurso_jari é correto', () => {
    const stage = USER_PROCESS_STAGES.find((s) => s.id === 'notificacao_penalidade')!;
    expect(stage.mappedProcedure).toBe('recurso_jari');
  });

  it('recurso_jari_negado → recurso_cetran é correto', () => {
    const stage = USER_PROCESS_STAGES.find((s) => s.id === 'recurso_jari_negado')!;
    expect(stage.mappedProcedure).toBe('recurso_cetran');
  });

  it('conversao_advertencia mantém tipo próprio', () => {
    const stage = USER_PROCESS_STAGES.find((s) => s.id === 'conversao_advertencia')!;
    expect(stage.mappedProcedure).toBe('conversao_advertencia');
  });
});

describe('defesa-previa-vs-recurso: peça na fase NA não é "Recurso" (🔴)', () => {
  it('peça p/ primeira_notificacao não contém epígrafe "Recurso Ordinário"', () => {
    // 'primeira_notificacao' (NA) mapeia para 'defesa_previa' (Art. 281 CTB).
    // O template TPL_DEFESA_PREVIA inicia como "DEFESA PRÉVIA", não como recurso.
    // DIVERGÊNCIA DE AUDITORIA corrigida: o teste anterior assemblava 'recurso_jari'
    // (que LEGALMENTE DEVE conter a epígrafe de Recurso Ordinário) e exigia sua
    // ausência — contradição intrínseca. A fase NA corresponde a defesa_previa.
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'c1', procedureType: 'defesa_previa',
      infraction: makeInfraction(), vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    });
    expect(draft.fullDraftText).not.toMatch(/Recorrente interpõe o presente recurso ordinário/i);
    expect(draft.fullDraftText).toMatch(/DEFESA PRÉVIA/i);
  });
});

describe('defesa-previa-vs-recurso: situações de onboarding coerentes', () => {
  it('toda situação mapeia p/ procedimento válido', () => {
    const valid = new Set(['recurso_jari', 'recurso_cetran', 'conversao_advertencia', 'indicacao_condutor', 'suspensao_cnh', 'cassacao_cnh']);
    for (const s of USER_SITUATIONS) {
      expect(valid.has(s.mappedProcedure), `situação ${s.id} → ${s.mappedProcedure}`).toBe(true);
    }
  });

  it('indicação de condutor não vira recurso', () => {
    const s = USER_SITUATIONS.find((x) => x.id === 'indicacao_condutor')!;
    expect(s.mappedProcedure).toBe('indicacao_condutor');
  });
});