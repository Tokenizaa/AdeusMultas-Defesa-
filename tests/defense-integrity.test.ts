import { describe, expect, it } from 'vitest';
import {
  computeDefenseIntegrityHash,
  hasValidDefenseIntegrity,
} from '../cloudflare/defense-integrity';

describe('defense document integrity', () => {
  const analysis = {
    id: 'analysis-run-1',
    recommendedProcedure: 'recurso_jari',
    recommendedArguments: [{ id: 'ARG-001' }],
  };
  const infraction = {
    aitNumber: 'AIT-123',
    infractionCode: '745-50',
    dateTime: '2026-09-01T10:00:00Z',
  };
  const draft = {
    fullDraftText: 'Petição gerada em 01/09/2026. Fatos do caso: AIT-123.',
    factsNarrative: 'AIT-123, infração 745-50.',
    selectedArgumentIds: ['ARG-001'],
    procedureType: 'recurso_jari',
  };

  it('produces the same hash for the same final artifact', async () => {
    const first = await computeDefenseIntegrityHash(draft, analysis, infraction);
    const second = await computeDefenseIntegrityHash({ ...draft }, { ...analysis, id: 'new-run-id' }, infraction);
    expect(second).toBe(first);
  });

  it('invalidates integrity when the final document text changes', async () => {
    const integrityHash = await computeDefenseIntegrityHash(draft, analysis, infraction);
    expect(await hasValidDefenseIntegrity({ ...draft, integrityHash }, analysis, infraction)).toBe(true);
    expect(
      await hasValidDefenseIntegrity(
        { ...draft, fullDraftText: draft.fullDraftText.replace('AIT-123', 'AIT-999'), integrityHash },
        analysis,
        infraction,
      ),
    ).toBe(false);
  });

  it('changes the artifact hash when generated text, including its date, changes', async () => {
    const first = await computeDefenseIntegrityHash(draft, analysis, infraction);
    const next = await computeDefenseIntegrityHash(
      { ...draft, fullDraftText: 'Petição gerada em 02/09/2026. Fatos do caso: AIT-123.' },
      analysis,
      infraction,
    );
    expect(next).not.toBe(first);
  });
});
