import { describe, expect, it } from 'vitest';
import { runCanonicalQualityGate } from './quality-gate';

function jurisdictionCheck(autuadorBody: string) {
  const report = runCanonicalQualityGate({
    infraction: { autuadorBody, infractionCode: '745-50', aitNumber: 'E2E_AIT' },
    analysis: { recommendedArguments: [], infractionClassification: { family: 'excesso_velocidade' } },
    draft: { procedureType: 'defesa_previa', selectedArgumentIds: [], fullDraftText: 'Minuta de teste' },
    applicant: {},
    vehicle: {},
    serviceType: 'defesa_previa',
  });
  return report.checks.find((item) => item.check === 'JURISDICAO');
}

describe('canonical quality gate jurisdiction', () => {
  it.each(['', 'Não informado', 'Nao informado', 'desconhecido', 'N/A'])(
    'blocks missing or placeholder traffic authority: %s',
    (autuadorBody) => {
      const result = jurisdictionCheck(autuadorBody);
      expect(result?.passed).toBe(false);
      expect(result?.severity).toBe('error');
      expect(result?.message).toContain('ausente ou não informado');
    },
  );

  it('accepts a named state traffic authority with matching jurisdiction', () => {
    const result = jurisdictionCheck('DETRAN-SP');
    expect(result?.passed).toBe(true);
  });
});
