import { describe, it, expect } from 'vitest';
import { resolveProtocolInfo, ORGANS_DB } from './organs';

describe('resolveProtocolInfo', () => {
  it('should return protocol info for DETRAN-SP', () => {
    const result = resolveProtocolInfo('DETRAN-SP');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('JARI Central do DETRAN-SP e JARI descentralizadas nas Ciretrans');
    expect(result!.portalUrl).toBe('https://www.detran.sp.gov.br/servicos/recursos');
    expect(result!.physicalAddress).toBe('Rua Boa Vista, 209 - Centro, São Paulo/SP - CEP 01014-001');
    expect(result!.recommendedMethod).toBe('portal_online');
    expect(result!.instructionsText).toContain('https://www.detran.sp.gov.br/servicos/recursos');
    expect(result!.instructionsText).toContain('Rua Boa Vista, 209');
    expect(result!.deadlineDate).toBeDefined();
  });

  it('should return protocol info for DETRAN-RJ', () => {
    const result = resolveProtocolInfo('DETRAN-RJ');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('Comissões de Julgamento da JARI DETRAN-RJ');
    expect(result!.portalUrl).toBe('https://www.detran.rj.gov.br/protocolo-defesas');
    expect(result!.physicalAddress).toBe('Av. Presidente Vargas, 817 - Centro, Rio de Janeiro/RJ - CEP 20071-004');
  });

  it('should return protocol info for PRF', () => {
    const result = resolveProtocolInfo('PRF');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('JARI Nacional e Regionais da PRF nas Superintendências Estaduais');
    expect(result!.portalUrl).toBe('https://sistemas.prf.gov.br/portal/recursos');
  });

  it('should return protocol info for CET-SP', () => {
    const result = resolveProtocolInfo('CET-SP / DSV');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('Juntas Administrativas da Secretaria Municipal de Mobilidade de SP');
  });

  it('should return protocol info for DER-SP', () => {
    const result = resolveProtocolInfo('DER-SP');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('Colegiados JARI DER-SP');
  });

  it('should return protocol info for DNIT', () => {
    const result = resolveProtocolInfo('DNIT');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('JARI Especial do DNIT em Brasília/DF');
  });

  it('should return protocol info for DETRAN-MG', () => {
    const result = resolveProtocolInfo('DETRAN-MG');
    expect(result).not.toBeNull();
    expect(result!.competentBody).toBe('Colegiados JARI DETRAN-MG');
  });

  it('should return null for unknown abbreviation', () => {
    const result = resolveProtocolInfo('ORGAO_INEXISTENTE');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = resolveProtocolInfo('');
    expect(result).toBeNull();
  });

  it('deadlineDate should be a valid future date in pt-BR format', () => {
    const result = resolveProtocolInfo('DETRAN-SP');
    expect(result).not.toBeNull();
    
    const deadlineParts = result!.deadlineDate!.split('/');
    expect(deadlineParts).toHaveLength(3);
    
    const day = parseInt(deadlineParts[0], 10);
    const month = parseInt(deadlineParts[1], 10);
    const year = parseInt(deadlineParts[2], 10);
    
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(year).toBeGreaterThanOrEqual(new Date().getFullYear());
  });
});

describe('ORGANS_DB integrity', () => {
  it('should have unique abbreviations', () => {
    const abbreviations = ORGANS_DB.map(o => o.abbreviation);
    const unique = new Set(abbreviations);
    expect(unique.size).toBe(abbreviations.length);
  });

  it('each organ should have required fields', () => {
    for (const organ of ORGANS_DB) {
      expect(organ.id).toBeDefined();
      expect(organ.abbreviation).toBeDefined();
      expect(organ.name).toBeDefined();
      expect(organ.onlinePortalUrl).toBeDefined();
      expect(organ.physicalAddress).toBeDefined();
      expect(organ.jariStructure).toBeDefined();
      expect(organ.standardDeadlineDays).toBeGreaterThan(0);
    }
  });

  it('should contain SP and RJ organs for isolation testing', () => {
    const spOrgans = ORGANS_DB.filter(o => o.state === 'SP');
    const rjOrgans = ORGANS_DB.filter(o => o.state === 'RJ');
    
    expect(spOrgans.length).toBeGreaterThan(0);
    expect(rjOrgans.length).toBeGreaterThan(0);
    
    const detranSp = spOrgans.find(o => o.abbreviation === 'DETRAN-SP');
    const detranRj = rjOrgans.find(o => o.abbreviation === 'DETRAN-RJ');
    
    expect(detranSp).toBeDefined();
    expect(detranRj).toBeDefined();
  });
});