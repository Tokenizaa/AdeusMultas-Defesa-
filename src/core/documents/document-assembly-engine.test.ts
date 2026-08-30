import { describe, it, expect } from 'vitest';
import { DocumentAssemblyEngine } from './document-assembly-engine';

describe('DocumentAssemblyEngine validation', () => {
  const validPayload = {
    caseId: 'case_123',
    procedureType: 'recurso_jari' as const,
    infraction: {
      aitNumber: 'AIT-123456',
      infractionCode: '745-50',
      description: 'Excesso de velocidade',
      ctbArticle: 'Art. 218, I do CTB',
      severity: 'media' as const,
      points: 4,
      fineAmount: 130.16,
      autuadorBody: 'DETRAN-SP',
      dateTime: '2026-01-15T10:30:00',
      location: 'Av. Paulista, 1000',
    },
    vehicle: {
      plate: 'ABC-1234',
      model: 'Honda Civic',
    },
    applicant: {
      name: 'João Silva',
      cpf: '123.456.789-00',
      cnh: '12345678900',
      address: 'Rua das Flores, 123',
      cityState: 'São Paulo/SP',
    },
  };

  it('should assemble successfully with all required fields', () => {
    const result = DocumentAssemblyEngine.assemble(validPayload);
    expect(result).toBeDefined();
    expect(result.id).toContain('dft_');
    expect(result.fullDraftText).toContain('DETRAN-SP');
    expect(result.fullDraftText).toContain('São Paulo/SP');
    expect(result.validation.isValid).toBe(true);
  });

  it('should throw Error when autuadorBody is missing', () => {
    const invalidPayload = {
      ...validPayload,
      infraction: { ...validPayload.infraction, autuadorBody: '' },
    };
    
    expect(() => DocumentAssemblyEngine.assemble(invalidPayload)).toThrow('autuadorBody obrigatório para geração da minuta');
  });

  it('should throw Error when autuadorBody is undefined', () => {
    const invalidPayload = {
      ...validPayload,
      infraction: { ...validPayload.infraction, autuadorBody: undefined as any },
    };
    
    expect(() => DocumentAssemblyEngine.assemble(invalidPayload)).toThrow('autuadorBody obrigatório para geração da minuta');
  });

  it('should throw Error when cityState is missing', () => {
    const invalidPayload = {
      ...validPayload,
      applicant: { ...validPayload.applicant, cityState: '' },
    };
    
    expect(() => DocumentAssemblyEngine.assemble(invalidPayload)).toThrow('cityState obrigatório para geração da minuta');
  });

  it('should throw Error when cityState is undefined', () => {
    const invalidPayload = {
      ...validPayload,
      applicant: { ...validPayload.applicant, cityState: undefined as any },
    };
    
    expect(() => DocumentAssemblyEngine.assemble(invalidPayload)).toThrow('cityState obrigatório para geração da minuta');
  });

  it('should not contain fallback values in output', () => {
    const result = DocumentAssemblyEngine.assemble({
      ...validPayload,
      applicant: { ...validPayload.applicant, cityState: 'Belo Horizonte/MG' },
      infraction: { ...validPayload.infraction, autuadorBody: 'DETRAN-MG' },
    });
    
    expect(result.fullDraftText).not.toContain('DETRAN / JARI');
    expect(result.fullDraftText).not.toContain('São Paulo/SP');
    expect(result.authorityAddressing).toContain('DETRAN-MG');
    expect(result.closingPlaceDate).toContain('Belo Horizonte/MG');
  });

  it('should correctly parse city and UF from cityState', () => {
    const payloads = [
      { cityState: 'Rio de Janeiro/RJ', expectedCity: 'Rio de Janeiro', expectedUf: 'RJ' },
      { cityState: 'Belo Horizonte/MG', expectedCity: 'Belo Horizonte', expectedUf: 'MG' },
      { cityState: 'Brasília/DF', expectedCity: 'Brasília', expectedUf: 'DF' },
      { cityState: 'Curitiba/PR', expectedCity: 'Curitiba', expectedUf: 'PR' },
    ];

    for (const { cityState, expectedCity, expectedUf } of payloads) {
      const result = DocumentAssemblyEngine.assemble({
        ...validPayload,
        applicant: { ...validPayload.applicant, cityState },
        infraction: { ...validPayload.infraction, autuadorBody: 'DETRAN-SP' },
      });
      
      expect(result.fullDraftText).toContain(expectedCity);
      expect(result.fullDraftText).toContain(expectedUf);
    }
  });

  it('should handle different autuador bodies correctly', () => {
    const autuadores = [
      'DETRAN-SP',
      'DETRAN-RJ',
      'PRF',
      'DNIT',
      'CET-SP / DSV',
      'DER-SP',
      'DETRAN-MG',
    ];

    for (const autuador of autuadores) {
      const result = DocumentAssemblyEngine.assemble({
        ...validPayload,
        infraction: { ...validPayload.infraction, autuadorBody: autuador },
      });
      
      expect(result.authorityAddressing).toContain(autuador.toUpperCase());
      expect(result.fullDraftText).toContain(autuador.toUpperCase());
    }
  });
});