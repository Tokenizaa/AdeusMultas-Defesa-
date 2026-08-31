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

  // ===== Fase 4: composição dirigida pela análise estruturada =====

  it('should derive arguments ONLY from detected rule inconsistencies when analysis is present', () => {
    const analysis = {
      id: 'anl_x',
      caseId: 'case_123',
      overallSuccessRate: 88,
      detectedInconsistencies: [
        {
          title: 'Termo de sinais psicomotores ausente',
          description: 'Ausência do Anexo II da Res. 432/2013.',
          severity: 'alta' as const,
          legalArgumentId: 'ARG-025',
          impact: 'Anulação do AIT.',
        },
      ],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'x',
      createdAt: new Date().toISOString(),
    };
    const result = DocumentAssemblyEngine.assemble({
      ...validPayload,
      analysis: analysis as any,
    });
    expect(result.validation.appliedArgumentCount).toBe(2); // ARG-025 (detectado) + ARG-049 (garantia)
    expect(result.meritArgumentsText).toContain('SINAIS PSICOMOTORES');
    expect(result.preliminaryArgumentsText).toContain('DUPLA NOTIFICAÇÃO');
  });

  it('should flag procedure mismatch when analysis recommends a different procedure', () => {
    const analysis = {
      id: 'anl_y',
      caseId: 'case_123',
      overallSuccessRate: 94,
      detectedInconsistencies: [
        {
          title: 'Conversão em advertência',
          description: 'Infração leve sem reincidência.',
          severity: 'alta' as const,
          legalArgumentId: 'ARG-051',
          impact: 'Isenção.',
        },
      ],
      recommendedArguments: [],
      recommendedProcedure: 'conversao_advertencia' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'y',
      createdAt: new Date().toISOString(),
    };
    const result = DocumentAssemblyEngine.assemble({
      ...validPayload,
      procedureType: 'recurso_jari' as const,
      analysis: analysis as any,
    });
    expect(result.validation.procedureMismatch).toBe(true);
  });

  it('should not invent arguments when analysis detects no inconsistencies', () => {
    const analysis = {
      id: 'anl_z',
      caseId: 'case_123',
      overallSuccessRate: 35,
      detectedInconsistencies: [],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'z',
      createdAt: new Date().toISOString(),
    };
    const result = DocumentAssemblyEngine.assemble({
      ...validPayload,
      analysis: analysis as any,
    });
    // Sem inconsistências: apenas a garantia constitucional entra, nada inventado.
    expect(result.validation.appliedArgumentCount).toBe(1);
    expect(result.preliminaryArgumentsText).toContain('DUPLA NOTIFICAÇÃO');
  });

  // ===== Fase 8: evidências das teses detectadas entram no rol de documentos =====

  it('includes evidence of detected theses in the document roll (never invented)', () => {
    const analysis = {
      id: 'anl_r',
      caseId: 'case_123',
      overallSuccessRate: 92,
      detectedInconsistencies: [
        {
          title: 'Radar calibração vencida',
          description: 'Aferição metrológica superior a 12 meses.',
          severity: 'alta' as const,
          legalArgumentId: 'ARG-001',
          impact: 'Nulidade.',
        },
      ],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_cetran' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'r',
      createdAt: new Date().toISOString(),
    };
    const result = DocumentAssemblyEngine.assemble({
      ...validPayload,
      procedureType: 'recurso_cetran' as const,
      analysis: analysis as any,
    });
    // A evidência canônica de ARG-001 (certidão PSInmetro) deve constar no rol.
    expect(result.fullDraftText).toContain('PSInmetro');
    // Sem as teses, essa evidência não apareceria.
    const base = DocumentAssemblyEngine.assemble({ ...validPayload, procedureType: 'recurso_cetran' as const });
    expect(base.fullDraftText).not.toContain('PSInmetro');
  });

  it('never invents evidence for a foreign (non-canonical) thesis', () => {
    const analysis = {
      id: 'anl_f',
      caseId: 'case_123',
      overallSuccessRate: 50,
      detectedInconsistencies: [
        {
          title: 'Tese inexistente',
          description: 'Fora do catálogo.',
          severity: 'alta' as const,
          legalArgumentId: 'ARG-ZZZ',
          impact: 'x',
        },
      ],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'f',
      createdAt: new Date().toISOString(),
    };
    const result = DocumentAssemblyEngine.assemble({
      ...validPayload,
      procedureType: 'recurso_jari' as const,
      analysis: analysis as any,
    });
    // ARG-ZZZ não existe no catálogo: nenhuma evidência inventada é acrescida.
    expect(result.fullDraftText).not.toContain('Evidência da tese ARG-ZZZ');
  });
});