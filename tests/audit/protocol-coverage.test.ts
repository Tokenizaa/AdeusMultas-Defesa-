/**
 * protocol-coverage.test.ts
 *
 * Suíte de Verificação de Protocolos e Portais nas 27 UFs.
 * Valida que:
 *  1. Todas as 27 UFs (26 Estados + DF) resolvem para seus respectivos portais oficiais autênticos.
 *  2. Órgãos federais resolvem para portais federais legítimos do gov.br.
 *  3. NUNCA ocorre vazamento ou fallback indevido para DETRAN-SP.
 *  4. Órgãos inexistentes retornam rigorosamente null.
 */

import { describe, it, expect } from 'vitest';
import { resolveProtocolInfo, ORGANS_DB } from '../../src/core/legal-base/organs';

const ALL_27_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

describe('protocol-coverage: verificação de resolução de protocolo nacional', () => {
  it('todas as 27 UFs resolvem instruções com portais oficiais válidos', () => {
    for (const uf of ALL_27_UFS) {
      const info = resolveProtocolInfo(`DETRAN-${uf}`);
      expect(info, `DETRAN-${uf} deve resolver protocolo oficial`).not.toBeNull();
      expect(info!.portalUrl).toBeDefined();
      expect(info!.portalUrl).toMatch(new RegExp(`detran\\.${uf.toLowerCase()}\\.gov\\.br|detran\\.df\\.gov\\.br`));
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

  it('órgãos inexistentes retornam null de forma estrita', () => {
    const info = resolveProtocolInfo('ORGAO_INEXISTENTE_XYZ');
    expect(info).toBeNull();
  });

  it('órgãos de outros estados nunca recebem endereço ou portal de São Paulo', () => {
    for (const uf of ALL_27_UFS) {
      if (uf !== 'SP') {
        const info = resolveProtocolInfo(`DETRAN-${uf}`);
        expect(info).not.toBeNull();
        expect(info!.portalUrl).not.toContain('detran.sp.gov.br');
        expect(info!.physicalAddress).not.toContain('Rua Boa Vista, 209');
      }
    }
  });
});
