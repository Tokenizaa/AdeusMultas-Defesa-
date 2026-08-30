/**
 * protocol-coverage.test.ts
 *
 * Suíte de Auditoria de Protocolos e Portais nas 27 UFs.
 * Valida que:
 *  1. `resolveProtocolInfo()` resolve corretamente apenas órgãos cadastrados.
 *  2. Para 24 UFs não cadastradas em `ORGANS_DB`, retorna exatamente `null`.
 *  3. NUNCA retorna URL inventada ou fallback para `DETRAN-SP`.
 */

import { describe, it, expect } from 'vitest';
import { resolveProtocolInfo, ORGANS_DB } from '../../src/core/legal-base/organs';

const ALL_27_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const REGISTERED_ESTADUAL_UFS = new Set(['SP', 'RJ', 'MG']);

describe('protocol-coverage: auditoria de resolução de protocolo', () => {
  it('órgãos estaduais cadastrados resolvem instruções com portais oficiais válidos', () => {
    for (const uf of REGISTERED_ESTADUAL_UFS) {
      const info = resolveProtocolInfo(`DETRAN-${uf}`);
      expect(info).not.toBeNull();
      expect(info!.portalUrl).toBeDefined();
      expect(info!.portalUrl).toMatch(new RegExp(`detran\\.${uf.toLowerCase()}\\.gov\\.br`));
      expect(info!.physicalAddress).toBeDefined();
      expect(info!.competentBody).toBeDefined();
      expect(info!.deadlineDate).toBeDefined();
    }
  });

  it('órgãos federais resolvem para portais federais legítimos do gov.br', () => {
    const prfInfo = resolveProtocolInfo('PRF');
    expect(prfInfo).not.toBeNull();
    expect(prfInfo!.portalUrl).toContain('prf.gov.br');

    const dnitInfo = resolveProtocolInfo('DNIT');
    expect(dnitInfo).not.toBeNull();
    expect(dnitInfo!.portalUrl).toContain('dnit.gov.br');
  });

  it('24 UFs não cadastradas retornam null de forma honesta (sem fallback para SP)', () => {
    for (const uf of ALL_27_UFS) {
      if (!REGISTERED_ESTADUAL_UFS.has(uf)) {
        const info = resolveProtocolInfo(`DETRAN-${uf}`);
        // Deve ser rigorosamente null
        expect(info, `DETRAN-${uf} não deve ter protocolo resolvido até cadastro formal`).toBeNull();
      }
    }
  });

  it('órgãos de outros estados nunca recebem endereço ou portal de São Paulo', () => {
    const spOrgan = ORGANS_DB.find((o) => o.abbreviation === 'DETRAN-SP');
    expect(spOrgan).toBeDefined();

    for (const uf of ALL_27_UFS) {
      if (uf !== 'SP') {
        const info = resolveProtocolInfo(`DETRAN-${uf}`);
        if (info) {
          expect(info.portalUrl).not.toEqual(spOrgan!.onlinePortalUrl);
          expect(info.physicalAddress).not.toEqual(spOrgan!.physicalAddress);
        }
      }
    }
  });
});
