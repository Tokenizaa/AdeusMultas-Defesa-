import { describe, it, expect } from 'vitest';
import {
  NATIONAL_STATES_DB,
  NATIONAL_ORGANS_DB,
  NATIONAL_CETRANS_DB,
  getAllNationalStates,
  getAllNationalOrgans,
  getAllNationalCetrans,
  getNationalStateByUf,
  getNationalOrganById,
  getNationalOrganByAbbreviation,
  resolveNationalProtocol,
} from '../../../src/core/knowledge/national-registry';

describe('National Canonical Registry (27 UFs + Federal)', () => {
  it('must contain all 27 Brazilian Federative Units (26 States + 1 DF)', () => {
    const states = getAllNationalStates();
    expect(states.length).toBe(27);

    const expectedUFs = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    for (const uf of expectedUFs) {
      const state = getNationalStateByUf(uf);
      expect(state).toBeDefined();
      expect(state?.uf).toBe(uf);
      expect(state?.name).toBeDefined();
      expect(state?.capital).toBeDefined();
      expect(state?.region).toBeDefined();
      expect(state?.detranId).toBe(`DETRAN_${uf}`);
      expect(state?.cetranId).toBe(uf === 'DF' ? 'CONTRANDIFE_DF' : `CETRAN_${uf}`);
      expect(state?.serviceNetworkName).toBeDefined();
    }
  });

  it('must contain all 27 State DETRANs with valid properties', () => {
    const organs = getAllNationalOrgans();
    expect(organs.length).toBeGreaterThanOrEqual(27);

    const expectedUFs = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    for (const uf of expectedUFs) {
      const detran = getNationalOrganById(`DETRAN_${uf}`);
      expect(detran).toBeDefined();
      expect(detran?.state).toBe(uf);
      expect(detran?.sphere).toBe('estadual');
      expect(detran?.onlinePortalUrl).toMatch(/^https?:\/\//);
      expect(detran?.physicalAddress).toBeDefined();
      expect(detran?.jariStructure).toBeDefined();
      expect(detran?.standardDeadlineDays).toBe(30);
      expect(detran?.validFrom).toBeDefined();
      expect(detran?.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('must contain all Federal and Municipal benchmark organs (PRF, DNIT, ANTT, CET-SP, DER-SP)', () => {
    const prf = getNationalOrganById('PRF_BRASIL');
    expect(prf).toBeDefined();
    expect(prf?.abbreviation).toBe('PRF');
    expect(prf?.sphere).toBe('federal');

    const dnit = getNationalOrganById('DNIT_FEDERAL');
    expect(dnit).toBeDefined();
    expect(dnit?.abbreviation).toBe('DNIT');

    const antt = getNationalOrganById('ANTT_FEDERAL');
    expect(antt).toBeDefined();
    expect(antt?.abbreviation).toBe('ANTT');

    const cetSp = getNationalOrganById('CET_SP');
    expect(cetSp).toBeDefined();
    expect(cetSp?.abbreviation).toBe('CET-SP / DSV');

    const derSp = getNationalOrganById('DER_SP');
    expect(derSp).toBeDefined();
  });

  it('must contain all 26 CETRANs and CONTRANDIFE (DF)', () => {
    const cetrans = getAllNationalCetrans();
    expect(cetrans.length).toBe(27);

    const contrandife = cetrans.find((c) => c.uf === 'DF');
    expect(contrandife).toBeDefined();
    expect(contrandife?.id).toBe('CONTRANDIFE_DF');
    expect(contrandife?.name).toContain('CONTRANDIFE');

    const cetranSp = cetrans.find((c) => c.uf === 'SP');
    expect(cetranSp?.name).toContain('São Paulo');
  });

  it('must resolve national protocol info by abbreviation or code', () => {
    const protoSp = resolveNationalProtocol('DETRAN-SP');
    expect(protoSp).not.toBeNull();
    expect(protoSp?.portalUrl).toContain('detran.sp.gov.br');
    expect(protoSp?.physicalAddress).toContain('São Paulo');

    const protoPrf = resolveNationalProtocol('PRF');
    expect(protoPrf).not.toBeNull();
    expect(protoPrf?.portalUrl).toContain('prf.gov.br');

    const protoMg = resolveNationalProtocol('DETRAN-MG');
    expect(protoMg).not.toBeNull();
    expect(protoMg?.portalUrl).toContain('detran.mg.gov.br');

    const protoBa = resolveNationalProtocol('DETRAN-BA');
    expect(protoBa).not.toBeNull();
    expect(protoBa?.portalUrl).toContain('detran.ba.gov.br');
  });
});
