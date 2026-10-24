import { describe, expect, it } from 'vitest';
import { computeDefenseIntegrityHash, hasValidDefenseIntegrity } from './defense-integrity';

describe('Defense integrity — legado e verificação estrita', () => {
  const infraction = {
    aitNumber: 'AIT-123',
    infractionCode: '745-50',
    ctbArticle: 'Art. 218',
    dateTime: '2026-01-15T10:30:00Z',
    location: 'Av. Paulista, São Paulo/SP',
    measuredSpeed: 80,
    consideredSpeed: 75,
    speedLimit: 60,
    radarEquipmentId: 'RDR-001',
    inmetroAferitionDate: '2025-06-01',
  };

  const analysis = {
    id: 'analysis-1',
    recommendedProcedure: 'recurso_jari',
    recommendedArguments: [{ id: 'ARG-01' }],
  };

  const draftWithHash = {
    fullDraftText: 'Minuta de defesa...',
    selectedArgumentIds: ['ARG-01'],
    procedureType: 'recurso_jari',
    integrityHash: 'legacy-hash-placeholder',
  };

  const draftWithoutHash = {
    fullDraftText: 'Minuta de defesa legacy...',
    selectedArgumentIds: ['ARG-01'],
    procedureType: 'recurso_jari',
  };

  it('defesa legacy sem integrityHash é liberada (não bloqueia casos existentes)', async () => {
    const valid = await hasValidDefenseIntegrity(
      draftWithoutHash as any,
      analysis,
      infraction,
    );
    expect(valid).toBe(true);
  });

  it('defesa com integrityHash incorreto é rejeitada (adulteração)', async () => {
    const valid = await hasValidDefenseIntegrity(
      draftWithHash as any,
      analysis,
      infraction,
    );
    expect(valid).toBe(false);
  });

  it('defesa com integrityHash correspondente é aceita', async () => {
    const hash = await computeDefenseIntegrityHash(draftWithoutHash, analysis, infraction);
    const valid = await hasValidDefenseIntegrity(
      { ...draftWithoutHash, integrityHash: hash } as any,
      analysis,
      infraction,
    );
    expect(valid).toBe(true);
  });

  it('computeDefenseIntegrityHash é determinístico para o mesmo conteúdo', async () => {
    const h1 = await computeDefenseIntegrityHash(draftWithoutHash, analysis, infraction);
    const h2 = await computeDefenseIntegrityHash(draftWithoutHash, analysis, infraction);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('qualquer alteração nos fatos da autuação invalida o hash', async () => {
    const hash = await computeDefenseIntegrityHash(draftWithoutHash, analysis, infraction);
    const tampered = { ...infraction, location: 'Outro local' };
    const valid = await hasValidDefenseIntegrity(
      { ...draftWithoutHash, integrityHash: hash } as any,
      analysis,
      tampered,
    );
    expect(valid).toBe(false);
  });
});
