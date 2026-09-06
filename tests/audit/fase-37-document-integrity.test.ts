import { describe, expect, it } from 'vitest';
import {
  computeDefenseIntegrityHash,
  hasValidDefenseIntegrity,
} from '../../src/core/documents/defense-integrity';

describe('Fase 3.7 — integridade do artefato de defesa', () => {
  const analysis = {
    id: 'analysis-1',
    recommendedProcedure: 'recurso_jari',
    recommendedArguments: [{ id: 'ARG-001' }, { id: 'ARG-003' }],
  };

  const draft = {
    fullDraftText: 'MINUTA CANÔNICA ARG-001 ARG-003',
    selectedArgumentIds: ['ARG-001', 'ARG-003'],
    procedureType: 'recurso_jari',
  };

  it('produz fingerprint determinístico', () => {
    expect(computeDefenseIntegrityHash(draft, analysis)).toBe(
      computeDefenseIntegrityHash({ ...draft }, { ...analysis })
    );
  });

  it('aceita artefato intacto', () => {
    const integrityHash = computeDefenseIntegrityHash(draft, analysis);
    expect(hasValidDefenseIntegrity({ ...draft, integrityHash }, analysis)).toBe(true);
  });

  it('detecta adulteração do fullDraftText', () => {
    const integrityHash = computeDefenseIntegrityHash(draft, analysis);
    expect(
      hasValidDefenseIntegrity(
        { ...draft, fullDraftText: 'DOCUMENTO ADULTERADO', integrityHash },
        analysis
      )
    ).toBe(false);
  });

  it('detecta injeção de tese em selectedArgumentIds', () => {
    const integrityHash = computeDefenseIntegrityHash(draft, analysis);
    expect(
      hasValidDefenseIntegrity(
        { ...draft, selectedArgumentIds: ['ARG-001', 'ARG-025'], integrityHash },
        analysis
      )
    ).toBe(false);
  });

  it('detecta alteração do procedimento canônico', () => {
    const integrityHash = computeDefenseIntegrityHash(draft, analysis);
    expect(
      hasValidDefenseIntegrity(
        { ...draft, integrityHash },
        { ...analysis, recommendedProcedure: 'suspensao_cnh' }
      )
    ).toBe(false);
  });

  it('falha fechado quando o artefato não possui fingerprint', () => {
    expect(hasValidDefenseIntegrity(draft, analysis)).toBe(false);
  });
});
